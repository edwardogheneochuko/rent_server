// Create, read, update and delete rental listings.

const { Listing, Property, Agent, Landlord } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { queryString, queryNumber, startsWithRegex, findState } = require('../utils/query');
const { findProfileForUser, findOrCreateProfile } = require('../utils/profiles');

// What to fill in when sending a listing. Landlord phone numbers stay
// private; agent phone numbers are public because tenants need to call them.
const LISTING_POPULATE = [
  {
    path: 'propertyId',
    populate: { path: 'landlordId', select: 'name verified averageRating reviewCount' },
  },
  { path: 'agentId', select: 'name phone verified averageRating reviewCount' },
];

const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  cheapest: { totalMoveInCost: 1, _id: 1 },
  priciest: { totalMoveInCost: -1, _id: -1 },
};

const FEE_FIELDS = ['rent', 'agentFee', 'legalFee', 'caution', 'serviceCharge'];
const EDITABLE_PROPERTY_FIELDS = ['address', 'area', 'lga', 'state', 'type', 'amenities', 'photos', 'coordinates'];

// ---- Helpers ----------------------------------------------------------------

// Only the person who created a listing, or an admin, may change it
function assertCanModify(listing, user) {
  const isOwner = listing.createdBy.equals(user._id);
  if (!isOwner && user.role !== 'admin') {
    throw ApiError.forbidden('Only the owner of this listing or an admin can change it');
  }
}

// Copy only the allowed keys from `source` (ignores anything else sent)
function pick(source = {}, keys) {
  return keys.reduce((result, key) => {
    if (source[key] !== undefined) result[key] = source[key];
    return result;
  }, {});
}

// Coordinates arrive as { lng, lat } from the frontend and are stored as GeoJSON
function toGeoPoint(coords) {
  if (!coords) return undefined;
  return { type: 'Point', coordinates: [Number(coords.lng), Number(coords.lat)] };
}

/**
 * Which agent profile does a new listing belong to?
 *  - An agent creating a listing is always the listing's agent.
 *  - Others can pass an existing agentId, or { agent: { name, phone } } to
 *    find-or-create an unclaimed profile. No agent at all is fine too.
 */
async function resolveAgentId(body, user) {
  if (user.role === 'agent') {
    const profile = await findProfileForUser(user);
    return profile?._id;
  }
  if (body.agentId) {
    const agent = await Agent.findById(body.agentId);
    if (!agent) throw ApiError.notFound('Agent not found');
    return agent._id;
  }
  if (body.agent?.name) {
    const agent = await findOrCreateProfile(Agent, body.agent);
    return agent._id;
  }
  return undefined;
}

/** Same idea for the landlord of a NEW property. */
async function resolveLandlordId(body, user) {
  if (user.role === 'landlord') {
    const profile = await findProfileForUser(user);
    return profile?._id;
  }
  if (body.landlordId) {
    const landlord = await Landlord.findById(body.landlordId);
    if (!landlord) throw ApiError.notFound('Landlord not found');
    return landlord._id;
  }
  if (body.landlord?.name) {
    const landlord = await findOrCreateProfile(Landlord, body.landlord);
    return landlord._id;
  }
  return undefined;
}

// ---- Controllers ------------------------------------------------------------

/**
 * GET /api/listings
 * Query: area, state, type, minRent, maxRent, status (available|taken|all),
 *        sort (newest|cheapest|priciest), page, limit
 */
async function getListings(req, res) {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  // Status: show available listings unless asked otherwise
  const status = queryString(req.query.status) || 'available';
  if (status !== 'all') filter.status = status;

  // Budget filter on the yearly rent
  const minRent = queryNumber(req.query.minRent);
  const maxRent = queryNumber(req.query.maxRent);
  if (minRent !== undefined || maxRent !== undefined) {
    filter.rent = {};
    if (minRent !== undefined) filter.rent.$gte = minRent;
    if (maxRent !== undefined) filter.rent.$lte = maxRent;
  }

  // Area, state and type live on the Property, so first find the matching
  // property ids, then only return listings for those properties.
  const propertyFilter = {};
  const area = queryString(req.query.area);
  const state = findState(queryString(req.query.state));
  const type = queryString(req.query.type);
  if (area) propertyFilter.area = startsWithRegex(area);
  if (state) propertyFilter.state = state;
  if (type) propertyFilter.type = type;

  if (Object.keys(propertyFilter).length > 0) {
    const propertyIds = await Property.find(propertyFilter).distinct('_id');
    filter.propertyId = { $in: propertyIds };
  }

  const sort = SORT_OPTIONS[queryString(req.query.sort)] || SORT_OPTIONS.newest;

  const [total, listings] = await Promise.all([
    Listing.countDocuments(filter),
    Listing.find(filter).sort(sort).skip(skip).limit(limit).populate(LISTING_POPULATE),
  ]);

  res.json({
    success: true,
    data: { items: listings, pagination: paginationMeta(total, page, limit) },
  });
}

/**
 * GET /api/listings/mine
 * Listings created by the signed-in user (any status), for the dashboard.
 */
async function getMyListings(req, res) {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { createdBy: req.user._id };

  const [total, listings] = await Promise.all([
    Listing.countDocuments(filter),
    Listing.find(filter).sort(SORT_OPTIONS.newest).skip(skip).limit(limit).populate(LISTING_POPULATE),
  ]);

  res.json({
    success: true,
    data: { items: listings, pagination: paginationMeta(total, page, limit) },
  });
}

/** GET /api/listings/:id */
async function getListing(req, res) {
  const listing = await Listing.findById(req.params.id).populate(LISTING_POPULATE);
  if (!listing) throw ApiError.notFound('Listing not found');
  res.json({ success: true, data: { listing } });
}

/**
 * POST /api/listings   (landlord, agent or admin)
 * Body: either propertyId (existing property) OR property { address, area,
 * lga, state, type, amenities, coordinates: { lng, lat } }, plus the fees
 * and optionally agentId / agent { name, phone } / landlordId / landlord { name, phone }.
 */
async function createListing(req, res) {
  const { body, user } = req;

  let property;
  if (body.propertyId) {
    property = await Property.findById(body.propertyId);
    if (!property) throw ApiError.notFound('Property not found');
  } else {
    property = await Property.create({
      ...pick(body.property, EDITABLE_PROPERTY_FIELDS),
      coordinates: toGeoPoint(body.property.coordinates),
      landlordId: await resolveLandlordId(body, user),
      createdBy: user._id,
    });
  }

  const listing = await Listing.create({
    ...pick(body, FEE_FIELDS),
    status: body.status,
    propertyId: property._id,
    agentId: await resolveAgentId(body, user),
    createdBy: user._id,
  });

  await listing.populate(LISTING_POPULATE);
  res.status(201).json({ success: true, data: { listing } });
}

/**
 * PATCH /api/listings/:id   (owner or admin)
 * Body: any of rent, agentFee, legalFee, caution, serviceCharge, status,
 * agentId (null to remove), and property { ...fields } to edit the property
 * itself (only allowed if you created the property, or you're an admin).
 */
async function updateListing(req, res) {
  const { body, user } = req;

  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  assertCanModify(listing, user);

  // Update fees and status. We use .set() + .save() (not findByIdAndUpdate)
  // so the pre('validate') hook recalculates totalMoveInCost.
  listing.set(pick(body, [...FEE_FIELDS, 'status']));

  // Agents can't reassign their own listings to another agent
  if (body.agentId !== undefined && user.role !== 'agent') {
    if (body.agentId === null) {
      listing.agentId = undefined;
    } else {
      const agent = await Agent.findById(body.agentId);
      if (!agent) throw ApiError.notFound('Agent not found');
      listing.agentId = agent._id;
    }
  }

  if (body.property) {
    const property = await Property.findById(listing.propertyId);
    const createdProperty = property.createdBy && property.createdBy.equals(user._id);
    if (!createdProperty && user.role !== 'admin') {
      throw ApiError.forbidden('Only the person who added this property can edit its details');
    }
    const updates = pick(body.property, EDITABLE_PROPERTY_FIELDS);
    if (updates.coordinates) updates.coordinates = toGeoPoint(updates.coordinates);
    property.set(updates);
    await property.save();
  }

  await listing.save();
  await listing.populate(LISTING_POPULATE);
  res.json({ success: true, data: { listing } });
}

/**
 * DELETE /api/listings/:id   (owner or admin)
 * Deletes the listing only. The property stays, because tenants' reviews
 * of the building are still useful after the listing is gone.
 */
async function deleteListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw ApiError.notFound('Listing not found');
  assertCanModify(listing, req.user);

  await listing.deleteOne();
  res.json({ success: true, data: { message: 'Listing deleted', id: listing._id } });
}

module.exports = {
  getListings,
  getMyListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
};

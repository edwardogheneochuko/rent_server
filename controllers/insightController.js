// Rent statistics built with MongoDB aggregation pipelines.

const { Listing, Property } = require('../models');
const { PROPERTY_TYPES } = require('../utils/constants');
const { formatNaira } = require('../utils/money');
const { queryString, queryNumber, startsWithRegex, findState } = require('../utils/query');

/**
 * GET /api/insights/rent?state=Lagos&area=Yaba&months=24
 *
 * Average, minimum and maximum yearly rent grouped by property type.
 * Both available and taken listings count, since past rents are still real
 * prices. Only listings from the last `months` months are included (default
 * 24), because rents in Nigeria rise quickly and old prices mislead.
 */
async function getRentInsights(req, res) {
  const state = findState(queryString(req.query.state));
  const area = queryString(req.query.area);
  const months = Math.min(120, Math.max(1, queryNumber(req.query.months) || 24));

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  // Filters on the joined property document
  const propertyMatch = {};
  if (state) propertyMatch['property.state'] = state;
  if (area) propertyMatch['property.area'] = startsWithRegex(area);

  const results = await Listing.aggregate([
    // 1. Recent listings only
    { $match: { createdAt: { $gte: since } } },
    // 2. Attach each listing's property (like a SQL JOIN)
    {
      $lookup: {
        from: Property.collection.name,
        localField: 'propertyId',
        foreignField: '_id',
        as: 'property',
      },
    },
    // 3. $lookup returns an array; turn it into a single object
    { $unwind: '$property' },
    // 4. Keep only the requested state/area
    { $match: propertyMatch },
    // 5. One row per property type
    {
      $group: {
        _id: '$property.type',
        averageRent: { $avg: '$rent' },
        minRent: { $min: '$rent' },
        maxRent: { $max: '$rent' },
        averageMoveInCost: { $avg: '$totalMoveInCost' },
        listingCount: { $sum: 1 },
      },
    },
  ]);

  // Round to the nearest ₦1,000, add display strings, and order the rows from
  // smallest (self-contain) to largest (duplex) for the chart
  const roundToThousand = (n) => Math.round(n / 1000) * 1000;
  const byType = results
    .map((row) => {
      const averageRent = roundToThousand(row.averageRent);
      const averageMoveInCost = roundToThousand(row.averageMoveInCost);
      return {
        type: row._id,
        averageRent,
        minRent: row.minRent,
        maxRent: row.maxRent,
        averageMoveInCost,
        listingCount: row.listingCount,
        formatted: {
          averageRent: formatNaira(averageRent),
          minRent: formatNaira(row.minRent),
          maxRent: formatNaira(row.maxRent),
          averageMoveInCost: formatNaira(averageMoveInCost),
        },
      };
    })
    .sort((a, b) => PROPERTY_TYPES.indexOf(a.type) - PROPERTY_TYPES.indexOf(b.type));

  res.json({
    success: true,
    data: {
      filters: { state: state || null, area: area || null, months },
      totalListings: byType.reduce((sum, row) => sum + row.listingCount, 0),
      byType,
    },
  });
}

/**
 * GET /api/insights/areas?state=Lagos
 * Every area that has properties, grouped by state. Used to fill the area
 * dropdowns on the search and insights pages.
 */
async function getAreas(req, res) {
  const state = findState(queryString(req.query.state));

  const rows = await Property.aggregate([
    { $match: state ? { state } : {} },
    { $group: { _id: { state: '$state', area: '$area' }, propertyCount: { $sum: 1 } } },
    { $sort: { '_id.state': 1, '_id.area': 1 } },
    {
      $group: {
        _id: '$_id.state',
        areas: { $push: { area: '$_id.area', propertyCount: '$propertyCount' } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, state: '$_id', areas: 1 } },
  ]);

  res.json({ success: true, data: { states: rows } });
}

module.exports = { getRentInsights, getAreas };

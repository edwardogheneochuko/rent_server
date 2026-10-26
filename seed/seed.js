// Fills the database with realistic sample data for Lagos and Abuja.
//
// ⚠️ This DELETES all existing data first. It refuses to run when
// NODE_ENV=production unless you pass --force.
//
// Usage:  npm run seed
//
// The random generator is "seeded", so every run produces the same data.
// That makes bugs reproducible.

const config = require('../config');
const { connectDB, disconnectDB } = require('../config/db');
const models = require('../models');
const data = require('./data');

const { User, Agent, Landlord, Property, Listing, Review, ScamReport } = models;

// ---- Random helpers (deterministic) -----------------------------------------

// mulberry32: a tiny pseudo-random number generator. Same seed, same numbers.
function createRandom(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(2026);
const randomInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const chance = (probability) => random() < probability;
const pickOne = (items) => items[Math.floor(random() * items.length)];
const roundTo = (value, step) => Math.round(value / step) * step;

// Pick `count` different items (no repeats)
function pickSome(items, count) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// A date `months` months ago, plus a few random days of variation
function monthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(date.getDate() - randomInt(0, 27));
  return date;
}

// Mongoose always sets createdAt to "now" on create, so to make older data
// we update the timestamps directly in the collection afterwards.
function backdate(Model, id, date) {
  return Model.collection.updateOne({ _id: id }, { $set: { createdAt: date, updatedAt: date } });
}

// ---- Seeding steps ----------------------------------------------------------

async function clearDatabase() {
  await Promise.all(Object.values(models).map((Model) => Model.deleteMany({})));
  // Make sure all indexes (unique review rule, 2dsphere, ...) exist
  await Promise.all(Object.values(models).map((Model) => Model.syncIndexes()));
}

async function createPeople() {
  // Hashing is deliberately slow, so hash the shared password once and reuse it
  const template = new User();
  await template.setPassword(data.SEED_PASSWORD);
  const passwordHash = template.passwordHash;

  const makeUser = (person, role) =>
    User.create({ name: person.name, email: person.email, phone: person.phone, role, passwordHash });

  const admin = await makeUser(
    {
      name: process.env.ADMIN_NAME || 'Site Admin',
      email: (process.env.ADMIN_EMAIL || 'admin@rentright.test').toLowerCase(),
    },
    'admin'
  );
  // The admin uses ADMIN_PASSWORD from .env when it's set
  if (process.env.ADMIN_PASSWORD) {
    await admin.setPassword(process.env.ADMIN_PASSWORD);
    await admin.save();
  }

  const tenants = await Promise.all(data.TENANTS.map((t) => makeUser(t, 'tenant')));

  // Each entry: { profile, user (or null if unclaimed), regions }
  const agents = [];
  for (const person of data.AGENT_USERS) {
    const user = await makeUser(person, 'agent');
    const profile = await Agent.create({ name: person.name, phone: person.phone, verified: person.verified, userId: user._id });
    agents.push({ profile, user, regions: person.regions });
  }
  for (const person of data.UNCLAIMED_AGENTS) {
    const profile = await Agent.create({ name: person.name, phone: person.phone });
    agents.push({ profile, user: null, regions: person.regions });
  }

  const landlords = [];
  for (const person of data.LANDLORD_USERS) {
    const user = await makeUser(person, 'landlord');
    const profile = await Landlord.create({ name: person.name, phone: person.phone, verified: person.verified, userId: user._id });
    landlords.push({ profile, user, regions: person.regions });
  }
  for (const person of data.UNCLAIMED_LANDLORDS) {
    const profile = await Landlord.create({ name: person.name, phone: person.phone });
    landlords.push({ profile, user: null, regions: person.regions });
  }

  return { admin, tenants, agents, landlords };
}

// Realistic Nigerian move-in fees for a given yearly rent
function makeFees(rent, hasAgent, serviceChargeRange) {
  return {
    agentFee: hasAgent ? roundTo(rent * pickOne([0.1, 0.1, 0.05, 0.15]), 10000) : 0,
    legalFee: roundTo(rent * pickOne([0.1, 0.1, 0.05]), 10000),
    caution: pickOne([0, roundTo(rent * 0.1, 10000), roundTo(rent * 0.2, 10000), 100000, 200000]),
    serviceCharge: roundTo(randomInt(serviceChargeRange[0], serviceChargeRange[1]), 10000),
  };
}

async function createPropertiesAndListings({ admin, agents, landlords }) {
  const properties = [];
  let listingCount = 0;

  for (const areaInfo of data.AREAS) {
    const types = Object.keys(areaInfo.rents);
    // Add a second unit of the most common types so insights show a real range
    const units = [...types, ...types.filter((t) => ['mini-flat', '2-bedroom', 'self-contain'].includes(t))];

    for (const type of units) {
      const landlord = pickOne(landlords.filter((l) => l.regions.includes(areaInfo.area)));
      const agent = chance(0.75) ? pickOne(agents.filter((a) => a.regions.includes(areaInfo.area))) : null;
      // Who "posted" it: the agent's account, else the landlord's, else the admin
      const createdBy = agent?.user?._id || landlord.user?._id || admin._id;

      const property = await Property.create({
        address: `${randomInt(1, 120)} ${pickOne(areaInfo.streets)}, ${areaInfo.area}`,
        area: areaInfo.area,
        lga: areaInfo.lga,
        state: areaInfo.state,
        type,
        coordinates: {
          type: 'Point',
          coordinates: [
            areaInfo.center[0] + (random() - 0.5) * 0.016,
            areaInfo.center[1] + (random() - 0.5) * 0.016,
          ],
        },
        amenities: pickSome(data.AMENITIES, randomInt(3, 6)),
        landlordId: landlord.profile._id,
        createdBy,
      });
      properties.push({ property, landlord, agent });

      // The current listing
      const [minRent, maxRent] = areaInfo.rents[type];
      const rent = roundTo(randomInt(minRent, maxRent), 50000);
      const listing = await Listing.create({
        propertyId: property._id,
        agentId: agent?.profile._id,
        rent,
        ...makeFees(rent, Boolean(agent), areaInfo.serviceCharge),
        status: chance(0.85) ? 'available' : 'taken',
        createdBy,
      });
      await backdate(Listing, listing._id, monthsAgo(randomInt(0, 5)));
      listingCount += 1;

      // Some properties were also let out last year, at a lower rent
      if (chance(0.35)) {
        const oldRent = roundTo(rent * 0.8, 50000);
        const oldListing = await Listing.create({
          propertyId: property._id,
          agentId: agent?.profile._id,
          rent: oldRent,
          ...makeFees(oldRent, Boolean(agent), areaInfo.serviceCharge),
          status: 'taken',
          createdBy,
        });
        await backdate(Listing, oldListing._id, monthsAgo(randomInt(12, 20)));
        listingCount += 1;
      }
    }
  }

  return { properties, listingCount };
}

// Star ratings that match the tone of the review text
function ratingFor(tone) {
  if (tone === 'good') return randomInt(4, 5);
  if (tone === 'mixed') return randomInt(2, 4);
  return randomInt(1, 2);
}

function pickTone() {
  const roll = random();
  if (roll < 0.5) return 'good';
  if (roll < 0.85) return 'mixed';
  return 'bad';
}

async function createReviews({ tenants, agents, landlords, properties }) {
  const reviews = [];

  // Every review target, plus the user (if any) who is allowed to reply
  const propertyTargets = properties.map(({ property, landlord }) => ({
    targetType: 'property',
    target: property,
    ownerUser: landlord.user,
    floodProne: property.area.startsWith('Lekki'), // Lekki is known for flooding
  }));
  const agentTargets = agents.map(({ profile, user }) => ({ targetType: 'agent', target: profile, ownerUser: user }));
  const landlordTargets = landlords.map(({ profile, user }) => ({ targetType: 'landlord', target: profile, ownerUser: user }));

  for (const tenant of tenants) {
    // pickSome never repeats, so the "one review per target" rule holds
    const targets = [
      ...pickSome(propertyTargets, 5),
      ...pickSome(agentTargets, 2),
      ...pickSome(landlordTargets, 2),
    ];

    for (const { targetType, target, ownerUser, floodProne } of targets) {
      const tone = pickTone();
      const ratings = { overall: ratingFor(tone) };
      let cautionRefunded = 'not-applicable';

      if (targetType === 'property') {
        ratings.light = ratingFor(tone);
        ratings.water = ratingFor(tone);
        ratings.security = ratingFor(tone);
        ratings.flooding = floodProne ? randomInt(1, 3) : ratingFor(tone);
        ratings.landlordBehaviour = ratingFor(tone);
      }
      if (targetType === 'landlord') {
        ratings.landlordBehaviour = ratingFor(tone);
        cautionRefunded = tone === 'good' ? 'yes' : tone === 'bad' ? 'no' : pickOne(['yes', 'no']);
      }

      const roll = random();
      const status = roll < 0.8 ? 'approved' : roll < 0.95 ? 'pending' : 'rejected';

      const review = new Review({
        targetType,
        targetId: target._id,
        authorId: tenant._id,
        ratings,
        cautionRefunded,
        text: pickOne(data.REVIEW_TEXTS[targetType][tone]),
        status,
      });

      // Claimed agents/landlords sometimes reply to approved reviews
      if (status === 'approved' && ownerUser && chance(0.4)) {
        review.reply = { text: pickOne(data.REPLY_TEXTS), date: new Date(), authorId: ownerUser._id };
      }

      await review.save();
      await backdate(Review, review._id, monthsAgo(randomInt(0, 10)));
      reviews.push(review);
    }
  }

  // Recalculate averageRating/reviewCount once per reviewed target
  const targetKeys = new Set(reviews.map((r) => `${r.targetType}:${r.targetId}`));
  for (const key of targetKeys) {
    const [targetType, targetId] = key.split(':');
    await Review.recalculateTargetStats(targetType, targetId);
  }

  return reviews;
}

async function createScamReports({ tenants }) {
  return Promise.all(
    data.SCAM_REPORTS.map((report) => ScamReport.create({ ...report, reporterId: pickOne(tenants)._id }))
  );
}

// ---- Main -------------------------------------------------------------------

async function seed() {
  if (config.isProduction && !process.argv.includes('--force')) {
    console.error('❌ Refusing to wipe a production database. Re-run with --force if you are sure.');
    process.exit(1);
  }

  await connectDB();
  console.log('🧹 Clearing existing data...');
  await clearDatabase();

  console.log('👤 Creating users, agents and landlords...');
  const people = await createPeople();

  console.log('🏠 Creating properties and listings...');
  const { properties, listingCount } = await createPropertiesAndListings(people);

  console.log('⭐ Creating reviews...');
  const reviews = await createReviews({ ...people, properties });

  console.log('🚨 Creating scam reports...');
  const scams = await createScamReports(people);

  const countStatus = (items, status) => items.filter((i) => i.status === status).length;
  console.log('\n✅ Seed complete:');
  console.table({
    users: { count: 1 + people.tenants.length + data.AGENT_USERS.length + data.LANDLORD_USERS.length },
    agents: { count: people.agents.length },
    landlords: { count: people.landlords.length },
    properties: { count: properties.length },
    listings: { count: listingCount },
    reviews: { count: reviews.length, approved: countStatus(reviews, 'approved'), pending: countStatus(reviews, 'pending') },
    scamReports: { count: scams.length, confirmed: countStatus(scams, 'confirmed'), pending: countStatus(scams, 'pending') },
  });

  console.log(`🔑 Logins (password "${data.SEED_PASSWORD}" unless noted):`);
  console.log(`   admin    ${people.admin.email}${process.env.ADMIN_PASSWORD ? '  (password = ADMIN_PASSWORD in .env)' : ''}`);
  console.log(`   tenant   ${data.TENANTS[0].email}`);
  console.log(`   agent    ${data.AGENT_USERS[0].email}`);
  console.log(`   landlord ${data.LANDLORD_USERS[0].email}`);
  console.log(`   ...see seed/data.js for the rest.`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});

// Loads every model in one place so you can write:
//   const { User, Listing } = require('../models');

module.exports = {
  User: require('./User'),
  Agent: require('./Agent'),
  Landlord: require('./Landlord'),
  Property: require('./Property'),
  Listing: require('./Listing'),
  Review: require('./Review'),
  ScamReport: require('./ScamReport'),
};

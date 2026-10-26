// Connects Mongoose to MongoDB (local or Atlas).

const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./index');

// Atlas "mongodb+srv://" addresses need a special DNS lookup (SRV record).
// On some Windows machines Node uses a broken DNS server for this and fails
// with "querySrv ECONNREFUSED". Setting DNS_SERVERS in .env fixes it.
if (config.dnsServers.length > 0) {
  dns.setServers(config.dnsServers);
}

// Reject query filters on fields that are not in the schema.
// This blocks a class of NoSQL-injection tricks like ?role[$ne]=x.
mongoose.set('strictQuery', true);

async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      // Give up after 10s instead of hanging forever if the DB is unreachable
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };

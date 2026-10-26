// Loads environment variables from .env and exposes them as one config object.
// Every other file imports settings from here instead of reading process.env
// directly, so there is a single place to see what the app needs.

// quiet: true stops dotenv printing a banner every time the app starts
require('dotenv').config({ quiet: true });

// Stop the app early (with a clear message) if a required secret is missing.
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy server/.env.example to server/.env and fill them in.');
  process.exit(1);
}

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  isProduction: env === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,

  // Optional DNS servers for Node to use, e.g. "8.8.8.8,1.1.1.1". Only needed
  // when Node can't look up Atlas's "mongodb+srv" address (querySrv errors).
  dnsServers: (process.env.DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Name of the httpOnly cookie that holds the login token
  cookieName: 'rr_token',

  // CLIENT_URL can hold several origins separated by commas,
  // e.g. "http://localhost:5173,https://rentright.vercel.app"
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

// Creates (or updates) the admin account.
//
// The public register route never lets anyone become an admin, so the first
// admin is created from the command line using values in .env:
//   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
//
// Usage:  npm run create-admin

const config = require('../config');
const { connectDB, disconnectDB } = require('../config/db');
const { User } = require('../models');

async function createAdmin() {
  const name = process.env.ADMIN_NAME || 'Site Admin';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || password.length < 8) {
    console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters) in server/.env');
    process.exit(1);
  }
  if (config.isProduction && password === 'ChangeMe123') {
    console.error('❌ Refusing to use the example admin password in production.');
    process.exit(1);
  }

  await connectDB();

  // Update the account if it exists, otherwise create it
  let user = await User.findOne({ email });
  const isNew = !user;
  if (isNew) user = new User({ email });

  user.name = name;
  user.role = 'admin';
  await user.setPassword(password);
  await user.save();

  console.log(`✅ Admin ${isNew ? 'created' : 'updated'}: ${email}`);
  await disconnectDB();
}

createAdmin().catch(async (err) => {
  console.error('❌ Could not create admin:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});

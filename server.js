// Entry point: connect to MongoDB first, then start listening for requests.
// Run with `npm run dev` (auto-restarts on changes) or `npm start`.

const config = require('./config');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();
  } catch {
    // connectDB already logged the reason
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`🚀 API running on http://localhost:${config.port} (${config.env})`);
  });

  // Close connections cleanly when the process is stopped (Ctrl+C, or Render
  // restarting the service) so in-flight requests can finish.
  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force-exit if something hangs
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Log bugs that escape every try/catch, then exit so the host restarts us
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled promise rejection:', err);
  process.exit(1);
});

start();

// Builds the Express app: security middleware, body parsing, routes and
// error handling. Kept separate from server.js so it can be imported in
// tests without opening a port.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render (and most hosts) put a proxy in front of the app. This lets
// express-rate-limit see the real visitor IP instead of the proxy's.
app.set('trust proxy', 1);

// Don't advertise that we're running Express
app.disable('x-powered-by');

// ---- Security ---------------------------------------------------------------

// Sets safe HTTP headers (no sniffing, no iframing, HSTS, etc.)
app.use(helmet());

// In development, accept any localhost port: Vite moves to 5174, 5175...
// when 5173 is busy. Production only accepts the exact CLIENT_URL list.
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

// Only our frontend(s) may call the API from a browser, with cookies.
app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (curl, Postman, server-to-server) are allowed
      if (!origin || config.clientUrls.includes(origin)) {
        return callback(null, true);
      }
      if (!config.isProduction && LOCALHOST_ORIGIN.test(origin)) {
        return callback(null, true);
      }
      const err = new Error(`Origin ${origin} is not allowed`);
      err.name = 'CorsError';
      return callback(err);
    },
    credentials: true, // allow the auth cookie to be sent
  })
);

// ---- Parsing & logging ------------------------------------------------------

// Small body limit: our JSON payloads are tiny; big ones are likely abuse.
// (Image uploads in Phase 5 use multer, which has its own limit.)
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(cookieParser());

if (!config.isProduction) {
  app.use(morgan('dev')); // e.g. "POST /api/auth/login 200 112 ms"
}

// ---- Routes -----------------------------------------------------------------

app.get('/', (req, res) => {
  res.json({ success: true, data: { name: 'RentRight Naija API', docs: '/api/health' } });
});

app.use('/api', apiLimiter, routes);

// ---- Errors (must be last) --------------------------------------------------

app.use(notFound);
app.use(errorHandler);

module.exports = app;

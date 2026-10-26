// Mounts every route group under /api.

const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');
const listingRoutes = require('./listingRoutes');
const reviewRoutes = require('./reviewRoutes');
const scamRoutes = require('./scamRoutes');
const insightRoutes = require('./insightRoutes');
const adminRoutes = require('./adminRoutes');
const { agentRouter, landlordRouter } = require('./profileRoutes');

const router = express.Router();

// GET /api/health — quick check that the API and database are up.
// Render uses this to know the service is healthy.
router.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    data: {
      status: dbConnected ? 'ok' : 'degraded',
      database: dbConnected ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/scams', scamRoutes);
router.use('/insights', insightRoutes);
router.use('/admin', adminRoutes);
router.use('/agents', agentRouter);
router.use('/landlords', landlordRouter);

module.exports = router;

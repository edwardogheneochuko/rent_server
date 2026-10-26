// Public profile routes, mounted at /api/agents and /api/landlords.

const express = require('express');
const { param } = require('express-validator');

const { getAgent, getLandlord } = require('../controllers/profileController');
const validate = require('../middleware/validate');

const idParam = param('id').isMongoId().withMessage('Invalid id');

const agentRouter = express.Router();
agentRouter.get('/:id', idParam, validate, getAgent);

const landlordRouter = express.Router();
landlordRouter.get('/:id', idParam, validate, getLandlord);

module.exports = { agentRouter, landlordRouter };

const Stripe = require('stripe');

const API_VERSION = '2020-03-02';
const STRIPE_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: API_VERSION });

function enableCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handleCors(req, res) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

function parseRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('Unable to parse request body as JSON:', error);
      return {};
    }
  }

  return req.body;
}

function validateApiKey() {
  const key = STRIPE_SECRET_KEY.trim();

  if (!key) {
    return "Error: you provided an empty secret key. Please provide your test mode secret key. For more information, see https://stripe.com/docs/keys";
  }

  if (key.startsWith('pk')) {
    return "Error: you used a publishable key to set up the example backend. Please use your test mode secret key. For more information, see https://stripe.com/docs/keys";
  }

  if (key.startsWith('sk_live')) {
    return "Error: you used a live mode secret key to set up the example backend. Please use your test mode secret key. For more information, see https://stripe.com/docs/keys#test-live-modes";
  }

  return null;
}

function buildErrorResponse(res, statusCode, message) {
  res.status(statusCode).json({ error: message });
}

async function lookupOrCreateExampleCustomer() {
  const email = 'example@test.com';

  try {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing && Array.isArray(existing.data) && existing.data.length === 1) {
      return existing.data[0];
    }

    return await stripe.customers.create({ email });
  } catch (error) {
    throw new Error(`Error creating or retrieving customer! ${error.message}`);
  }
}

module.exports = {
  stripe,
  enableCors,
  handleCors,
  parseRequestBody,
  validateApiKey,
  buildErrorResponse,
  lookupOrCreateExampleCustomer,
};

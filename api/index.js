const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const Stripe = require('stripe');

require('dotenv').config();

const STRIPE_API_VERSION = '2020-03-02';
const STRIPE_ENV = process.env.STRIPE_ENV;
const TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY;
const LIVE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let stripeClient;

function resolveApiKey() {
  return STRIPE_ENV === 'production' ? LIVE_SECRET_KEY : TEST_SECRET_KEY;
}

function getStripeClient() {
  if (stripeClient !== undefined) {
    return stripeClient;
  }

  const apiKey = resolveApiKey();

  if (!apiKey) {
    stripeClient = null;
    return stripeClient;
  }

  stripeClient = new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION });
  return stripeClient;
}

function validateApiKey() {
  const apiKey = resolveApiKey();

  if (!apiKey) {
    return 'Error: you provided an empty secret key. Please provide your test mode secret key. For more information, see https://stripe.com/docs/keys';
  }

  if (apiKey.startsWith('pk')) {
    return 'Error: you used a publishable key to set up the example backend. Please use your test mode secret key. For more information, see https://stripe.com/docs/keys';
  }

  if (apiKey.startsWith('sk_live')) {
    return 'Error: you used a live mode secret key to set up the example backend. Please use your test mode secret key. For more information, see https://stripe.com/docs/keys#test-live-modes';
  }

  return null;
}

function logInfo(message) {
  console.log(`\n${message}\n`);
  return message;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return req.body;
    }

    if (typeof req.body === 'string') {
      return coerceBody(req.body, req.headers['content-type']);
    }

    if (Buffer.isBuffer(req.body)) {
      return coerceBody(req.body.toString('utf8'), req.headers['content-type']);
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return coerceBody(rawBody, req.headers['content-type']);
}

function coerceBody(rawBody, contentTypeHeader) {
  const contentType = (contentTypeHeader || '').toLowerCase();

  if (contentType.includes('application/json')) {
    try {
      return rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return querystring.parse(rawBody);
  }

  return rawBody ? { raw: rawBody } : {};
}

async function lookupOrCreateExampleCustomer(stripe) {
  const customerEmail = 'example@test.com';

  try {
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });

    if (customers.data.length === 1) {
      return customers.data[0];
    }

    return await stripe.customers.create({ email: customerEmail });
  } catch (error) {
    return logInfo(`Error creating or retreiving customer! ${error.message}`);
  }
}

function ensureStripe(res) {
  const client = getStripeClient();

  if (!client) {
    const message = logInfo('Error: you provided an empty secret key. Please provide your test mode secret key. For more information, see https://stripe.com/docs/keys');
    sendText(res, 400, message);
    return null;
  }

  return client;
}

async function handleRegisterReader(req, res) {
  const validationError = validateApiKey();

  if (validationError) {
    return sendText(res, 400, logInfo(validationError));
  }

  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);

  try {
    const reader = await stripe.terminal.readers.create({
      registration_code: params.registration_code,
      label: params.label,
      location: params.location,
    });

    logInfo(`Reader registered: ${reader.id}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(reader));
  } catch (error) {
    sendText(res, 402, logInfo(`Error registering reader! ${error.message}`));
  }
}

async function handleConnectionToken(req, res) {
  const validationError = validateApiKey();

  if (validationError) {
    return sendText(res, 400, logInfo(validationError));
  }

  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  try {
    const token = await stripe.terminal.connectionTokens.create();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ secret: token.secret }));
  } catch (error) {
    sendText(res, 402, logInfo(`Error creating ConnectionToken! ${error.message}`));
  }
}

async function handleCreatePaymentIntent(req, res) {
  const validationError = validateApiKey();

  if (validationError) {
    return sendText(res, 400, logInfo(validationError));
  }

  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      payment_method_types: params.payment_method_types || ['card_present'],
      capture_method: params.capture_method || 'manual',
      amount: params.amount,
      currency: params.currency || 'usd',
      description: params.description || 'Example PaymentIntent',
      payment_method_options: params.payment_method_options || [],
      receipt_email: params.receipt_email,
    });

    logInfo(`PaymentIntent successfully created: ${paymentIntent.id}`);
    sendJson(res, 200, { intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    sendText(res, 402, logInfo(`Error creating PaymentIntent! ${error.message}`));
  }
}

async function handleCapturePaymentIntent(req, res) {
  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);
  const paymentIntentId = params.payment_intent_id;

  if (!paymentIntentId) {
    return sendText(res, 400, logInfo("'payment_intent_id' is a required parameter"));
  }

  try {
    const captureParams = {};
    if (params.amount_to_capture) {
      captureParams.amount_to_capture = params.amount_to_capture;
    }

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, captureParams);

    logInfo(`PaymentIntent successfully captured: ${paymentIntentId}`);
    sendJson(res, 200, { intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    sendText(res, 402, logInfo(`Error capturing PaymentIntent! ${error.message}`));
  }
}

async function handleCancelPaymentIntent(req, res) {
  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);
  const paymentIntentId = params.payment_intent_id;

  if (!paymentIntentId) {
    return sendText(res, 400, logInfo("'payment_intent_id' is a required parameter"));
  }

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    logInfo(`PaymentIntent successfully canceled: ${paymentIntentId}`);
    sendJson(res, 200, { intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    sendText(res, 402, logInfo(`Error canceling PaymentIntent! ${error.message}`));
  }
}

async function handleCreateSetupIntent(req, res) {
  const validationError = validateApiKey();

  if (validationError) {
    return sendText(res, 400, logInfo(validationError));
  }

  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);

  const setupIntentParams = {
    payment_method_types: params.payment_method_types || ['card_present'],
  };

  if (params.customer) {
    setupIntentParams.customer = params.customer;
  }

  if (params.description) {
    setupIntentParams.description = params.description;
  }

  if (params.on_behalf_of) {
    setupIntentParams.on_behalf_of = params.on_behalf_of;
  }

  try {
    const setupIntent = await stripe.setupIntents.create(setupIntentParams);

    logInfo(`SetupIntent successfully created: ${setupIntent.id}`);
    sendJson(res, 200, { intent: setupIntent.id, secret: setupIntent.client_secret });
  } catch (error) {
    sendText(res, 402, logInfo(`Error creating SetupIntent! ${error.message}`));
  }
}

async function handleAttachPaymentMethod(req, res) {
  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);

  try {
    const customer = await lookupOrCreateExampleCustomer(stripe);
    if (typeof customer === 'string') {
      return sendText(res, 402, customer);
    }

    const paymentMethod = await stripe.paymentMethods.attach(params.payment_method_id, {
      customer: customer.id,
      expand: ['customer'],
    });

    logInfo(`Attached PaymentMethod to Customer: ${customer.id}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(paymentMethod));
  } catch (error) {
    sendText(res, 402, logInfo(`Error attaching PaymentMethod to Customer! ${error.message}`));
  }
}

async function handleUpdatePaymentIntent(req, res) {
  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);
  const paymentIntentId = params.payment_intent_id;

  if (!paymentIntentId) {
    return sendText(res, 400, logInfo("'payment_intent_id' is a required parameter"));
  }

  const allowedKeys = ['receipt_email'];
  const updateParams = {};

  for (const key of allowedKeys) {
    if (params[key] !== undefined) {
      updateParams[key] = params[key];
    }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, updateParams);

    logInfo(`Updated PaymentIntent ${paymentIntentId}`);
    sendJson(res, 200, { intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    sendText(res, 402, logInfo(`Error updating PaymentIntent ${paymentIntentId}. ${error.message}`));
  }
}

async function handleListLocations(req, res) {
  const validationError = validateApiKey();

  if (validationError) {
    return sendText(res, 400, logInfo(validationError));
  }

  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  try {
    const locations = await stripe.terminal.locations.list({ limit: 100 });

    logInfo(`${locations.data.length} Locations successfully fetched`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(locations.data));
  } catch (error) {
    sendText(res, 402, logInfo(`Error fetching Locations! ${error.message}`));
  }
}

async function handleCreateLocation(req, res) {
  const validationError = validateApiKey();

  if (validationError) {
    return sendText(res, 400, logInfo(validationError));
  }

  const stripe = ensureStripe(res);
  if (!stripe) {
    return;
  }

  const params = await parseBody(req);

  try {
    const location = await stripe.terminal.locations.create({
      display_name: params.display_name,
      address: params.address,
    });

    logInfo(`Location successfully created: ${location.id}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(location));
  } catch (error) {
    sendText(res, 402, logInfo(`Error creating Location! ${error.message}`));
  }
}

function serveIndex(res) {
  const filePath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

function handleError(res, error) {
  console.error(error);
  sendJson(res, 500, { error: 'Internal Server Error' });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-User-Email, X-Auth-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/') {
      return serveIndex(res);
    }

    if (req.method === 'POST') {
      switch (url.pathname) {
        case '/register_reader':
          return handleRegisterReader(req, res);
        case '/connection_token':
          return handleConnectionToken(req, res);
        case '/create_payment_intent':
          return handleCreatePaymentIntent(req, res);
        case '/capture_payment_intent':
          return handleCapturePaymentIntent(req, res);
        case '/cancel_payment_intent':
          return handleCancelPaymentIntent(req, res);
        case '/create_setup_intent':
          return handleCreateSetupIntent(req, res);
        case '/attach_payment_method_to_customer':
          return handleAttachPaymentMethod(req, res);
        case '/update_payment_intent':
          return handleUpdatePaymentIntent(req, res);
        case '/create_location':
          return handleCreateLocation(req, res);
        default:
          break;
      }
    }

    if (req.method === 'GET' && url.pathname === '/list_locations') {
      return handleListLocations(req, res);
    }

    return notFound(res);
  } catch (error) {
    return handleError(res, error);
  }
};

const {
  stripe,
  handleCors,
  validateApiKey,
  buildErrorResponse,
  parseRequestBody,
} = require('./_common');

module.exports = async (req, res) => {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    buildErrorResponse(res, 405, 'Method not allowed');
    return;
  }

  const validationError = validateApiKey();
  if (validationError) {
    buildErrorResponse(res, 400, validationError);
    return;
  }

  const {
    payment_method_types,
    customer,
    description,
    on_behalf_of,
  } = parseRequestBody(req);

  try {
    const setupIntentParams = {
      payment_method_types: payment_method_types || ['card_present'],
    };

    if (customer) {
      setupIntentParams.customer = customer;
    }

    if (description) {
      setupIntentParams.description = description;
    }

    if (on_behalf_of) {
      setupIntentParams.on_behalf_of = on_behalf_of;
    }

    const setupIntent = await stripe.setupIntents.create(setupIntentParams);

    res.status(200).json({ intent: setupIntent.id, secret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating SetupIntent:', error);
    buildErrorResponse(res, 402, `Error creating SetupIntent! ${error.message}`);
  }
};

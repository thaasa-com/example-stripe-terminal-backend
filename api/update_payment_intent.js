const {
  stripe,
  handleCors,
  buildErrorResponse,
  parseRequestBody,
} = require('./_common');

const ALLOWED_UPDATE_FIELDS = new Set(['receipt_email']);

module.exports = async (req, res) => {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    buildErrorResponse(res, 405, 'Method not allowed');
    return;
  }

  const { payment_intent_id, ...rest } = parseRequestBody(req);

  if (!payment_intent_id) {
    buildErrorResponse(res, 400, "'payment_intent_id' is a required parameter");
    return;
  }

  const updateParams = {};
  for (const [key, value] of Object.entries(rest)) {
    if (ALLOWED_UPDATE_FIELDS.has(key) && value !== undefined) {
      updateParams[key] = value;
    }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.update(payment_intent_id, updateParams);
    res.status(200).json({ intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    console.error(`Error updating PaymentIntent ${payment_intent_id}:`, error);
    buildErrorResponse(res, 402, `Error updating PaymentIntent ${payment_intent_id}. ${error.message}`);
  }
};

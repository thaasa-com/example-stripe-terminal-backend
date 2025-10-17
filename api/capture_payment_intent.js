const {
  stripe,
  handleCors,
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

  const { payment_intent_id, amount_to_capture } = parseRequestBody(req);

  if (!payment_intent_id) {
    buildErrorResponse(res, 400, "'payment_intent_id' is a required parameter");
    return;
  }

  try {
    const options = amount_to_capture ? { amount_to_capture } : undefined;
    const paymentIntent = await stripe.paymentIntents.capture(payment_intent_id, options);

    res.status(200).json({ intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error capturing PaymentIntent:', error);
    buildErrorResponse(res, 402, `Error capturing PaymentIntent! ${error.message}`);
  }
};

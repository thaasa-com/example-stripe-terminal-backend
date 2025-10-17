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

  const { payment_intent_id } = parseRequestBody(req);

  if (!payment_intent_id) {
    buildErrorResponse(res, 400, "'payment_intent_id' is a required parameter");
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(payment_intent_id);
    res.status(200).json({ intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error canceling PaymentIntent:', error);
    buildErrorResponse(res, 402, `Error canceling PaymentIntent! ${error.message}`);
  }
};

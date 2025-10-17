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
    capture_method,
    amount,
    currency,
    description,
    payment_method_options,
    receipt_email,
  } = parseRequestBody(req);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      payment_method_types: payment_method_types || ['card_present'],
      capture_method: capture_method || 'manual',
      amount,
      currency: currency || 'usd',
      description: description || 'Example PaymentIntent',
      payment_method_options: payment_method_options || {},
      receipt_email,
    });

    res.status(200).json({ intent: paymentIntent.id, secret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    buildErrorResponse(res, 402, `Error creating PaymentIntent! ${error.message}`);
  }
};

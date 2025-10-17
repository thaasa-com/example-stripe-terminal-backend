const {
  stripe,
  handleCors,
  buildErrorResponse,
  lookupOrCreateExampleCustomer,
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

  const { payment_method_id } = parseRequestBody(req);

  if (!payment_method_id) {
    buildErrorResponse(res, 400, "'payment_method_id' is a required parameter");
    return;
  }

  try {
    const customer = await lookupOrCreateExampleCustomer();

    const paymentMethod = await stripe.paymentMethods.attach(payment_method_id, {
      customer: customer.id,
      expand: ['customer'],
    });

    res.status(200).json(paymentMethod);
  } catch (error) {
    console.error('Error attaching PaymentMethod to Customer:', error);
    buildErrorResponse(res, 402, `Error attaching PaymentMethod to Customer! ${error.message}`);
  }
};

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

  const { registration_code, label, location } = parseRequestBody(req);

  try {
    const reader = await stripe.terminal.readers.create({
      registration_code,
      label,
      location,
    });

    res.status(200).json(reader);
  } catch (error) {
    console.error('Error registering reader:', error);
    buildErrorResponse(res, 402, `Error registering reader! ${error.message}`);
  }
};

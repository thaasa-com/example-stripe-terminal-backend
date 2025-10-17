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

  const { display_name, address } = parseRequestBody(req);

  try {
    const location = await stripe.terminal.locations.create({
      display_name,
      address,
    });

    res.status(200).json(location);
  } catch (error) {
    console.error('Error creating Location:', error);
    buildErrorResponse(res, 402, `Error creating Location! ${error.message}`);
  }
};

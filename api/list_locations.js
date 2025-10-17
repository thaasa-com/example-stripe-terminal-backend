const {
  stripe,
  handleCors,
  validateApiKey,
  buildErrorResponse,
} = require('./_common');

module.exports = async (req, res) => {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    buildErrorResponse(res, 405, 'Method not allowed');
    return;
  }

  const validationError = validateApiKey();
  if (validationError) {
    buildErrorResponse(res, 400, validationError);
    return;
  }

  try {
    const locations = await stripe.terminal.locations.list({ limit: 100 });
    res.status(200).json(locations.data || []);
  } catch (error) {
    console.error('Error fetching Locations:', error);
    buildErrorResponse(res, 402, `Error fetching Locations! ${error.message}`);
  }
};

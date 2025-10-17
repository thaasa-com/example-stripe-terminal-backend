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

  if (req.method !== 'POST') {
    buildErrorResponse(res, 405, 'Method not allowed');
    return;
  }

  const validationError = validateApiKey();
  if (validationError) {
    buildErrorResponse(res, 400, validationError);
    return;
  }

  try {
    const token = await stripe.terminal.connectionTokens.create();
    res.status(200).json({ secret: token.secret });
  } catch (error) {
    console.error('Error creating connection token:', error);
    buildErrorResponse(res, 402, `Error creating ConnectionToken! ${error.message}`);
  }
};

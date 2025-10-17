const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-03-02',
});

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Validate API key
    if (!stripe._api.auth) {
      res.status(400).json({
        error: 'Error: you provided an empty secret key. Please provide your test mode secret key. For more information, see https://stripe.com/docs/keys'
      });
      return;
    }

    // Create connection token
    const token = await stripe.terminal.connectionTokens.create();

    res.status(200).json({ secret: token.secret });
  } catch (error) {
    console.error('Error creating connection token:', error);
    res.status(402).json({
      error: `Error creating ConnectionToken! ${error.message}`
    });
  }
};

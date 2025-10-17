# Example Terminal Backend
⚠️ **Note that this backend is intended for example purposes only**. Because endpoints are not authenticated, you should not use this backend in production.

This is a simple Node.js serverless function that you can use to run the [Stripe Terminal](https://stripe.com/docs/terminal) example apps. To get started, you can choose from the following options:

1. [Run it on Vercel](#running-on-vercel) (Recommended)
2. [Run it locally on your machine](#running-locally-on-your-machine)

ℹ️  You also need to obtain your Stripe **secret, test mode** API Key, available in the [Dashboard](https://dashboard.stripe.com/account/apikeys). Note that you must use your secret key, not your publishable key, to set up the backend. For more information on the differences between **secret** and publishable keys, see [API Keys](https://stripe.com/docs/keys). For more information on **test mode**, see [Test and live modes](https://stripe.com/docs/keys#test-live-modes).

## Running the app

### Running locally on your machine

If you prefer running the backend locally, ensure you have [Node.js](https://nodejs.org/) version 18 or higher installed.

Clone down this repo to your computer, and then follow the steps below:

1. Create a file named `.env` within the newly cloned repo directory and add the following line:
```
STRIPE_TEST_SECRET_KEY={YOUR_API_KEY}
```
2. In your terminal, run `npm install`
3. Run `npm run dev` to start the development server
4. The example backend should now be running at `http://localhost:3000`
5. Go to the [next steps](#next-steps) in this README for how to use this app

### Running on Vercel

1. Install the [Vercel CLI](https://vercel.com/docs/cli) and log in with `vercel login`.
2. From the repository directory, run `vercel link` to create or connect a project.
3. Set the required environment variable:
   ```sh
   vercel env add STRIPE_TEST_SECRET_KEY
   ```
4. Deploy with `vercel --prod` (or `vercel` for a preview deployment).
5. The deployed backend will expose the connection token endpoint at `POST /connection_token`. Use the generated Vercel URL when configuring your Stripe Terminal app, then go to the [next steps](#next-steps) in this README.

---

## API Endpoints

This backend provides the following endpoint:

- `POST /connection_token` - Creates a connection token for Stripe Terminal

Example request:
```bash
curl -X POST https://your-vercel-url.vercel.app/connection_token \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "secret": "pst_test_..."
}
```

## Next steps

Next, navigate to one of our example apps. Follow the instructions in the README to set up and run the app. You'll provide the URL of the example backend you just deployed.

| SDK | Example App |
|  :---  |  :---  |
| iOS | https://github.com/stripe/stripe-terminal-ios |
| JavaScript | https://github.com/stripe/stripe-terminal-js-demo |
| Android | https://github.com/stripe/stripe-terminal-android |




# Example Terminal Backend
⚠️ **Note that this backend is intended for example purposes only**. Because endpoints are not authenticated, you should not use this backend in production.

This is a simple [Sinatra](http://www.sinatrarb.com/) webapp that you can use to run the [Stripe Terminal](https://stripe.com/docs/terminal) example apps. To get started, you can choose from the following options:

1. [Run it on Vercel](#running-on-vercel)
2. [Run it on a free Render account](#running-on-render)
3. [Run it on Heroku](#running-on-heroku)
4. [Run it locally on your machine](#running-locally-on-your-machine)
5. [Run it locally via Docker CLI](#running-locally-with-docker)

ℹ️  You also need to obtain your Stripe **secret, test mode** API Key, available in the [Dashboard](https://dashboard.stripe.com/account/apikeys). Note that you must use your secret key, not your publishable key, to set up the backend. For more information on the differences between **secret** and publishable keys, see [API Keys](https://stripe.com/docs/keys). For more information on **test mode**, see [Test and live modes](https://stripe.com/docs/keys#test-live-modes).

## Running the app

### Running locally on your machine

If you prefer running the backend locally, ensure you have the required [Ruby runtime](https://www.ruby-lang.org/en/documentation/installation/) version installed as per the [latest Gemfile in this repo](Gemfile).

You'll also need the correct [Bundler](https://bundler.io/) version, outlined in the [Gemfile.lock](Gemfile.lock) under the `BUNDLED_WITH` directive.

Clone down this repo to your computer, and then follow the steps below:

1. Create a file named `.env` within the newly cloned repo directory and add the following line:
```
STRIPE_TEST_SECRET_KEY={YOUR_API_KEY}
```
2. In your terminal, run `bundle install`
3. Run `ruby web.rb`
4. The example backend should now be running at `http://localhost:4567`
5. Go to the [next steps](#next-steps) in this README for how to use this app

### Running locally with Docker

We have a pre-built Docker image you can run locally if you're into the convenience of containers.

 Install [Docker Desktop](https://www.docker.com/products/docker-desktop) if you don't already have it. Then follow the steps below:

1. In your terminal, run `docker run -e STRIPE_TEST_SECRET_KEY={YOUR_API_KEY} -p 4567:4567 stripe/example-terminal-backend` (replace `{YOUR_API_KEY}` with your own test key)
2. The example backend should now be running at `http://localhost:4567`
3. Go to the [next steps](#next-steps) in this README for how to use this app

### Running on Vercel

1. Install the [Vercel CLI](https://vercel.com/docs/cli) and log in with `vercel login`.
2. From the repository directory, run `vercel link` to create or connect a project.
3. Set the required environment variables:
   ```sh
   vercel env add STRIPE_TEST_SECRET_KEY
   vercel env add STRIPE_ENV
   ```
   For development and testing you can set `STRIPE_ENV` to `test` (or leave it blank). Add `STRIPE_SECRET_KEY` later if you promote the project to production and want to use live mode.
4. Deploy with `vercel --prod` (or `vercel` for a preview deployment).
5. The deployed backend will expose the same routes as before (for example `POST /connection_token` and `POST /create_payment_intent`). Use the generated Vercel URL when configuring the example apps, then go to the [next steps](#next-steps) in this README.

### Running on Render

1. Set up a free [render account](https://dashboard.render.com/register).
2. Click the button below to deploy the example backend. You'll be prompted to enter a name for the Render service group as well as your Stripe API key.
3. Go to the [next steps](#next-steps) in this README for how to use this app

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/stripe/example-terminal-backend/)

### Running on Heroku

1. Set up a [Heroku account](https://signup.heroku.com).
2. Click the button below to deploy the example backend. You'll be prompted to enter a name for the Heroku application as well as your Stripe API key.
3. Go to the [next steps](#next-steps) in this README for how to use this app

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/stripe/example-terminal-backend)

---

## Next steps

Next, navigate to one of our example apps. Follow the instructions in the README to set up and run the app. You'll provide the URL of the example backend you just deployed.

| SDK | Example App |
|  :---  |  :---  |
| iOS | https://github.com/stripe/stripe-terminal-ios |
| JavaScript | https://github.com/stripe/stripe-terminal-js-demo |
| Android | https://github.com/stripe/stripe-terminal-android |




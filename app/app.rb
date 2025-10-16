require 'sinatra/base'
require 'sinatra/cross_origin'
require 'stripe'
require 'json'
require 'dotenv/load'

class StripeTerminalBackend < Sinatra::Base
  register Sinatra::CrossOrigin

  configure do
    enable :cross_origin

    Stripe.api_key = if ENV['STRIPE_ENV'] == 'production'
      ENV['STRIPE_SECRET_KEY']
    else
      ENV['STRIPE_TEST_SECRET_KEY']
    end
    Stripe.api_version = '2020-03-02'
  end

  before do
    response.headers['Access-Control-Allow-Origin'] = '*'
  end

  options '*' do
    response.headers['Allow'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept, X-User-Email, X-Auth-Token'
    response.headers['Access-Control-Allow-Origin'] = '*'
    200
  end

  helpers do
    def log_info(message)
      puts "\n#{message}\n\n"
      message
    end

    def validateApiKey
      if Stripe.api_key.nil? || Stripe.api_key.empty?
        return "Error: you provided an empty secret key. Please provide your test mode secret key. For more information, see https://stripe.com/docs/keys"
      end
      if Stripe.api_key.start_with?('pk')
        return "Error: you used a publishable key to set up the example backend. Please use your test mode secret key. For more information, see https://stripe.com/docs/keys"
      end
      if Stripe.api_key.start_with?('sk_live')
        return "Error: you used a live mode secret key to set up the example backend. Please use your test mode secret key. For more information, see https://stripe.com/docs/keys#test-live-modes"
      end

      nil
    end

    def lookupOrCreateExampleCustomer
      customerEmail = 'example@test.com'
      begin
        customerList = Stripe::Customer.list(email: customerEmail, limit: 1).data
        if customerList.length == 1
          customerList[0]
        else
          Stripe::Customer.create(email: customerEmail)
        end
      rescue Stripe::StripeError => e
        status 402
        return log_info("Error creating or retreiving customer! #{e.message}")
      end
    end
  end

  get '/' do
    status 200
    send_file File.expand_path('../index.html', __dir__)
  end

  post '/register_reader' do
    validationError = validateApiKey
    if !validationError.nil?
      status 400
      return log_info(validationError)
    end

    begin
      reader = Stripe::Terminal::Reader.create(
        registration_code: params[:registration_code],
        label: params[:label],
        location: params[:location]
      )
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error registering reader! #{e.message}")
    end

    log_info("Reader registered: #{reader.id}")

    status 200
    reader.to_json
  end

  post '/connection_token' do
    validationError = validateApiKey
    if !validationError.nil?
      status 400
      return log_info(validationError)
    end

    begin
      token = Stripe::Terminal::ConnectionToken.create
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error creating ConnectionToken! #{e.message}")
    end

    content_type :json
    status 200
    { secret: token.secret }.to_json
  end

  post '/create_payment_intent' do
    validationError = validateApiKey
    if !validationError.nil?
      status 400
      return log_info(validationError)
    end

    begin
      payment_intent = Stripe::PaymentIntent.create(
        payment_method_types: params[:payment_method_types] || ['card_present'],
        capture_method: params[:capture_method] || 'manual',
        amount: params[:amount],
        currency: params[:currency] || 'usd',
        description: params[:description] || 'Example PaymentIntent',
        payment_method_options: params[:payment_method_options] || [],
        receipt_email: params[:receipt_email]
      )
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error creating PaymentIntent! #{e.message}")
    end

    log_info("PaymentIntent successfully created: #{payment_intent.id}")
    status 200
    { intent: payment_intent.id, secret: payment_intent.client_secret }.to_json
  end

  post '/capture_payment_intent' do
    begin
      id = params['payment_intent_id']
      if !params['amount_to_capture'].nil?
        payment_intent = Stripe::PaymentIntent.capture(id, amount_to_capture: params['amount_to_capture'])
      else
        payment_intent = Stripe::PaymentIntent.capture(id)
      end
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error capturing PaymentIntent! #{e.message}")
    end

    log_info("PaymentIntent successfully captured: #{id}")
    status 200
    { intent: payment_intent.id, secret: payment_intent.client_secret }.to_json
  end

  post '/cancel_payment_intent' do
    begin
      id = params['payment_intent_id']
      payment_intent = Stripe::PaymentIntent.cancel(id)
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error canceling PaymentIntent! #{e.message}")
    end

    log_info("PaymentIntent successfully canceled: #{id}")
    status 200
    { intent: payment_intent.id, secret: payment_intent.client_secret }.to_json
  end

  post '/create_setup_intent' do
    validationError = validateApiKey
    if !validationError.nil?
      status 400
      return log_info(validationError)
    end

    begin
      setup_intent_params = {
        payment_method_types: params[:payment_method_types] || ['card_present']
      }

      setup_intent_params[:customer] = params[:customer] unless params[:customer].nil?
      setup_intent_params[:description] = params[:description] unless params[:description].nil?
      setup_intent_params[:on_behalf_of] = params[:on_behalf_of] unless params[:on_behalf_of].nil?

      setup_intent = Stripe::SetupIntent.create(setup_intent_params)
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error creating SetupIntent! #{e.message}")
    end

    log_info("SetupIntent successfully created: #{setup_intent.id}")
    status 200
    { intent: setup_intent.id, secret: setup_intent.client_secret }.to_json
  end

  post '/attach_payment_method_to_customer' do
    begin
      customer = lookupOrCreateExampleCustomer
      return customer if customer.is_a?(String)

      payment_method = Stripe::PaymentMethod.attach(
        params[:payment_method_id],
        {
          customer: customer.id,
          expand: ['customer']
        }
      )
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error attaching PaymentMethod to Customer! #{e.message}")
    end

    log_info("Attached PaymentMethod to Customer: #{customer.id}")

    status 200
    payment_method.to_json
  end

  post '/update_payment_intent' do
    payment_intent_id = params['payment_intent_id']
    if payment_intent_id.nil?
      status 400
      return log_info("'payment_intent_id' is a required parameter")
    end

    begin
      allowed_keys = ['receipt_email']
      update_params = params.select { |k, _| allowed_keys.include?(k) }

      payment_intent = Stripe::PaymentIntent.update(
        payment_intent_id,
        update_params
      )

      log_info("Updated PaymentIntent #{payment_intent_id}")
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error updating PaymentIntent #{payment_intent_id}. #{e.message}")
    end

    status 200
    { intent: payment_intent.id, secret: payment_intent.client_secret }.to_json
  end

  get '/list_locations' do
    validationError = validateApiKey
    if !validationError.nil?
      status 400
      return log_info(validationError)
    end

    begin
      locations = Stripe::Terminal::Location.list(
        limit: 100
      )
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error fetching Locations! #{e.message}")
    end

    log_info("#{locations.data.size} Locations successfully fetched")

    status 200
    content_type :json
    locations.data.to_json
  end

  post '/create_location' do
    validationError = validateApiKey
    if !validationError.nil?
      status 400
      return log_info(validationError)
    end

    begin
      location = Stripe::Terminal::Location.create(
        display_name: params[:display_name],
        address: params[:address]
      )
    rescue Stripe::StripeError => e
      status 402
      return log_info("Error creating Location! #{e.message}")
    end

    log_info("Location successfully created: #{location.id}")

    status 200
    content_type :json
    location.to_json
  end
end

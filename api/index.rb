require 'bundler/setup'
require 'rack'
require_relative '../app/app'

app = Rack::Builder.new do
  run StripeTerminalBackend
end.to_app

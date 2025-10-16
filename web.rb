require 'bundler/setup'
require_relative 'app/app'

StripeTerminalBackend.run! if $PROGRAM_NAME == __FILE__

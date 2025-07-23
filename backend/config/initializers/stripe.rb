Stripe.api_key = ENV.fetch('STRIPE_SECRET_KEY') { Rails.application.credentials.dig(:stripe, :secret_key) }
Stripe.api_version = '2023-10-16'

Rails.logger.info "[Stripe] Initialized with key: #{Stripe.api_key ? 'present' : 'missing'}"
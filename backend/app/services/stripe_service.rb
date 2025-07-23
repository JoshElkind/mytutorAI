class StripeService
  # Central helper for Stripe operations. All methods become no-ops when
  # ENV['STRIPE_ENABLED'] is anything other than 'true'. This lets us merge
  # Stripe code early without making live API calls until we flip the flag.

  class << self
    ###############################################
    # Creation helpers
    ###############################################

    # Stub for creating a checkout session (student pays tutor).
    # @param params [Hash] - fields required when live (amount, currency, etc.)
    # @return [Hash] with :id and :url keys.
    def create_checkout_session(params = {})
      return dummy_checkout_session unless stripe_enabled?

      # Live implementation placeholder – uncomment when enabling Stripe
      # session = Stripe::Checkout::Session.create(**params)
      # { id: session.id, url: session.url }
    end

    # Stub for creating / retrieving a connected account for a tutor
    # @param user [User]
    # @return [Stripe::Account, Hash] – account object or dummy hash in test
    def create_or_fetch_account(user)
      return dummy_account unless stripe_enabled?

      # Live implementation placeholder
      # return Stripe::Account.retrieve(user.stripe_account_id) if user.stripe_account_id.present?
      # acct = Stripe::Account.create({ type: 'express', email: user.email })
      # user.update!(stripe_account_id: acct.id)
      # acct
    end

    # Generates an onboarding link for a connected account so a tutor can
    # enter payout details.
    def create_account_link(account_id, refresh_url:, return_url:)
      return dummy_account_link unless stripe_enabled?
      # Live implementation placeholder
      # Stripe::AccountLink.create({ account: account_id, refresh_url:, return_url:, type: 'account_onboarding' })
    end

    ###############################################
    # Webhook handling
    ###############################################

    # Stub processor. In live mode you would pattern-match on event.type and
    # update database records accordingly.
    def handle_webhook_event(event)
      return if !stripe_enabled?
      Rails.logger.info("[StripeService] Received live webhook: #{event.type}")
      # case event.type
      # when 'checkout.session.completed'
      #   ...
      # when 'account.updated'
      #   ...
      # end
    end

    ###############################################
    private
    ###############################################

    def stripe_enabled?
      ENV.fetch('STRIPE_ENABLED', 'true') == 'true'
    end

    # --- Dummy helpers so the UI can work in disabled mode ---
    def dummy_checkout_session
      {
        id: 'cs_test_dummy',
        url: ENV.fetch('STRIPE_DEMO_CHECKOUT_URL', 'https://checkout.stripe.com/c/pay/test_dummy')
      }
    end

    def dummy_account
      { id: 'acct_dummy' }
    end

    def dummy_account_link
      {
        url: ENV.fetch('STRIPE_DEMO_ONBOARD_URL', 'https://connect.stripe.com/setup/s/test_dummy')
      }
    end
  end
end 
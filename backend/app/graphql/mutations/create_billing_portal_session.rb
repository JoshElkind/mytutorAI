module Mutations
  class CreateBillingPortalSession < GraphQL::Schema::Mutation
    description 'Create a Stripe Billing Portal session so the user can manage payment methods and billing.'

    field :url, String, null: true, description: 'The URL to redirect the user to the Stripe Billing Portal.'
    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve
      user = context[:current_user]
      unless user
        return { url: nil, success: false, errors: ['User not authenticated'] }
      end

      # If Stripe integration is disabled (e.g., during UI-only testing), return a static demo portal link
      unless ENV.fetch('STRIPE_ENABLED', 'true') == 'true'
        demo_url = ENV.fetch('STRIPE_DEMO_PORTAL_URL', 'https://billing.stripe.com/p/login/test_7sYdR8bEL0sIcOo83x6c000')
        return { url: demo_url, success: true, errors: [] }
      end

      begin
        # Ensure the user has a Stripe customer
        if user.stripe_customer_id.blank?
          customer = Stripe::Customer.create({
            email: user.email,
            name: user.name
          })
          user.update!(stripe_customer_id: customer.id)
        end

        portal_session = Stripe::BillingPortal::Session.create({
          customer: user.stripe_customer_id,
          return_url: ENV.fetch('FRONTEND_URL', 'http://localhost:4200/appearance')
        })

        {
          url: portal_session.url,
          success: true,
          errors: []
        }
      rescue => e
        Rails.logger.error "[CreateBillingPortalSession] Stripe error: #{e.message}"
        { url: nil, success: false, errors: [e.message] }
      end
    end
  end
end 
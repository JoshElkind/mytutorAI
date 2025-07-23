class StripeWebhooksController < ActionController::API
  skip_before_action :verify_authenticity_token

  def create
    payload = request.body.read
    signature = request.env['HTTP_STRIPE_SIGNATURE']

    unless stripe_enabled?
      Rails.logger.info '[StripeWebhook] Stripe disabled, ignoring event.'
      head :ok and return
    end

    begin
      event = Stripe::Webhook.construct_event(
        payload,
        signature,
        stripe_endpoint_secret
      )
    rescue JSON::ParserError, Stripe::SignatureVerificationError => e
      Rails.logger.error "[StripeWebhook] Webhook error: #{e.message}"
      return head :bad_request
    end

    StripeService.handle_webhook_event(event)

    head :ok
  end

  private

  def stripe_enabled?
    ENV.fetch('STRIPE_ENABLED', 'true') == 'true'
  end

  def stripe_endpoint_secret
    ENV.fetch('STRIPE_WEBHOOK_SECRET') { Rails.application.credentials.dig(:stripe, :webhook_secret) }
  end
end 
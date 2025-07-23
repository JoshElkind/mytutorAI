Rails.application.routes.draw do
  post "/graphql", to: "graphql#execute"
  
  # PDF preview route
  get "pdf_preview/:filename", to: "pdf_preview#show"
  
  # Stripe webhooks (no-op when STRIPE_ENABLED=false)
  post 'stripe/webhook', to: 'stripe_webhooks#create'
  

  get "up" => "rails/health#show", as: :rails_health_check

  # root "posts#index"

  namespace :api do
    post 'transcripts/upload', to: 'transcripts#upload'
    post 'meeting-feedback/summary', to: 'meeting_feedback#summary'
  end
end

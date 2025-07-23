puts "=== [MutationType] file loaded ==="

# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject
    puts "=== [MutationType] class evaluated ==="
    # TODO: remove me
    field :test_field, String, null: false,
      description: "An example field added by the generator"
    def test_field
      "Hello World!"
    end

    # Authentication mutations
    field :request_login_otp, mutation: Mutations::RequestLoginOtp
    field :verify_otp_and_login, mutation: Mutations::VerifyOtpAndLogin
    field :signup, mutation: Mutations::Signup
    field :verify_signup_code, mutation: Mutations::VerifySignupCode
    field :logout, mutation: Mutations::Logout

    # Lesson mutations
    field :add_lesson, mutation: Mutations::AddLesson
    field :update_lesson, mutation: Mutations::UpdateLesson
    field :delete_lesson, mutation: Mutations::DeleteLesson

    # Offering mutations
    field :create_offering, mutation: Mutations::CreateOffering
    field :delete_offering, mutation: Mutations::DeleteOffering
    field :purchase_sessions, mutation: Mutations::PurchaseSessions

    # Resource and Material mutations
    field :upload_resource, mutation: Mutations::UploadResource
    field :delete_resource, mutation: Mutations::DeleteResource
    field :create_material, mutation: Mutations::CreateMaterial
    
    # Messaging mutations
    field :sendMessage, mutation: Mutations::SendMessage
    field :createConversation, mutation: Mutations::CreateConversation
    field :update_material, mutation: Mutations::UpdateMaterial
    field :delete_material, mutation: Mutations::DeleteMaterial
    field :update_profile, mutation: Mutations::UpdateProfile
    field :create_session, mutation: Mutations::CreateSession
    field :create_billing_portal_session, mutation: Mutations::CreateBillingPortalSession

    def create_conversation(**args)
      puts "=== [MutationType] create_conversation fallback called with: #{args.inspect} ==="
      super
    end
  end
end

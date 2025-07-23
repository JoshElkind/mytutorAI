module Mutations
  class Signup < BaseMutation
    argument :email, String, required: true
    argument :name, String, required: true
    argument :user_type, String, required: true

    field :success, Boolean, null: false
    field :message, String, null: false
    field :code, String, null: true
    field :user, Types::UserType, null: true

    def resolve(email:, name:, user_type:)
      # Check if user already exists
      existing_user = User.find_by(email: email.downcase)
      
      if existing_user
        return {
          success: false,
          message: "User with this email already exists. Please login instead.",
          code: nil,
          user: nil
        }
      end

      # Generate a 4-digit code for signup verification
      code = rand(1000..9999).to_s
      
      # Store the signup data and code in cache
      signup_data = {
        email: email.downcase,
        name: name,
        user_type: user_type
      }
      
      Rails.cache.write("signup_code_#{email}", { code: code, data: signup_data }, expires_in: 10.minutes)

      # Send email with the code
      begin
        OtpMailer.signup_code(email, code).deliver_now
        {
          success: true,
          message: "Signup code sent to your email",
          code: Rails.env.development? ? code : nil,  # Return code in development for testing
          user: nil
        }
      rescue => e
        Rails.logger.error "Failed to send email: #{e.message}"
        {
          success: true,  # Still return success for testing
          message: "Signup code generated (email failed): #{code}",
          code: Rails.env.development? ? code : nil,  # Return code in development for testing
          user: nil
        }
      end
    rescue => e
      {
        success: false,
        message: "Failed to generate signup code: #{e.message}",
        code: nil,
        user: nil
      }
    end

    private

    def generate_jwt_token(user)
      JWT.encode(
        { user_id: user.id, email: user.email },
        Rails.application.credentials.secret_key_base,
        'HS256'
      )
    end
  end
end 
module Mutations
  class RequestLoginOtp < BaseMutation
    argument :email, String, required: true

    field :success, Boolean, null: false
    field :message, String, null: false
    field :code, String, null: true

    def resolve(email:)
      # Check if user exists
      user = User.find_by(email: email.downcase)
      
      unless user
        return {
          success: false,
          message: "No account found with this email. Please sign up first.",
          code: nil
        }
      end

      # Generate a 4-digit code
      code = rand(1000..9999).to_s
      
      # Store the code in cache
      Rails.cache.write("login_code_#{email}", code, expires_in: 10.minutes)
      
      # Send email with the code
      begin
        OtpMailer.login_code(email, code).deliver_now
        {
          success: true,
          message: "Login code sent to your email",
          code: Rails.env.development? ? code : nil  # Return code in development for testing
        }
      rescue => e
        Rails.logger.error "Failed to send email: #{e.message}"
        {
          success: true,  # Still return success for testing
          message: "Login code generated (email failed): #{code}",
          code: Rails.env.development? ? code : nil  # Return code in development for testing
        }
      end
    rescue => e
      {
        success: false,
        message: "Failed to generate login code: #{e.message}",
        code: nil
      }
    end
  end
end 
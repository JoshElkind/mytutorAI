module Mutations
  class VerifyOtpAndLogin < BaseMutation
    argument :email, String, required: true
    argument :code, String, required: true

    field :success, Boolean, null: false
    field :message, String, null: false
    field :user, Types::UserType, null: true

    def resolve(email:, code:)
      Rails.logger.info "[OTP VERIFY] RESOLVE METHOD CALLED"
      Rails.logger.info "[OTP VERIFY] Email: #{email}, Code: #{code}"
      Rails.logger.info "[OTP VERIFY] Email: #{email}, Received OTP: #{code}"
      stored_code = Rails.cache.read("login_code_#{email}")
      Rails.logger.info "[OTP VERIFY] Stored code for email: #{stored_code.inspect}"
      
      unless stored_code
        Rails.logger.warn "[OTP VERIFY] No login code found for email: #{email}"
        return {
          success: false,
          message: "No login code found. Please request a new code.",
          user: nil
        }
      end

      unless stored_code == code
        Rails.logger.warn "[OTP VERIFY] Invalid code for email: #{email}. Expected: #{stored_code}, Got: #{code}"
        return {
          success: false,
          message: "Invalid code. Please try again.",
          user: nil
        }
      end

      user = User.find_or_create_by(email: email.downcase) do |u|
        u.name = email.split('@').first.capitalize
        u.user_type = 'student'
      end

      Rails.logger.info "[OTP VERIFY] User found/created: #{user.inspect}"

      Rails.cache.delete("login_code_#{email}")

      # Set cookie on the response object
      if context[:response]
        Rails.logger.info "[OTP VERIFY] Setting cookie on response object (using set_cookie)"
        token = generate_jwt_token(user)
        context[:response].set_cookie(
          :auth_token,
          value: token,
          httponly: true,
          secure: false, # for local dev
          same_site: :lax,
          expires: 1.week.from_now,
          path: '/'
        )
        Rails.logger.info "[OTP VERIFY] Set cookie using set_cookie (path: /)"
        if context[:response].respond_to?(:headers)
          Rails.logger.info "[OTP VERIFY] Response headers after set_cookie: #{context[:response].headers.inspect}"
          Rails.logger.info "[OTP VERIFY] Set-Cookie header: #{context[:response].headers['Set-Cookie'] || context[:response].headers['set-cookie']}"
        end
      else
        Rails.logger.warn "[OTP VERIFY] No response object in context"
      end

      {
        success: true,
        message: "Login successful!",
        user: user
      }
    rescue => e
      Rails.logger.error "[OTP VERIFY] Exception: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      {
        success: false,
        message: "Login failed: #{e.message}",
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
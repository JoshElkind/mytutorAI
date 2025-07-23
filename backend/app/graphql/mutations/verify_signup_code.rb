module Mutations
  class VerifySignupCode < BaseMutation
    argument :email, String, required: true
    argument :code, String, required: true

    field :success, Boolean, null: false
    field :message, String, null: false
    field :user, Types::UserType, null: true

    def resolve(email:, code:)
      # Get the stored signup data and code
      cached_data = Rails.cache.read("signup_code_#{email}")
      
      unless cached_data
        return {
          success: false,
          message: "No signup code found. Please request a new code.",
          user: nil
        }
      end

      unless cached_data[:code] == code
        return {
          success: false,
          message: "Invalid code. Please try again.",
          user: nil
        }
      end

      user = User.create!(
        email: cached_data[:data][:email],
        name: cached_data[:data][:name],
        user_type: cached_data[:data][:user_type]
      )

      # Clear the used signup code
      Rails.cache.delete("signup_code_#{email}")

      # Set authentication cookie
      if context[:response]
        Rails.logger.info "[SIGNUP VERIFY] Setting cookie on response object (using set_cookie)"
        token = generate_jwt_token(user)
        context[:response].set_cookie(
          :auth_token,
          value: token,
          httponly: true,
          secure: Rails.env.production?,
          same_site: :lax,
          expires: 1.week.from_now,
          path: '/'
        )
        Rails.logger.info "[SIGNUP VERIFY] Set cookie using set_cookie (path: /)"
        if context[:response].respond_to?(:headers)
          Rails.logger.info "[SIGNUP VERIFY] Response headers after set_cookie: #{context[:response].headers.inspect}"
          Rails.logger.info "[SIGNUP VERIFY] Set-Cookie header: #{context[:response].headers['Set-Cookie'] || context[:response].headers['set-cookie']}"
        end
      else
        Rails.logger.warn "[SIGNUP VERIFY] No response object in context"
      end

      {
        success: true,
        message: "Account created and logged in successfully!",
        user: user
      }
    rescue => e
      {
        success: false,
        message: "Failed to create account: #{e.message}",
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
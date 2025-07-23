module Mutations
  class Logout < BaseMutation
    field :success, Boolean, null: false

    def resolve
      # Clear the HTTP-only cookie
      if context[:response]
        Rails.logger.info '[LOGOUT] Deleting auth_token cookie using set_cookie (expires in past)'
        context[:response].set_cookie(
          :auth_token,
          value: '',
          httponly: true,
          secure: Rails.env.production?,
          same_site: :lax,
          expires: 1.day.ago,
          path: '/'
        )
        if context[:response].respond_to?(:headers)
          Rails.logger.info "[LOGOUT] Response headers after set_cookie: #{context[:response].headers.inspect}"
          Rails.logger.info "[LOGOUT] Set-Cookie header: #{context[:response].headers['Set-Cookie'] || context[:response].headers['set-cookie']}"
        end
      else
        Rails.logger.warn '[LOGOUT] No response object in context'
      end

      {
        success: true
      }
    end
  end
end 
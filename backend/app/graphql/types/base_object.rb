# frozen_string_literal: true

module Types
  class BaseObject < GraphQL::Schema::Object
    edge_type_class(Types::BaseEdge)
    connection_type_class(Types::BaseConnection)
    field_class Types::BaseField

    def current_user
      @current_user ||= get_current_user_from_token
    end

    private

    def get_current_user_from_token
      # Check if we have a request context
      unless context[:request]
        Rails.logger.warn '[SESSION] No request context in GraphQL.'
        return nil
      end
      token = context[:request].cookies[:auth_token]
      if token.nil?
        Rails.logger.warn '[SESSION] No auth_token cookie found.'
        return nil
      else
        Rails.logger.info "[SESSION] Found auth_token cookie: #{token[0..10]}..."
      end
      begin
        decoded_token = JWT.decode(token, Rails.application.secrets.secret_key_base, true, { algorithm: 'HS256' })
        user_id = decoded_token[0]['user_id']
        Rails.logger.info "[SESSION] Decoded user_id: #{user_id}"
        User.find(user_id)
      rescue JWT::DecodeError => e
        Rails.logger.error "[SESSION] JWT decode error: #{e.message}"
        nil
      rescue ActiveRecord::RecordNotFound => e
        Rails.logger.error "[SESSION] User not found: #{e.message}"
        nil
      rescue => e
        Rails.logger.error "[SESSION] Unknown error: #{e.class} - #{e.message}"
        nil
      end
    end
  end
end

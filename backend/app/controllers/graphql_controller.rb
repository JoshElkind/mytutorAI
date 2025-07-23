# frozen_string_literal: true

class GraphqlController < ActionController::API
  if Rails.env.development?
    skip_before_action :set_current_tenant, raise: false
  end

  def execute
    variables = prepare_variables(params[:variables])
    query = params[:query]
    operation_name = params[:operationName]
    
    context = {
      current_user: current_user,
      request: request,
      response: response
    }
    
    result = BackendSchema.execute(query, variables: variables, context: context, operation_name: operation_name)
    
    render json: result
  rescue StandardError => e
    Rails.logger.error "[GRAPHQL] Error during execution: #{e.class} - #{e.message}"
    Rails.logger.error "[GRAPHQL] Backtrace: #{e.backtrace.join("\n")}"
    raise e unless Rails.env.development?
    handle_error_in_development(e)
  end

  private

  # Handle variables in form data, JSON body, or a blank value
  def prepare_variables(variables_param)
    case variables_param
    when String
      if variables_param.present?
        JSON.parse(variables_param) || {}
      else
        {}
      end
    when Hash
      variables_param
    when ActionController::Parameters
      variables_param.to_unsafe_hash # GraphQL-Ruby will validate name and type of incoming variables.
    when nil
      {}
    else
      raise ArgumentError, "Unexpected parameter: #{variables_param}"
    end
  end

  def handle_error_in_development(e)
    logger.error e.message
    logger.error e.backtrace.join("\n")

    render json: { errors: [{ message: e.message, backtrace: e.backtrace }], data: {} }, status: 500
  end

  def current_user
    # @current_user ||= super || User.find_by(id: session[:user_id]) if session[:user_id]
    # token = request.headers['Authorization']&.gsub('Bearer ', '')
    # return nil unless token
    # begin
    #   decoded_token = JWT.decode(token, Rails.application.credentials.secret_key_base, true, { algorithm: 'HS256' })
    #   user_id = decoded_token[0]['user_id']
    #   User.find(user_id)
    # rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    #   nil
    # end
    get_current_user_from_token
  end

  def get_current_user_from_token
    # Check if we have a request context
    unless request
      Rails.logger.warn '[SESSION] No request context in GraphQL.'
      return nil
    end
    
    # Debug: Log all cookies received
    Rails.logger.info "[SESSION] All cookies received: #{request.cookies.inspect}"
    
    token = request.cookies["auth_token"]
    if token.nil?
      Rails.logger.warn '[SESSION] No auth_token cookie found.'
      return nil
    else
      Rails.logger.info "[SESSION] Found auth_token cookie: #{token[0..10]}..."
    end
    begin
      decoded_token = JWT.decode(token, Rails.application.credentials.secret_key_base, true, { algorithm: 'HS256' })
      user_id = decoded_token[0]['user_id']
      Rails.logger.info "[SESSION] Decoded user_id: #{user_id}"
      user = User.find(user_id)
      Rails.logger.info "[SESSION] Found user: #{user.email}"
      user
    rescue JWT::DecodeError => e
      Rails.logger.error "[SESSION] JWT decode error: #{e.message}"
      nil
    rescue ActiveRecord::RecordNotFound => e
      Rails.logger.error "[SESSION] User not found: #{e.message}"
      nil
    rescue => e
      Rails.logger.error "[SESSION] Unexpected error: #{e.class} - #{e.message}"
      nil
    end
  end
end

module Mutations
  class SendMessage < GraphQL::Schema::Mutation
    argument :receiver_id, ID, required: true
    argument :content, String, required: true

    field :message, Types::MessageType, null: true
    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(receiver_id:, content:)
      user = context[:current_user]
      unless user
        return {
          message: nil,
          success: false,
          errors: ['User not authenticated']
        }
      end

      begin
        message = MessageService.send_message(user.id, receiver_id, content)
        
        {
          message: message,
          success: true,
          errors: []
        }
      rescue => e
        Rails.logger.error "Failed to send message: #{e.message}"
        {
          message: nil,
          success: false,
          errors: [e.message]
        }
      end
    end
  end
end 
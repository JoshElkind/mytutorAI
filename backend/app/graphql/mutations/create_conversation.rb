ConversationStruct = Struct.new(
  :user_id, :name, :email, :profile_image_url, :last_message, :last_message_time, :unread_count, :is_online,
  keyword_init: true
)

module Mutations
  class CreateConversation < GraphQL::Schema::Mutation
    # Accept camelCase from frontend, map to snake_case
    argument :otherUserId, ID, required: true, as: :other_user_id

    field :conversation, Types::ConversationType, null: true
    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(other_user_id:)
      user = context[:current_user]
      unless user
        return { conversation: nil, success: false, errors: ['User not authenticated'] }
      end

      other_user = User.find_by(id: other_user_id)
      unless other_user
        return { conversation: nil, success: false, errors: ['Other user not found'] }
      end

      # Check if any messages exist between the users
      existing_messages = Message.between_users(user.id, other_user.id)
      if existing_messages.exists?
        conversation = MessageService.get_conversations(user).find { |c| c[:user_id] == other_user.id.to_s }
        if conversation
          snake = {
            user_id: conversation[:user_id],
            name: conversation[:name],
            email: conversation[:email],
            profile_image_url: conversation[:profile_image_url],
            last_message: conversation[:last_message],
            last_message_time: conversation[:last_message_time],
            unread_count: conversation[:unread_count],
            is_online: conversation[:is_online]
          }
          return { conversation: ConversationStruct.new(**snake), success: true, errors: [] }
        else
          return { conversation: nil, success: false, errors: ['Conversation not found'] }
        end
      end

      # No conversation exists, create a placeholder message (empty content, not visible in UI)
      placeholder = Message.create!(sender: user, receiver: other_user, content: '[conversation started]', read: true)
      MessageService.invalidate_conversation_caches(user.id, other_user.id)
      Rails.cache.delete("conversations:#{user.id}") if defined?(Rails.cache)
      conversations = MessageService.get_conversations(user)
      conversation = conversations.find { |c| c[:user_id].to_s == other_user.id.to_s }
      if conversation
        snake = {
          user_id: conversation[:user_id],
          name: conversation[:name],
          email: conversation[:email],
          profile_image_url: conversation[:profile_image_url],
          last_message: conversation[:last_message],
          last_message_time: conversation[:last_message_time],
          unread_count: conversation[:unread_count],
          is_online: conversation[:is_online]
        }
        return { conversation: ConversationStruct.new(**snake), success: true, errors: [] }
      else
        return { conversation: nil, success: false, errors: ['Conversation not found after creation'] }
      end
    rescue => e
      return { conversation: nil, success: false, errors: [e.message] }
    end
  end
end 
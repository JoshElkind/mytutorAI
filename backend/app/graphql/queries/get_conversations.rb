module Queries
  class GetConversations < Queries::BaseQuery
    type [Types::ConversationType], null: false

    def resolve
      user = context[:current_user]
      unless user
        return []
      end

      MessageService.get_conversations(user)
    end
  end
end 
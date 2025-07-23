module Queries
  class GetMessages < Queries::BaseQuery
    argument :other_user_id, ID, required: true
    argument :limit, Integer, required: false, default_value: 50
    
    type [Types::MessageType], null: false

    def resolve(other_user_id:, limit:)
      user = context[:current_user]
      unless user
        return []
      end

      MessageService.get_messages(user.id, other_user_id, limit: limit)
    end
  end
end 
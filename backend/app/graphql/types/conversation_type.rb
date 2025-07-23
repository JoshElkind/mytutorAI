# frozen_string_literal: true

module Types
  class ConversationType < Types::BaseObject
    field :userId, ID, null: false, method: :user_id
    field :name, String, null: false
    field :email, String, null: false
    field :profileImageUrl, String, null: true, method: :profile_image_url
    field :lastMessage, String, null: true, method: :last_message
    field :lastMessageTime, GraphQL::Types::ISO8601DateTime, null: true, method: :last_message_time
    field :unreadCount, Integer, null: false, method: :unread_count
    field :isOnline, Boolean, null: false, method: :is_online
  end
end 
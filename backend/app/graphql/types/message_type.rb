# frozen_string_literal: true

module Types
  class MessageType < Types::BaseObject
    field :id, ID, null: false
    field :content, String, null: false
    field :read, Boolean, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :sender, Types::UserBriefType, null: false
    field :receiver, Types::UserBriefType, null: false

    def sender
      object.sender
    end

    def receiver
      object.receiver
    end
  end
end 
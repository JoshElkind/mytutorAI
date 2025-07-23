# frozen_string_literal: true

module Types
  class UserBriefType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
  end
end 
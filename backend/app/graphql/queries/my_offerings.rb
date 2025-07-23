module Queries
  class MyOfferings < Queries::BaseQuery
    type [Types::OfferingType], null: false

    def resolve
      Offering.where(tutor_id: context[:current_user].id)
    end
  end
end 
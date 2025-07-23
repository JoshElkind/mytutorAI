module Queries
  class AllOfferings < Queries::BaseQuery
    type [Types::OfferingType], null: false

    def resolve
      Offering.all
    end
  end
end 
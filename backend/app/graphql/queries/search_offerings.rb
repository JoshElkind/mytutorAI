module Queries
  class SearchOfferings < Queries::BaseQuery
    argument :search_term, String, required: false
    argument :filters, Types::OfferingFiltersInput, required: false
    
    type [Types::OfferingType], null: false

    def resolve(search_term: nil, filters: nil)
      # Check if user is authenticated
      user = context[:current_user]
      unless user
        return []
      end

      filter_hash = filters ? filters.to_h : {}
      
      offerings = SearchService.search_offerings(
        search_term: search_term,
        filters: filter_hash
      )

      AsyncSearchEventJob.perform_later(
        user.id,
        search_term,
        filter_hash,
        offerings.count
      )

      offerings
    end
  end
end 
module Queries
  class PopularOfferings < Queries::BaseQuery
    argument :limit, Integer, required: false, default_value: 10
    
    type [Types::OfferingType], null: false

    def resolve(limit: 10)
      # Check if user is authenticated
      user = context[:current_user]
      unless user
        return []
      end

      cached_results = CacheService.get_cached_popular_offerings
      if cached_results
        Rails.logger.info "Returning cached popular offerings"
        return cached_results.first(limit)
      end

      offerings = SearchService.get_popular_offerings(limit: limit)

      CacheService.cache_popular_offerings(offerings)

      offerings
    end
  end
end 
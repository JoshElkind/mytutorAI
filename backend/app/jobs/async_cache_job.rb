class AsyncCacheJob < ApplicationJob
  queue_as :default

  def perform(search_term, filters, results)
    return unless $redis

    begin
      cache_key = SearchService.generate_search_cache_key(search_term, filters)
      
      # Handle both ActiveRecord objects and hashes
      serialized_results = if results.first.is_a?(Hash)
        results
      else
        results.map(&:as_json)
      end
      
      $redis.setex(cache_key, SearchService::CACHE_TTL, serialized_results.to_json)
      Rails.logger.info "Async cached search results for: #{search_term}"
    rescue => e
      Rails.logger.error "Failed to async cache search results: #{e.message}"
    end
  end
end 
class AsyncCachePopularJob < ApplicationJob
  queue_as :default

  def perform(limit, offerings)
    return unless $redis

    begin
      cache_key = "popular_offerings:#{limit}"
      
      # Handle both ActiveRecord objects and hashes
      serialized_offerings = if offerings.first.is_a?(Hash)
        offerings
      else
        offerings.map(&:as_json)
      end
      
      $redis.setex(cache_key, SearchService::CACHE_TTL, serialized_offerings.to_json)
      Rails.logger.info "Cached popular offerings (limit: #{limit})"
    rescue => e
      Rails.logger.error "Failed to cache popular offerings: #{e.message}"
    end
  end
end 
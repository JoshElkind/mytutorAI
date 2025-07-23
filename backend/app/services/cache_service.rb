class CacheService
  CACHE_TTL = 1.hour

  # Cache popular offerings
  def self.cache_popular_offerings(offerings)
    return unless $redis

    begin
      cache_key = 'popular_offerings'
      $redis.setex(cache_key, CACHE_TTL, offerings.to_json)
      Rails.logger.info "Cached popular offerings"
    rescue => e
      Rails.logger.error "Failed to cache popular offerings: #{e.message}"
    end
  end

  def self.get_cached_popular_offerings
    return nil unless $redis

    begin
      cache_key = 'popular_offerings'
      cached_data = $redis.get(cache_key)
      return JSON.parse(cached_data) if cached_data
    rescue => e
      Rails.logger.error "Failed to get cached popular offerings: #{e.message}"
    end
    
    nil
  end

  # Cache search results
  def self.cache_search_results(search_term, filters, results)
    return unless $redis

    begin
      cache_key = generate_search_cache_key(search_term, filters)
      $redis.setex(cache_key, CACHE_TTL, results.to_json)
      Rails.logger.info "Cached search results for: #{search_term}"
    rescue => e
      Rails.logger.error "Failed to cache search results: #{e.message}"
    end
  end

  def self.get_cached_search_results(search_term, filters)
    return nil unless $redis

    begin
      cache_key = generate_search_cache_key(search_term, filters)
      cached_data = $redis.get(cache_key)
      return JSON.parse(cached_data) if cached_data
    rescue => e
      Rails.logger.error "Failed to get cached search results: #{e.message}"
    end
    
    nil
  end

  # Cache individual offering
  def self.cache_offering(offering)
    return unless $redis

    begin
      cache_key = "offering:#{offering.id}"
      $redis.setex(cache_key, CACHE_TTL, offering.to_json)
      Rails.logger.info "Cached offering: #{offering.id}"
    rescue => e
      Rails.logger.error "Failed to cache offering #{offering.id}: #{e.message}"
    end
  end

  def self.get_cached_offering(offering_id)
    return nil unless $redis

    begin
      cache_key = "offering:#{offering_id}"
      cached_data = $redis.get(cache_key)
      return JSON.parse(cached_data) if cached_data
    rescue => e
      Rails.logger.error "Failed to get cached offering #{offering_id}: #{e.message}"
    end
    
    nil
  end

  # Invalidate cache when offering is updated/deleted
  def self.invalidate_offering_cache(offering_id)
    return unless $redis

    begin
      cache_key = "offering:#{offering_id}"
      $redis.del(cache_key)
      
      # Also invalidate search caches
      invalidate_search_caches
      
      Rails.logger.info "Invalidated cache for offering: #{offering_id}"
    rescue => e
      Rails.logger.error "Failed to invalidate cache for offering #{offering_id}: #{e.message}"
    end
  end

  def self.invalidate_search_caches
    return unless $redis

    begin
      # Get all search cache keys
      search_keys = $redis.keys('search:*')
      $redis.del(*search_keys) if search_keys.any?
      
      # Also invalidate popular offerings cache
      $redis.del('popular_offerings')
      
      Rails.logger.info "Invalidated search caches"
    rescue => e
      Rails.logger.error "Failed to invalidate search caches: #{e.message}"
    end
  end

  # Cache user session data
  def self.cache_user_session(user_id, session_data)
    return unless $redis

    begin
      cache_key = "user_session:#{user_id}"
      $redis.setex(cache_key, 24.hours, session_data.to_json)
    rescue => e
      Rails.logger.error "Failed to cache user session: #{e.message}"
    end
  end

  def self.get_cached_user_session(user_id)
    return nil unless $redis

    begin
      cache_key = "user_session:#{user_id}"
      cached_data = $redis.get(cache_key)
      return JSON.parse(cached_data) if cached_data
    rescue => e
      Rails.logger.error "Failed to get cached user session: #{e.message}"
    end
    
    nil
  end

  # Cache search analytics
  def self.cache_search_analytics(search_term, result_count)
    return unless $redis

    begin
      cache_key = "search_analytics:#{search_term}"
      current_count = $redis.get(cache_key) || 0
      $redis.setex(cache_key, 1.day, current_count.to_i + result_count)
    rescue => e
      Rails.logger.error "Failed to cache search analytics: #{e.message}"
    end
  end

  private

  def self.generate_search_cache_key(search_term, filters)
    search_hash = Digest::MD5.hexdigest("#{search_term}#{filters.to_json}")
    "search:#{search_hash}"
  end
end 
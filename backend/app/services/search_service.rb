class SearchService
  CACHE_TTL = 30.minutes
  BATCH_SIZE = 50

  def self.search_offerings(search_term: nil, filters: {})
    # Try Redis cache first
    cached_results = get_cached_search_results(search_term, filters)
    return cached_results if cached_results

    # Use Elasticsearch if available, otherwise fallback to database
    if $elasticsearch
      elasticsearch_search(search_term, filters)
    else
      database_search(search_term, filters)
    end
  end

  def self.elasticsearch_search(search_term, filters)
    query = build_search_query(search_term, filters)
    
    begin
      response = $elasticsearch.search(
        index: 'offerings',
        body: {
          query: query,
          sort: [
            { '_score' => { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ],
          size: 100,
          _source: ['id', 'tutor_id', 'lesson_id', 'price', 'duration', 'max_students', 'enrolled_count']
        }
      )

      offering_ids = response['hits']['hits'].map { |hit| hit['_source']['id'] }
      Rails.logger.info "[SearchService] Elasticsearch found #{offering_ids.length} offerings: #{offering_ids.inspect}"
      
      # Batch fetch with eager loading
      offerings = batch_fetch_offerings(offering_ids)
      Rails.logger.info "[SearchService] Elasticsearch batch fetched offerings: #{offerings.map(&:id).inspect}"
      
      # Cache results asynchronously
      AsyncCacheJob.perform_later(search_term, filters, offerings)
      
      offerings
    rescue => e
      Rails.logger.error "Elasticsearch search failed: #{e.message}"
      database_search(search_term, filters)
    end
  end

  def self.database_search(search_term, filters)
    offerings = Offering.includes(:tutor, :lesson)
    
    # Apply filters
    offerings = apply_search_term(offerings, search_term) if search_term.present?
    offerings = apply_filters(offerings, filters)
    
    # Order by recency (enrolled_count is calculated, not a column)
    offerings = offerings.order(created_at: :desc).limit(100)
    Rails.logger.info "[SearchService] DB found #{offerings.length} offerings: #{offerings.map(&:id).inspect}"
    
    # Cache results asynchronously
    AsyncCacheJob.perform_later(search_term, filters, offerings.to_a)
    
    offerings
  end

  def self.batch_fetch_offerings(offering_ids)
    return [] if offering_ids.empty?
    
    # Fetch in batches to avoid memory issues
    offerings = []
    offering_ids.each_slice(BATCH_SIZE) do |batch_ids|
      batch_offerings = Offering.includes(:tutor, :lesson)
                                .where(id: batch_ids)
                                .to_a
      offerings.concat(batch_offerings)
    end
    
    # Maintain search result order
    offerings_by_id = offerings.index_by(&:id)
    offering_ids.map { |id| offerings_by_id[id] }.compact
  end

  def self.apply_search_term(offerings, search_term)
    search_term = "%#{search_term}%"
    offerings.joins(:lesson, :tutor)
             .where(
               "lessons.name ILIKE ? OR lessons.subject ILIKE ? OR tutors.name ILIKE ? OR lessons.description ILIKE ?",
               search_term, search_term, search_term, search_term
             )
  end

  def self.apply_filters(offerings, filters)
    offerings = apply_subject_filter(offerings, filters[:subject]) if filters[:subject].present?
    offerings = apply_age_group_filter(offerings, filters[:age_group]) if filters[:age_group].present?
    offerings = apply_price_filter(offerings, filters[:price_range]) if filters[:price_range].present?
    offerings = apply_duration_filter(offerings, filters[:duration]) if filters[:duration].present?
    offerings
  end

  def self.apply_subject_filter(offerings, subject)
    offerings.joins(:lesson).where(lessons: { subject: subject })
  end

  def self.apply_age_group_filter(offerings, age_group)
    offerings.joins(:lesson).where(lessons: { age_group: age_group })
  end

  def self.apply_price_filter(offerings, price_range)
    case price_range
    when 'Free'
      offerings.where(price: 0)
    when 'Under $20'
      offerings.where('price < ?', 20)
    when '$20-$50'
      offerings.where(price: 20..50)
    when '$50-$100'
      offerings.where(price: 50..100)
    when 'Over $100'
      offerings.where('price > ?', 100)
    else
      offerings
    end
  end

  def self.apply_duration_filter(offerings, duration)
    case duration
    when '30 minutes'
      offerings.where(duration: 30)
    when '60 minutes'
      offerings.where(duration: 60)
    when '90 minutes'
      offerings.where(duration: 90)
    when '120+ minutes'
      offerings.where('duration >= ?', 120)
    else
      offerings
    end
  end

  def self.get_cached_search_results(search_term, filters)
    return nil unless $redis

    begin
      cache_key = generate_search_cache_key(search_term, filters)
      cached_data = $redis.get(cache_key)
      
      if cached_data
        Rails.logger.info "Cache hit for search: #{search_term}"
        cached_hashes = JSON.parse(cached_data)
        
        # Convert cached hashes back to Offering objects
        offering_ids = cached_hashes.map { |h| h['id'] }
        offerings = Offering.includes(:tutor, :lesson).where(id: offering_ids)
        
        # Preserve order as in cache
        offerings_by_id = offerings.index_by(&:id)
        ordered_offerings = offering_ids.map { |id| offerings_by_id[id] }.compact
        
        return ordered_offerings
      end
    rescue => e
      Rails.logger.error "Failed to get cached search results: #{e.message}"
    end
    
    nil
  end

  def self.cache_search_results(search_term, filters, results)
    return unless $redis

    begin
      cache_key = generate_search_cache_key(search_term, filters)
      serialized_results = results.map(&:as_json)
      $redis.setex(cache_key, CACHE_TTL, serialized_results.to_json)
      Rails.logger.info "Cached search results for: #{search_term}"
    rescue => e
      Rails.logger.error "Failed to cache search results: #{e.message}"
    end
  end

  def self.index_offering(offering)
    return unless $elasticsearch

    # Index asynchronously to avoid blocking
    AsyncIndexJob.perform_later(offering.id)
  end

  def self.remove_offering(offering_id)
    return unless $elasticsearch

    # Remove asynchronously
    AsyncRemoveIndexJob.perform_later(offering_id)
  end

  def self.get_popular_offerings(limit: 10)
    # Try cache first
    cached_results = get_cached_popular_offerings(limit)
    return cached_results if cached_results

    if $elasticsearch
      elasticsearch_popular_search(limit)
    else
      database_popular_search(limit)
    end
  end

  def self.elasticsearch_popular_search(limit)
    begin
      response = $elasticsearch.search(
        index: 'offerings',
        body: {
          query: { match_all: {} },
          sort: [
            { created_at: { order: 'desc' } }
          ],
          size: limit
        }
      )

      offering_ids = response['hits']['hits'].map { |hit| hit['_source']['id'] }
      offerings = batch_fetch_offerings(offering_ids)
      
      # Cache asynchronously
      AsyncCachePopularJob.perform_later(limit, offerings)
      
      offerings
    rescue => e
      Rails.logger.error "Elasticsearch popular search failed: #{e.message}"
      database_popular_search(limit)
    end
  end

  def self.database_popular_search(limit)
    # Get offerings with enrollment counts
    offerings = Offering.includes(:tutor, :lesson, :enrollments)
                        .joins(:enrollments)
                        .group('offerings.id')
                        .order('COUNT(enrollments.id) DESC, offerings.created_at DESC')
                        .limit(limit)
    
    # Cache asynchronously
    AsyncCachePopularJob.perform_later(limit, offerings.to_a)
    
    offerings
  end

  def self.get_cached_popular_offerings(limit)
    return nil unless $redis

    begin
      cache_key = "popular_offerings:#{limit}"
      cached_data = $redis.get(cache_key)
      
      if cached_data
        cached_hashes = JSON.parse(cached_data)
        
        # Convert cached hashes back to Offering objects
        offering_ids = cached_hashes.map { |h| h['id'] }
        offerings = Offering.includes(:tutor, :lesson).where(id: offering_ids)
        
        # Preserve order as in cache
        offerings_by_id = offerings.index_by(&:id)
        ordered_offerings = offering_ids.map { |id| offerings_by_id[id] }.compact
        
        return ordered_offerings
      end
    rescue => e
      Rails.logger.error "Failed to get cached popular offerings: #{e.message}"
    end
    
    nil
  end

  def self.generate_search_cache_key(search_term, filters)
    search_hash = Digest::MD5.hexdigest("#{search_term}#{filters.to_json}")
    "search:#{search_hash}"
  end

  private

  def self.build_search_query(search_term, filters)
    must_clauses = []
    filter_clauses = []

    # Text search with better scoring
    if search_term.present?
      must_clauses << {
        multi_match: {
          query: search_term,
          fields: [
            'lesson.name^3',
            'lesson.subject^2',
            'lesson.description',
            'tutor.name^2',
            'tutor.bio'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or'
        }
      }
    end

    # Filters
    if filters[:subject].present?
      filter_clauses << { term: { 'lesson.subject.keyword' => filters[:subject] } }
    end

    if filters[:age_group].present?
      filter_clauses << { term: { 'lesson.age_group.keyword' => filters[:age_group] } }
    end

    if filters[:price_range].present?
      price_filter = build_price_filter(filters[:price_range])
      filter_clauses << price_filter if price_filter
    end

    if filters[:duration].present?
      duration_filter = build_duration_filter(filters[:duration])
      filter_clauses << duration_filter if duration_filter
    end

    # Build final query
    query = { bool: {} }
    query[:bool][:must] = must_clauses if must_clauses.any?
    query[:bool][:filter] = filter_clauses if filter_clauses.any?

    # If no clauses, return match_all
    query = { match_all: {} } if query[:bool].empty?

    query
  end

  def self.build_price_filter(price_range)
    case price_range
    when 'Free'
      { term: { price: 0 } }
    when 'Under $20'
      { range: { price: { lt: 20 } } }
    when '$20-$50'
      { range: { price: { gte: 20, lte: 50 } } }
    when '$50-$100'
      { range: { price: { gte: 50, lte: 100 } } }
    when 'Over $100'
      { range: { price: { gt: 100 } } }
    end
  end

  def self.build_duration_filter(duration)
    case duration
    when '30 minutes'
      { term: { duration: 30 } }
    when '60 minutes'
      { term: { duration: 60 } }
    when '90 minutes'
      { term: { duration: 90 } }
    when '120+ minutes'
      { range: { duration: { gte: 120 } } }
    end
  end

end 
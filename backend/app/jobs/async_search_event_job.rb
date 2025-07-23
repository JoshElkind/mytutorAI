class AsyncSearchEventJob < ApplicationJob
  queue_as :default

  def perform(user_id, search_term, filters, result_count)
    EventService.publish_search_performed(
      user_id,
      search_term,
      filters,
      result_count
    )

    CacheService.cache_search_analytics(search_term, result_count)
  end
end 
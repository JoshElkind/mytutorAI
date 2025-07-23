module Mutations
  class CreateOffering < GraphQL::Schema::Mutation
    argument :lesson_id, ID, required: true
    argument :tutor_id, ID, required: true
    argument :price, Float, required: true
    argument :duration, Integer, required: true
    argument :available_times, [GraphQL::Types::ISO8601DateTime], required: true
    argument :max_students, Integer, required: true

    field :offering, Types::OfferingType, null: true
    field :errors, [String], null: false

    def resolve(lesson_id:, tutor_id:, price:, duration:, available_times:, max_students:)
      # Expand each available_time to the same day/time for the next 56 weeks
      expanded_times = []
      available_times.each do |time_value|
        # GraphQL ISO8601DateTime inputs arrive as Ruby Time instances when parsed
        # automatically by the graphql gem. However, tests/clients may still
        # send raw Strings. Handle both to avoid `no implicit conversion of Time
        # into String` errors.
        base_time = if time_value.is_a?(String)
                      Time.zone.parse(time_value)
                    else
                      # Already a Time/DateTime – just convert to the app time zone
                      time_value.in_time_zone
                    end
        56.times do |week|
          expanded_times << (base_time + week.weeks).utc.iso8601
        end
      end
      offering = Offering.new(
        lesson_id: lesson_id,
        tutor_id: tutor_id,
        price: price,
        duration: duration,
        available_times: expanded_times.uniq.sort,
        max_students: max_students
      )
      
      if offering.save
        # Index in Elasticsearch
        SearchService.index_offering(offering)
        
        # Cache the offering
        CacheService.cache_offering(offering)
        
        # Invalidate search caches
        CacheService.invalidate_search_caches
        
        # Publish event to Kafka
        EventService.publish_offering_created(offering)
        
        { offering: offering, errors: [] }
      else
        { offering: nil, errors: offering.errors.full_messages }
      end
    end
  end
end 
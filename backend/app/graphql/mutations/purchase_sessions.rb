module Mutations
  class PurchaseSessions < GraphQL::Schema::Mutation
    argument :offering_id, ID, required: true
    argument :session_times, [GraphQL::Types::ISO8601DateTime], required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false
    field :sessions, [Types::SessionType], null: true

    def resolve(offering_id:, session_times:)
      user = context[:current_user]
      
      unless user
        return { success: false, errors: ['User not authenticated'], sessions: nil }
      end

      unless user.user_type == 'student'
        return { success: false, errors: ['Only students can purchase sessions'], sessions: nil }
      end

      offering = Offering.find_by(id: offering_id)
      
      unless offering
        return { success: false, errors: ['Offering not found'], sessions: nil }
      end

      # Verify all session times are available
      invalid_times = session_times.reject { |time| offering.available_times.include?(time.iso8601) }
      if invalid_times.any?
        return { 
          success: false, 
          errors: ['Some selected times are no longer available'], 
          sessions: nil 
        }
      end

      created_sessions = []
      
      session_times.each do |start_time|
        end_time = start_time + offering.duration.minutes
        
        session = Session.new(
          tutor_id: offering.tutor_id,
          student_id: user.id,
          lesson_id: offering.lesson_id,
          start_time: start_time,
          end_time: end_time,
          tutor_name: offering.tutor.name,
          tutor_email: offering.tutor.email,
          student_name: user.name,
          student_email: user.email,
          lesson_name: offering.lesson.name,
          duration: offering.duration
        )

        if session.save
          # Remove the booked time from available times
          offering.available_times.delete(start_time.iso8601)
          created_sessions << session
        else
          # If any session fails to save, rollback all created sessions
          created_sessions.each(&:destroy)
          return { 
            success: false, 
            errors: ['Failed to create sessions'], 
            sessions: nil 
          }
        end
      end

      # Save the updated available times
      if offering.save
        # Update search index and cache
        SearchService.index_offering(offering)
        CacheService.cache_offering(offering)
        
        { 
          success: true, 
          errors: [], 
          sessions: created_sessions 
        }
      else
        # Rollback if offering save fails
        created_sessions.each(&:destroy)
        { 
          success: false, 
          errors: ['Failed to update offering availability'], 
          sessions: nil 
        }
      end
    end
  end
end 
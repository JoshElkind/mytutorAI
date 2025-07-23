class AsyncIndexJob < ApplicationJob
  queue_as :default

  def perform(offering_id)
    return unless $elasticsearch

    offering = Offering.includes(:tutor, :lesson).find(offering_id)
    
    begin
      $elasticsearch.index(
        index: 'offerings',
        id: offering.id,
        body: {
          id: offering.id,
          tutor_id: offering.tutor_id,
          lesson_id: offering.lesson_id,
          price: offering.price,
          duration: offering.duration,
          max_students: offering.max_students,
          enrolled_count: offering.enrolled_count,
          created_at: offering.created_at,
          lesson: {
            name: offering.lesson.name,
            subject: offering.lesson.subject,
            age_group: offering.lesson.age_group,
            description: offering.lesson.description
          },
          tutor: {
            name: offering.tutor.name,
            email: offering.tutor.email,
            rating: offering.tutor.rating || 0,
            total_sessions: offering.tutor.total_sessions || 0,
            bio: offering.tutor.bio
          }
        }
      )
      Rails.logger.info "Async indexed offering #{offering.id} in Elasticsearch"
    rescue => e
      Rails.logger.error "Failed to async index offering #{offering.id}: #{e.message}"
    end
  end
end 
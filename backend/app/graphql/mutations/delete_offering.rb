module Mutations
  class DeleteOffering < GraphQL::Schema::Mutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      current_user = context[:current_user]
      
      unless current_user&.user_type == 'tutor'
        return { success: false, errors: ['Only tutors can delete offerings'] }
      end
      
      offering = Offering.find_by(id: id, tutor: current_user)
      
      unless offering
        return { success: false, errors: ['Offering not found or does not belong to you'] }
      end
      
      # Store offering data for event publishing
      offering_id = offering.id
      tutor_id = offering.tutor_id
      lesson_id = offering.lesson_id
      
      if offering.destroy
        # Remove from Elasticsearch
        SearchService.remove_offering(offering_id)
        
        # Invalidate cache
        CacheService.invalidate_offering_cache(offering_id)
        
        # Publish event to Kafka
        EventService.publish_offering_deleted(offering_id, tutor_id, lesson_id)
        
        { success: true, errors: [] }
      else
        { success: false, errors: offering.errors.full_messages }
      end
    end
  end
end 
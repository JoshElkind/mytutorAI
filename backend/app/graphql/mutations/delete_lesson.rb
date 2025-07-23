module Mutations
  class DeleteLesson < GraphQL::Schema::Mutation
    # Accept the Lesson's UUID rather than its position in the lessons array so that
    # we are no longer dependent on list ordering on either the client or the server.
    # This is more robust and avoids bugs where the client and server disagree on the
    # lesson ordering.
    argument :lesson_id, String, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(lesson_id:)
      user = context[:current_user]
      
      unless user
        return { success: false, errors: ['User not authenticated'] }
      end

      unless user.user_type == 'tutor'
        return { success: false, errors: ['Only tutors can delete lessons'] }
      end

      lessons = user.lessons
      lesson_index = lessons&.index { |lesson| lesson['id'] == lesson_id }

      if lesson_index.nil?
        return { success: false, errors: ['Lesson not found'] }
      end

      if user.delete_lesson(lesson_index)
        { success: true, errors: [] }
      else
        { success: false, errors: user.errors.full_messages }
      end
    end
  end
end 
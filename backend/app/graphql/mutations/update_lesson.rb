module Mutations
  class UpdateLesson < GraphQL::Schema::Mutation
    argument :lesson_index, Integer, required: true
    argument :name, String, required: true
    argument :subject, String, required: true
    argument :ageGroup, String, required: true
    argument :grades, [String], required: true
    argument :studentCap, String, required: false
    argument :description, String, required: false

    field :lesson, Types::LessonType, null: true
    field :errors, [String], null: false

    def resolve(lesson_index:, name:, subject:, ageGroup:, grades:, studentCap: nil, description: nil)
      user = context[:current_user]
      
      unless user
        return { lesson: nil, errors: ['User not authenticated'] }
      end

      unless user.user_type == 'tutor'
        return { lesson: nil, errors: ['Only tutors can update lessons'] }
      end

      lessons = user.lessons
      unless lesson_index >= 0 && lesson_index < lessons.length
        return { lesson: nil, errors: ['Lesson not found'] }
      end

      lesson_data = {
        id: lessons[lesson_index]['id'] || SecureRandom.uuid,
        name: name,
        subject: subject,
        age_group: ageGroup,
        grades: grades,
        student_cap: studentCap,
        description: description,
        created_at: lessons[lesson_index]['created_at'] || Time.current
      }

      if user.update_lesson(lesson_index, lesson_data)
        { lesson: lesson_data, errors: [] }
      else
        { lesson: nil, errors: user.errors.full_messages }
      end
    end
  end
end 
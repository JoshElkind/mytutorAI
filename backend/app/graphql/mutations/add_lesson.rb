module Mutations
  class AddLesson < GraphQL::Schema::Mutation
    argument :name, String, required: true
    argument :subject, String, required: true
    argument :ageGroup, String, required: true
    argument :grades, [String], required: true
    argument :studentCap, String, required: false
    argument :description, String, required: false
    argument :materials, [String], required: false

    field :lesson, Types::LessonType, null: true
    field :errors, [String], null: false

    def resolve(name:, subject:, ageGroup:, grades:, studentCap: nil, description: nil, materials: [])
      user = context[:current_user]
      Rails.logger.info "[AddLesson] resolve called for user_id=#{user&.id}, email=#{user&.email}"

      unless user
        Rails.logger.warn "[AddLesson] No user authenticated"
        return { lesson: nil, errors: ['User not authenticated'] }
      end

      unless user.user_type == 'tutor'
        Rails.logger.warn "[AddLesson] User is not a tutor: user_id=#{user.id}, user_type=#{user.user_type}"
        return { lesson: nil, errors: ['Only tutors can add lessons'] }
      end

      lesson_id = SecureRandom.uuid
      now = Time.zone.now.utc
      lesson_data = {
        id: lesson_id,
        name: name,
        subject: subject,
        ageGroup: ageGroup, # camelCase
        grades: grades,
        studentCap: studentCap,
        description: description,
        materials: materials,
        createdAt: now.iso8601,
        currentStudentCount: 0
      }
      Rails.logger.info "[AddLesson] Attempting to add lesson: #{lesson_data.inspect}"

      # Create Lesson record in DB
      begin
        lesson_record = Lesson.create!(
          id: lesson_id,
          name: name,
          subject: subject,
          age_group: ageGroup,
          grades: grades&.join(', '),
          student_cap: studentCap.present? && studentCap != 'No Cap' ? studentCap.to_i : nil,
          description: description,
          created_at: now,
          updated_at: now
        )
      rescue => e
        Rails.logger.error "[AddLesson] Failed to create Lesson record: #{e.message}"
        return { lesson: nil, errors: ["Failed to create lesson: #{e.message}"] }
      end

      result = user.add_lesson(lesson_data)
      if result
        Rails.logger.info "[AddLesson] Lesson added successfully for user_id=#{user.id}"
        { lesson: lesson_record, errors: [] }
      else
        Rails.logger.error "[AddLesson] Failed to add lesson for user_id=#{user.id}"
        { lesson: nil, errors: ['Failed to add lesson'] }
      end
    end
  end
end 
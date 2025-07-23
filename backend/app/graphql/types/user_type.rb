module Types
  class UserType < Types::BaseObject
    field :id, ID, null: false
    field :email, String, null: false
    field :name, String, null: false
    field :user_type, String, null: false
    field :lessons, [Types::LessonType], null: false
    field :resources, [Types::ResourceType], null: false
    field :materials, [Types::MaterialType], null: false
    field :sessions, [Types::SessionType], null: false
    field :pastSessions, GraphQL::Types::JSON, null: true, method: :past_sessions
    field :education, String, null: true
    field :gender, String, null: true
    field :age, Integer, null: true
    field :bio, String, null: true
    field :profileImageUrl, String, null: true
    field :timezone, String, null: true
    field :rating, Float, null: true
    field :totalSessions, Integer, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false

    def lessons
      lessons_data = object.lessons
      Rails.logger.info "[UserType] User  #{object.id} has #{lessons_data.length} lessons"
      Rails.logger.info "[UserType] Lessons data: #{lessons_data.inspect}"
      # If lessons_data is an array of hashes, return Lesson records
      if lessons_data.is_a?(Array) && lessons_data.first.is_a?(Hash)
        Lesson.where(id: lessons_data.map { |l| l['id'] })
      else
        lessons_data
      end
    end

    def resources
      object.resources
    end

    def materials
      object.materials
    end

    def sessions
      Session.where('tutor_id = ? OR student_id = ?', object.id, object.id).order(:start_time)
    end

    def pastSessions
      Rails.logger.info "[GraphQL] Resolving pastSessions for user \\#{object.id} (\\#{object.email})"
      Rails.logger.info "[GraphQL] pastSessions raw value: #{object[:past_sessions].inspect}"
      object[:past_sessions]
    end

    def profileImageUrl
      Rails.logger.info "[GraphQL] Resolving profileImageUrl for user \\#{object.id} (\\#{object.email})"
      object.profile_image_url
    end

    def rating
      Rails.logger.info "[GraphQL] Resolving rating for user \\#{object.id} (\\#{object.email})"
      object.rating
    end

    def totalSessions
      Rails.logger.info "[GraphQL] Resolving totalSessions for user \\#{object.id} (\\#{object.email})"
      object.total_sessions
    end
  end
end 
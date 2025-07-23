module Types
  class LessonType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :subject, String, null: false
    field :ageGroup, String, null: false
    field :grades, [String], null: false
    field :studentCap, String, null: true
    field :description, String, null: true
    field :materials, [String], null: true
    field :sessions, [Types::SessionType], null: false
    field :createdAt, GraphQL::Types::ISO8601DateTime, null: false

    def ageGroup
      object.respond_to?(:age_group) ? object.age_group : (object['age_group'] || object['ageGroup'])
    end

    def grades
      if object.respond_to?(:grades)
        if object.grades.present?
          object.grades.split(', ').map(&:strip)
        else
          []
        end
      else
        (object['grades'] || []).is_a?(String) ? object['grades'].split(', ').map(&:strip) : (object['grades'] || [])
      end
    end

    def studentCap
      if object.respond_to?(:student_cap)
        object.student_cap&.to_s
      else
        (object['student_cap'] || object['studentCap'])&.to_s
      end
    end

    def description
      object.respond_to?(:description) ? object.description : (object['description'] || '')
    end

    def materials
      # Return empty array since materials are not stored in the lessons table
      []
    end

    def createdAt
      object.respond_to?(:created_at) ? object.created_at : (object['created_at'] || object['createdAt'])
    end

    def sessions
      Session.where(lesson_id: object.id).order(:start_time)
    end
  end
end 
module Types
  class OfferingType < Types::BaseObject
    field :id, ID, null: false
    field :lesson_id, ID, null: false
    field :tutor_id, ID, null: false
    field :price, Float, null: false
    field :duration, Integer, null: false
    field :available_times, [GraphQL::Types::ISO8601DateTime], null: false
    field :max_students, Integer, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
    field :enrolled_count, Integer, null: false
    field :lesson, Types::LessonType, null: false
    field :tutor, Types::UserType, null: false

    def enrolled_count
      object.enrollments.count
    end
    def lesson
      object.lesson
    end
    def tutor
      object.tutor
    end
  end
end 
module Types
  class SessionType < Types::BaseObject
    field :id, ID, null: false
    field :tutor_name, String, null: false
    field :tutor_email, String, null: false
    field :student_name, String, null: false
    field :student_email, String, null: false
    field :lesson_name, String, null: false
    field :start_time, GraphQL::Types::ISO8601DateTime, null: false
    field :end_time, GraphQL::Types::ISO8601DateTime, null: false
    field :duration, Integer, null: false, description: 'Duration of the session in minutes (30, 45, or 60)'
    # Expose tutor_id and student_id with camelCase names for frontend consistency
    field :tutorId, ID, null: false, method: :tutor_id
    field :studentId, ID, null: false, method: :student_id
    # Materials belonging to the tutor that should be shared with the session participants
    field :materials, [Types::MaterialType], null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    def materials
      # Return all materials owned by the tutor so both tutor and student can access them during the call
      Material.where(user_id: object.tutor_id).order(created_at: :desc)
    end
  end
end 
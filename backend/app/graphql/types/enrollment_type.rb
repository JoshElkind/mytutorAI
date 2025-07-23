module Types
  class EnrollmentType < Types::BaseObject
    field :id, ID, null: false
    field :offering_id, ID, null: false
    field :student_id, ID, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :offering, Types::OfferingType, null: false
    field :student, Types::UserType, null: false

    def offering
      object.offering
    end
    def student
      object.student
    end
  end
end 
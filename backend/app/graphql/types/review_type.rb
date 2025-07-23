module Types
  class ReviewType < Types::BaseObject
    field :id, ID, null: false
    field :stars, Integer, null: false
    field :comment, String, null: true
    field :student_name, String, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    
    def student_name
      object.student.name
    end
  end
end 
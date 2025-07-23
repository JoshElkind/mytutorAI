module Types
  class LessonInput < Types::BaseInputObject
    argument :name, String, required: true
    argument :subject, String, required: true
    argument :age_group, String, required: true
    argument :grades, [String], required: true
    argument :student_cap, String, required: false
    argument :description, String, required: false
  end
end 
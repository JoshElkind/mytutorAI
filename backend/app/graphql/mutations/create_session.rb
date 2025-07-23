module Mutations
  class CreateSession < GraphQL::Schema::Mutation
    argument :tutor_id, ID, required: true
    argument :student_id, ID, required: true
    argument :lesson_id, ID, required: true
    argument :start_time, GraphQL::Types::ISO8601DateTime, required: true
    argument :end_time, GraphQL::Types::ISO8601DateTime, required: true
    argument :tutor_name, String, required: true
    argument :tutor_email, String, required: true
    argument :student_name, String, required: true
    argument :student_email, String, required: true
    argument :lesson_name, String, required: true
    argument :duration, Integer, required: true, description: 'Duration of the session in minutes (30, 45, or 60)'

    field :session, Types::SessionType, null: true
    field :errors, [String], null: false

    def resolve(tutor_id:, student_id:, lesson_id:, start_time:, end_time:, tutor_name:, tutor_email:, student_name:, student_email:, lesson_name:, duration:)
      session = Session.new(
        tutor_id: tutor_id,
        student_id: student_id,
        lesson_id: lesson_id,
        start_time: start_time,
        end_time: end_time,
        tutor_name: tutor_name,
        tutor_email: tutor_email,
        student_name: student_name,
        student_email: student_email,
        lesson_name: lesson_name,
        duration: duration
      )
      if session.save
        { session: session, errors: [] }
      else
        { session: nil, errors: session.errors.full_messages }
      end
    end
  end
end 
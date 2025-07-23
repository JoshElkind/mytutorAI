class Session < ApplicationRecord
  belongs_to :tutor, class_name: 'User'
  belongs_to :student, class_name: 'User'
  # Optionally, you can add a Lesson model and associate here if needed
  # belongs_to :lesson

  validates :start_time, :end_time, presence: true
  validates :tutor_id, :student_id, :lesson_id, presence: true
  validates :duration, presence: true, inclusion: { in: [30, 45, 60], message: 'must be 30, 45, or 60 (minutes)' }
end 
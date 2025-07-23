class Offering < ApplicationRecord
  belongs_to :tutor, class_name: 'User'
  belongs_to :lesson, foreign_key: :lesson_id, primary_key: :id, class_name: 'Lesson'
  has_many :enrollments, dependent: :destroy

  validates :lesson_id, :tutor_id, :price, :duration, :available_times, :max_students, presence: true
  validates :duration, inclusion: { in: [30, 60], message: 'must be 30 or 60 (minutes)' }
  validates :price, numericality: { greater_than_or_equal_to: 0 }
  validates :max_students, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  serialize :available_times, coder: JSON
end 
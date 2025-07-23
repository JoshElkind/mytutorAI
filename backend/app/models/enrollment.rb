class Enrollment < ApplicationRecord
  belongs_to :offering
  belongs_to :student, class_name: 'User'

  validates :offering_id, :student_id, presence: true
  validates :student_id, uniqueness: { scope: :offering_id, message: 'already enrolled in this offering' }
end 
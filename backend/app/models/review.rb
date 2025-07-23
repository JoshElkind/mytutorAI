class Review < ApplicationRecord
  belongs_to :student, class_name: 'User'
  belongs_to :tutor, class_name: 'User'
  validates :stars, presence: true, inclusion: { in: 1..5 }
  validates :comment, length: { maximum: 200 }
  validates :student_id, uniqueness: { scope: :tutor_id, message: "has already reviewed this tutor" }
  
  scope :for_tutor, ->(tutor_id) { where(tutor_id: tutor_id) }
  scope :ordered_by_date, -> { order(created_at: :desc) }
  scope :ordered_by_stars, -> { order(stars: :desc) }
  
  def student_name
    student.name
  end
  
  def tutor_name
    tutor.name
  end
end 
class Lesson < ApplicationRecord
  self.primary_key = 'id'
  validates :name, presence: true
  validates :subject, presence: true
end

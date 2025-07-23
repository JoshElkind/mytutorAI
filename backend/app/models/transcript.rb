class Transcript < ApplicationRecord
  validates :session_id, presence: true, allow_nil: true
  enum status: { processing: 'processing', completed: 'completed', failed: 'failed' }
end 
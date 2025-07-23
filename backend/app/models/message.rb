class Message < ApplicationRecord
  belongs_to :sender, class_name: 'User'
  belongs_to :receiver, class_name: 'User'
  
  validates :content, presence: true, length: { maximum: 1000 }
  validates :sender_id, presence: true
  validates :receiver_id, presence: true
  
  scope :unread, -> { where(read: false) }
  scope :read, -> { where(read: true) }
  scope :recent, -> { order(created_at: :desc) }
  
  # Get conversation between two users
  scope :between_users, ->(user1_id, user2_id) {
    where(
      "(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
      user1_id, user2_id, user2_id, user1_id
    ).order(created_at: :asc)
  }
  
  # Mark message as read
  def mark_as_read!
    update!(read: true, read_at: Time.current) unless read?
  end
  
  # Check if message is from current user
  def from_user?(user)
    sender_id == user.id
  end
  
  # Get the other user in the conversation
  def other_user(current_user)
    sender_id == current_user.id ? receiver : sender
  end

  after_create_commit :broadcast_via_action_cable

  private

  # Broadcasts the newly-created message to both participants using ActionCable.
  def broadcast_via_action_cable
    payload = {
      action: 'new_message',
      message: as_json(include: { sender: { only: %i[id name] }, receiver: { only: %i[id name] } })
    }

    # Broadcast to personal streams so each side receives the update.
    ActionCable.server.broadcast("messages_#{sender_id}", payload)
    ActionCable.server.broadcast("messages_#{receiver_id}", payload)
  end
end 
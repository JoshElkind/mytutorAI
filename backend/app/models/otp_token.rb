class OtpToken < ApplicationRecord
  belongs_to :user, optional: true

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :token, presence: true, length: { is: 6 }
  validates :expires_at, presence: true

  scope :unused, -> { where(used: false) }
  scope :valid, -> { where('expires_at > ?', Time.current) }
  scope :for_email, ->(email) { where(email: email.downcase) }

  before_validation :generate_token, on: :create
  before_validation :set_expiration, on: :create

  def self.generate_for_email(email)
    # Invalidate any existing unused tokens for this email
    for_email(email).unused.update_all(used: true)
    
    # Create new token
    create!(email: email.downcase)
  end

  def self.verify_token(email, token)
    token_record = for_email(email).unused.valid.find_by(token: token)
    
    if token_record
      token_record.update!(used: true)
      token_record
    else
      nil
    end
  end

  def expired?
    expires_at < Time.current
  end

  private

  def generate_token
    self.token = SecureRandom.random_number(100000..999999).to_s
  end

  def set_expiration
    self.expires_at = 10.minutes.from_now
  end
end

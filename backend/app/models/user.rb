class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true, length: { minimum: 2 }
  validates :user_type, presence: true, inclusion: { in: %w[student tutor] }

  has_many :otp_tokens, dependent: :destroy
  has_many :resources, dependent: :destroy
  has_many :materials, dependent: :destroy
  has_many :sessions_as_tutor, class_name: 'Session', foreign_key: 'tutor_id', dependent: :destroy
  has_many :sessions_as_student, class_name: 'Session', foreign_key: 'student_id', dependent: :destroy
  has_many :offerings, dependent: :destroy
  has_one_attached :profile_image
  
  # Messaging associations
  has_many :sent_messages, class_name: 'Message', foreign_key: :sender_id, dependent: :destroy
  has_many :received_messages, class_name: 'Message', foreign_key: :receiver_id, dependent: :destroy

  before_save :downcase_email
  before_save :ensure_lessons_array

  def self.find_by_email(email)
    find_by(email: email.downcase)
  end

  def generate_jwt_token
    JWT.encode(
      { user_id: id, email: email, user_type: user_type },
      Rails.application.credentials.secret_key_base,
      'HS256'
    )
  end

  def lessons
    lessons_data = self[:lessons] || []
    # Convert snake_case keys to camelCase for frontend compatibility
    lessons_data.map do |lesson|
      lesson.transform_keys do |key|
        case key
        when 'age_group'
          'ageGroup'
        when 'student_cap'
          'studentCap'
        when 'created_at'
          'createdAt'
        else
          key
        end
      end
    end
  end

  def add_lesson(lesson_data)
    Rails.logger.info "[add_lesson] BEFORE: user_id=#{id}, lessons=#{self[:lessons].inspect}"
    current_lessons = self.lessons
    current_lessons << lesson_data
    result = update(lessons: current_lessons)
    Rails.logger.info "[add_lesson] AFTER: user_id=#{id}, lessons=#{self[:lessons].inspect}, update_result=#{result}"
    result
  end

  def update_lesson(lesson_index, lesson_data)
    current_lessons = self.lessons
    current_lessons[lesson_index] = lesson_data
    update(lessons: current_lessons)
  end

  def delete_lesson(lesson_index)
    current_lessons = self.lessons
    Rails.logger.info "[delete_lesson] BEFORE: user_id=#{id}, lessons=#{current_lessons.inspect}"
    current_lessons.delete_at(lesson_index)
    result = update(lessons: current_lessons)
    Rails.logger.info "[delete_lesson] AFTER: user_id=#{id}, lessons=#{self[:lessons].inspect}, update_result=#{result}"
    Rails.logger.error "[delete_lesson] ERRORS: #{errors.full_messages}" unless result
    result
  end

  def rating
    return 0 unless user_type == 'tutor'

    tutor_reviews = Review.for_tutor(id)
    return 0 if tutor_reviews.empty?

    tutor_reviews.average(:stars).round(1)
  end

  def total_sessions
    return 0 unless user_type == 'tutor'
    sessions_as_tutor.count
  end

  def bio
    "Experienced tutor with #{total_sessions} sessions completed"
  end

  def profile_image_url
    return nil unless profile_image.attached?
    
    Rails.application.routes.url_helpers.rails_blob_url(profile_image, only_path: false, host: 'localhost:3000')
  rescue => e
    Rails.logger.error "Failed to generate profile image URL: #{e.message}"
    nil
  end

  def normalize_lessons_keys!
    return unless self.lessons.is_a?(Array)
    self.lessons = self.lessons.map do |lesson|
      lesson = lesson.with_indifferent_access
      {
        id: lesson[:id],
        name: lesson[:name],
        subject: lesson[:subject],
        ageGroup: lesson[:ageGroup] || lesson[:age_group],
        grades: lesson[:grades] || [],
        studentCap: lesson[:studentCap] || lesson[:student_cap],
        description: lesson[:description],
        materials: lesson[:materials] || [],
        createdAt: lesson[:createdAt] || lesson[:created_at],
        currentStudentCount: lesson[:currentStudentCount] || 0
      }
    end
    save!
  end

  private

  def downcase_email
    self.email = email.downcase if email.present?
  end

  def ensure_lessons_array
    self.lessons = [] if lessons.nil?
  end
end

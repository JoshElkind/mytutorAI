class Resource < ApplicationRecord
  belongs_to :user
  has_one_attached :file
  
  validates :name, presence: true
  validates :resource_type, presence: true, inclusion: { in: %w[learning worksheet quiz] }
  validates :file, presence: true, attached: true, content_type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  
  scope :by_type, ->(type) { where(resource_type: type) }
  scope :for_user, ->(user) { where(user: user) }
  
  def file_url
    return nil unless file.attached?
    # Use only_path: true to avoid host issues, or provide a default host
    Rails.application.routes.url_helpers.rails_blob_url(file, only_path: false, host: 'localhost:3000')
  rescue => e
    # Fallback to just the path if URL generation fails
    Rails.application.routes.url_helpers.rails_blob_path(file, only_path: true)
  end
  
  def file_name
    return nil unless file.attached?
    file.filename.to_s
  end
  
  def content_type
    return nil unless file.attached?
    file.content_type
  end
  
  def file_size
    return nil unless file.attached?
    file.byte_size
  end
  
  def file_size_mb
    return 0 unless file.attached?
    (file.byte_size / 1024.0 / 1024.0).round(2)
  end
  
  def file_extension
    return nil unless file.attached?
    File.extname(file.filename.to_s).downcase
  end
  
  def pdf_preview_url
    return file_url if content_type == 'application/pdf'
    
    if content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      # Instead of converting DOCX → PDF (which requires external tools), just
      # return the original file URL so the user can download it directly.
      Rails.logger.info "[PDF_PREVIEW_URL] Skipping DOCX->PDF conversion for Resource #{id}, returning original file URL"
      file_url
    else
      Rails.logger.info "[PDF_PREVIEW_URL] User: #{user_id} | Resource: #{id} | No preview available for content_type: #{content_type}"
      nil
    end
  end
end

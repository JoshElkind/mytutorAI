class PdfPreviewController < ApplicationController
  def show
    filename = params[:filename]
    pdf_path = Rails.root.join('tmp', 'pdf_conversions', filename)
    user_id = current_user&.id rescue nil
    Rails.logger.info "[PDF_PREVIEW_CTRL] User: #{user_id} requested PDF: #{filename} | Path: #{pdf_path}"
    
    if File.exist?(pdf_path)
      Rails.logger.info "[PDF_PREVIEW_CTRL] PDF found, serving inline: #{pdf_path}"
      send_file pdf_path, 
                type: 'application/pdf', 
                disposition: 'inline',
                filename: filename
    else
      Rails.logger.warn "[PDF_PREVIEW_CTRL] PDF not found: #{pdf_path}"
      render plain: 'PDF not found', status: :not_found
    end
  end
end 
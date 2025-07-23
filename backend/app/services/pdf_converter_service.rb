class PdfConverterService
  def self.convert_docx_to_pdf(docx_file_path, output_dir = nil)
    output_dir ||= Rails.root.join('tmp', 'pdf_conversions')
    FileUtils.mkdir_p(output_dir) unless Dir.exist?(output_dir)
    
    # Generate unique filename
    filename = File.basename(docx_file_path, '.docx')
    timestamp = Time.current.strftime('%Y%m%d_%H%M%S')
    pdf_filename = "#{filename}_#{timestamp}.pdf"
    pdf_path = File.join(output_dir, pdf_filename)
    
    Rails.logger.info "[PDF_CONVERT] Attempting to convert DOCX to PDF: #{docx_file_path} -> #{pdf_path}"
    begin
      # Use pandoc to convert DOCX to PDF
      command = "pandoc '#{docx_file_path}' -o '#{pdf_path}'"
      result = system(command)
      Rails.logger.info "[PDF_CONVERT] Pandoc command: #{command} | Result: #{result}"
      
      if result && File.exist?(pdf_path)
        Rails.logger.info "[PDF_CONVERT] PDF successfully created: #{pdf_path}"
        return pdf_path
      else
        Rails.logger.error "[PDF_CONVERT] PDF conversion failed for #{docx_file_path}"
        return nil
      end
    rescue => e
      Rails.logger.error "[PDF_CONVERT] Error converting DOCX to PDF: #{e.message}"
      return nil
    end
  end
  
  def self.convert_blob_to_pdf(blob)
    return nil unless blob.content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    # Download the file temporarily
    temp_file = Tempfile.new(['docx', '.docx'])
    temp_file.binmode
    temp_file.write(blob.download)
    temp_file.close
    Rails.logger.info "[PDF_CONVERT] Downloaded blob to temp file: #{temp_file.path}"
    
    begin
      pdf_path = convert_docx_to_pdf(temp_file.path)
      return pdf_path
    ensure
      temp_file.unlink
    end
  end
end 
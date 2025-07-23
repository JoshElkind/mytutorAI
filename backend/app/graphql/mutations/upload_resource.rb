module Mutations
  class UploadResource < GraphQL::Schema::Mutation
    argument :name, String, required: true
    argument :resourceType, String, required: true
    argument :fileBase64, String, required: true
    argument :fileName, String, required: true
    argument :contentType, String, required: true

    field :resource, Types::ResourceType, null: true
    field :errors, [String], null: false

    def resolve(name:, resourceType:, fileBase64:, fileName:, contentType:)
      Rails.logger.info "[UPLOAD_RESOURCE] Starting upload for user: #{context[:current_user]&.id}"
      Rails.logger.info "[UPLOAD_RESOURCE] Resource name: #{name}, type: #{resourceType}"
      Rails.logger.info "[UPLOAD_RESOURCE] File name: #{fileName}, content type: #{contentType}"
      Rails.logger.info "[UPLOAD_RESOURCE] Base64 data length: #{fileBase64.length}"
      
      user = context[:current_user]
      unless user && user.user_type == 'tutor'
        Rails.logger.warn "[UPLOAD_RESOURCE] Unauthorized upload attempt by user: #{user&.id}"
        return { resource: nil, errors: ['Only tutors can upload resources'] }
      end

      begin
        Rails.logger.info "[UPLOAD_RESOURCE] Decoding base64 file data..."
        decoded_file = Base64.decode64(fileBase64)
        Rails.logger.info "[UPLOAD_RESOURCE] Decoded file size: #{decoded_file.length} bytes"
        
        resource = user.resources.build(name: name, resource_type: resourceType)
        Rails.logger.info "[UPLOAD_RESOURCE] Resource object created"
        
        Rails.logger.info "[UPLOAD_RESOURCE] Attaching file to resource..."
        resource.file.attach(
          io: StringIO.new(decoded_file),
          filename: fileName,
          content_type: contentType
        )
        Rails.logger.info "[UPLOAD_RESOURCE] File attached successfully"
        
        if resource.save
          Rails.logger.info "[UPLOAD_RESOURCE] Resource saved successfully with ID: #{resource.id}"
          Rails.logger.info "[UPLOAD_RESOURCE] File URL: #{resource.file.url}"
          { resource: resource, errors: [] }
        else
          Rails.logger.error "[UPLOAD_RESOURCE] Failed to save resource: #{resource.errors.full_messages}"
          { resource: nil, errors: resource.errors.full_messages }
        end
      rescue => e
        Rails.logger.error "[UPLOAD_RESOURCE] Exception occurred: #{e.class} - #{e.message}"
        Rails.logger.error "[UPLOAD_RESOURCE] Backtrace: #{e.backtrace.join("\n")}"
        { resource: nil, errors: ["Upload failed: #{e.message}"] }
      end
    end
  end
end 
module Api
  class TranscriptsController < ApplicationController
    skip_before_action :verify_authenticity_token

    def upload
      uploaded_file = params[:file]
      session_id = params[:sessionId] || params[:session_id]
      unless uploaded_file
        render json: { error: 'No file uploaded' }, status: :bad_request and return
      end

      temp_path = Rails.root.join('tmp', "upload_#{SecureRandom.uuid}.webm")
      File.open(temp_path, 'wb') { |f| f.write(uploaded_file.read) }

      transcript = Transcript.create!(session_id: session_id, status: 'processing')

      TranscribeAudioJob.perform_later(transcript.id, temp_path.to_s)

      render json: { success: true, transcript_id: transcript.id }
    end
  end
end 
class TranscribeAudioJob < ApplicationJob
  queue_as :default

  def perform(transcript_id, audio_path)
    transcript = Transcript.find_by(id: transcript_id)
    return unless transcript && File.exist?(audio_path)

    begin
      service = AssemblyAIService.new
      upload_url = service.upload_audio(audio_path)
      transcript_id = service.request_transcript(upload_url)
      text = service.poll_transcript(transcript_id)

      transcript.update!(content: text, status: 'completed')
    rescue => e
      transcript.update!(status: 'failed', error_message: e.message)
      Rails.logger.error("[TranscribeAudioJob] Transcription failed: #{e.message}")
    ensure
      File.delete(audio_path) if File.exist?(audio_path)
    end
  end
end 
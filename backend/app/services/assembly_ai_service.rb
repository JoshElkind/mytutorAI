require 'faraday'
require 'json'

class AssemblyAIService
  BASE_URL = 'https://api.assemblyai.com/v2'

  def initialize(api_key: ENV['ASSEMBLYAI_API_KEY'])
    @api_key = api_key
    raise 'ASSEMBLYAI_API_KEY not set' unless @api_key.present?

    @conn = Faraday.new(url: BASE_URL) do |f|
      f.request :retry, max: 3, interval: 0.5
      f.adapter Faraday.default_adapter
    end
  end

  # Uploads a local audio file and returns AssemblyAI upload_url
  def upload_audio(file_path)
    response = @conn.post('/upload') do |req|
      req.headers['authorization'] = @api_key
      req.headers['transfer-encoding'] = 'chunked'
      req.headers['content-type'] = 'application/octet-stream'
      req.body = File.read(file_path)
    end

    raise "AssemblyAI upload failed: #{response.status}" unless response.success?

    JSON.parse(response.body)['upload_url']
  end

  # Creates a transcript request and returns the transcript ID
  def request_transcript(audio_url)
    response = @conn.post('/transcript') do |req|
      req.headers['authorization'] = @api_key
      req.headers['content-type'] = 'application/json'
      req.body = { audio_url: audio_url }.to_json
    end

    raise "AssemblyAI transcript request failed: #{response.status}" unless response.success?

    JSON.parse(response.body)['id']
  end

  # Polls until transcript is completed, returns the text
  def poll_transcript(transcript_id, timeout: 300, interval: 5)
    elapsed = 0
    loop do
      response = @conn.get("/transcript/#{transcript_id}") do |req|
        req.headers['authorization'] = @api_key
      end

      raise "AssemblyAI poll failed: #{response.status}" unless response.success?

      data = JSON.parse(response.body)
      case data['status']
      when 'completed'
        return data['text']
      when 'error'
        raise StandardError, data['error']
      else # queued or processing
        sleep interval
        elapsed += interval
        raise 'AssemblyAI transcription timed out' if elapsed >= timeout
      end
    end
  end
end 
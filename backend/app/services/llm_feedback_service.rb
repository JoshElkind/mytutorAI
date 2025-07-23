# frozen_string_literal: true

class LlmFeedbackService
  # Summarizes what a student can improve on, given a transcript.
  # @param transcript [String] The full text transcript of the session.
  # @return [String] The summary of improvements (stub for now).
  def self.summarize_student_improvements(transcript)
    # In the future, call the LLM API here (e.g., OpenAI, Anthropic, etc.)
    # For now, just return a stub response.
    "[LLM summary would go here. Received transcript of length #{transcript.length} characters.]"
  end
end 
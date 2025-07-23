# frozen_string_literal: true

class Api::MeetingFeedbackController < ApplicationController
  # POST /api/meeting-feedback/summary
  def summary
    transcript = params[:transcript]
    unless transcript.is_a?(String) && transcript.length > 0
      render json: { error: 'Transcript is required.' }, status: :bad_request and return
    end
    summary = LlmFeedbackService.summarize_student_improvements(transcript)
    render json: { summary: summary }
  end
end 
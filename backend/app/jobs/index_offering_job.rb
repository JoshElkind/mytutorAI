class IndexOfferingJob < ApplicationJob
  queue_as :default

  def perform(offering_id)
    offering = Offering.find_by(id: offering_id)
    return unless offering

    begin
      SearchService.index_offering(offering)
      Rails.logger.info "Successfully indexed offering #{offering_id} in background job"
    rescue => e
      Rails.logger.error "Failed to index offering #{offering_id} in background job: #{e.message}"
      # Retry the job
      retry_job wait: 5.seconds
    end
  end
end 
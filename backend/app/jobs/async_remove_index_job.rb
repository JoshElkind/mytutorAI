class AsyncRemoveIndexJob < ApplicationJob
  queue_as :default

  def perform(offering_id)
    return unless $elasticsearch

    begin
      $elasticsearch.delete(index: 'offerings', id: offering_id)
      Rails.logger.info "Async removed offering #{offering_id} from Elasticsearch"
    rescue => e
      Rails.logger.error "Failed to async remove offering #{offering_id}: #{e.message}"
    end
  end
end 
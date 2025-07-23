# Kafka configuration for real-time messaging
require 'kafka'

begin
  $kafka = Kafka.new(
    seed_brokers: ENV.fetch('KAFKA_BROKERS', 'localhost:9092').split(','),
    client_id: 'mytutor-backend',
    logger: Rails.logger
  )
  
  # Test connection
  $kafka.topics
  Rails.logger.info "Kafka connected successfully"
rescue => e
  Rails.logger.warn "Kafka connection failed: #{e.message}"
  $kafka = nil
end

# Define Kafka topics
KAFKA_TOPICS = {
  offering_created: 'offerings.created',
  offering_updated: 'offerings.updated',
  offering_deleted: 'offerings.deleted',
  user_enrolled: 'users.enrolled',
  search_performed: 'search.performed'
} 
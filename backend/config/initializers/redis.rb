# Redis configuration for MessageService and other caching needs
require 'redis'

# Initialize Redis connection
begin
  $redis = Redis.new(
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
    timeout: 1,
    reconnect_attempts: 3
  )
  
  # Test the connection
  $redis.ping
  Rails.logger.info "[REDIS] Successfully connected to Redis"
rescue => e
  Rails.logger.warn "[REDIS] Failed to connect to Redis: #{e.message}"
  Rails.logger.warn "[REDIS] MessageService will work without caching"
  $redis = nil
end 
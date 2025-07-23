require 'elasticsearch'

# Elasticsearch configuration
ELASTICSEARCH_CONFIG = {
  url: ENV['ELASTICSEARCH_URL'] || 'http://localhost:9200',
  log: Rails.env.development?,
  logger: Rails.logger
}

# Create Elasticsearch client
begin
  $elasticsearch = Elasticsearch::Client.new(ELASTICSEARCH_CONFIG)
  
  # Test connection
  if $elasticsearch.ping
    Rails.logger.info "Elasticsearch connection established successfully"
    
    # Create indices if they don't exist
    create_elasticsearch_indices
  else
    Rails.logger.error "Elasticsearch ping failed"
  end
rescue => e
  Rails.logger.error "Failed to connect to Elasticsearch: #{e.message}"
  Rails.logger.warn "Continuing without Elasticsearch - search will use database queries"
  $elasticsearch = nil
end

private

def create_elasticsearch_indices
  return unless $elasticsearch

  # Create offerings index
  unless $elasticsearch.indices.exists(index: 'offerings')
    $elasticsearch.indices.create(
      index: 'offerings',
      body: {
        settings: {
          analysis: {
            analyzer: {
              text_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'snowball']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tutor_id: { type: 'keyword' },
            lesson_id: { type: 'keyword' },
            price: { type: 'float' },
            duration: { type: 'integer' },
            max_students: { type: 'integer' },
            enrolled_count: { type: 'integer' },
            created_at: { type: 'date' },
            lesson: {
              properties: {
                name: { 
                  type: 'text',
                  analyzer: 'text_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                subject: { 
                  type: 'text',
                  analyzer: 'text_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                age_group: { type: 'keyword' },
                description: { 
                  type: 'text',
                  analyzer: 'text_analyzer'
                }
              }
            },
            tutor: {
              properties: {
                name: { 
                  type: 'text',
                  analyzer: 'text_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                email: { type: 'keyword' },
                rating: { type: 'float' },
                total_sessions: { type: 'integer' },
                bio: { 
                  type: 'text',
                  analyzer: 'text_analyzer'
                }
              }
            }
          }
        }
      }
    )
    Rails.logger.info "Created Elasticsearch index: offerings"
  end
end 
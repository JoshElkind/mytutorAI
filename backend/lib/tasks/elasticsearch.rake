namespace :elasticsearch do
  desc "Index all existing offerings in Elasticsearch"
  task index_offerings: :environment do
    puts "Starting to index offerings in Elasticsearch..."
    
    offerings = Offering.includes(:tutor, :lesson)
    total = offerings.count
    
    offerings.find_each.with_index do |offering, index|
      begin
        SearchService.index_offering(offering)
        print "\rIndexed #{index + 1}/#{total} offerings"
      rescue => e
        puts "\nFailed to index offering #{offering.id}: #{e.message}"
      end
    end
    
    puts "\nFinished indexing offerings!"
  end

  desc "Recreate Elasticsearch indices"
  task recreate_indices: :environment do
    puts "Recreating Elasticsearch indices..."
    
    if $elasticsearch
      begin
        # Delete existing index
        if $elasticsearch.indices.exists(index: 'offerings')
          $elasticsearch.indices.delete(index: 'offerings')
          puts "Deleted existing offerings index"
        end
        
        # Recreate index
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
        puts "Created new offerings index"
        
        # Index all offerings
        Rake::Task['elasticsearch:index_offerings'].invoke
      rescue => e
        puts "Failed to recreate indices: #{e.message}"
      end
    else
      puts "Elasticsearch is not available"
    end
  end
end 
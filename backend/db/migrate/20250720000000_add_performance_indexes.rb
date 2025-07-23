class AddPerformanceIndexes < ActiveRecord::Migration[8.0]
  def change
    # Indexes for offerings table
    add_index :offerings, :tutor_id, if_not_exists: true
    add_index :offerings, :lesson_id, if_not_exists: true
    add_index :offerings, :price, if_not_exists: true
    add_index :offerings, :duration, if_not_exists: true
    add_index :offerings, :created_at, if_not_exists: true
    add_index :offerings, [:price, :duration], if_not_exists: true
    
    # Indexes for lessons table
    add_index :lessons, :subject, if_not_exists: true
    add_index :lessons, :age_group, if_not_exists: true
    add_index :lessons, [:subject, :age_group], if_not_exists: true
    
    # Indexes for users table (tutors)
    add_index :users, :user_type, if_not_exists: true
    
    # Indexes for enrollments table (for enrollment count calculations)
    add_index :enrollments, :offering_id, if_not_exists: true
    add_index :enrollments, :student_id, if_not_exists: true
    
    # Composite indexes for common queries
    add_index :offerings, [:tutor_id, :created_at], if_not_exists: true
    add_index :offerings, [:lesson_id, :price], if_not_exists: true
    
    # Full-text search indexes (if using PostgreSQL)
    if connection.adapter_name.downcase.include?('postgresql')
      execute "CREATE INDEX index_lessons_name_search ON lessons USING gin(to_tsvector('english', name))"
      execute "CREATE INDEX index_lessons_description_search ON lessons USING gin(to_tsvector('english', description))"
      execute "CREATE INDEX index_users_name_search ON users USING gin(to_tsvector('english', name))"
      execute "CREATE INDEX index_users_bio_search ON users USING gin(to_tsvector('english', bio))"
    end
  end
end 
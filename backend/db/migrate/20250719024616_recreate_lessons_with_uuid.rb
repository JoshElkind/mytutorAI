class RecreateLessonsWithUuid < ActiveRecord::Migration[8.0]
  def up
    # Remove foreign key from offerings to lessons
    remove_foreign_key :offerings, :lessons if foreign_key_exists?(:offerings, :lessons)

    # Change offerings.lesson_id to string
    change_column :offerings, :lesson_id, :string, limit: 36

    # Drop and recreate lessons table with string UUID primary key
    drop_table :lessons if table_exists?(:lessons)
    create_table :lessons, id: false do |t|
      t.string :id, primary_key: true, limit: 36
      t.string :name
      t.string :subject
      t.string :age_group
      t.string :grades
      t.integer :student_cap
      t.text :description
      t.timestamps
    end

    # Delete all offerings to avoid foreign key constraint errors
    execute('DELETE FROM offerings')

    # Re-add foreign key
    add_foreign_key :offerings, :lessons

    # Repopulate lessons from user data
    User.where.not(lessons: nil).find_each do |user|
      user.lessons.each do |lesson_data|
        next if Lesson.exists?(id: lesson_data['id'])
        Lesson.create!(
          id: lesson_data['id'],
          name: lesson_data['name'],
          subject: lesson_data['subject'],
          age_group: lesson_data['ageGroup'] || lesson_data['age_group'],
          grades: lesson_data['grades']&.join(', '),
          student_cap: lesson_data['studentCap'] || lesson_data['student_cap'],
          description: lesson_data['description'],
          created_at: lesson_data['createdAt'] || lesson_data['created_at'] || Time.current,
          updated_at: Time.current
        )
      end
    end
  end

  def down
    remove_foreign_key :offerings, :lessons if foreign_key_exists?(:offerings, :lessons)
    change_column :offerings, :lesson_id, :integer
    drop_table :lessons if table_exists?(:lessons)
    create_table :lessons do |t|
      t.string :name
      t.string :subject
      t.string :age_group
      t.string :grades
      t.integer :student_cap
      t.text :description
      t.timestamps
    end
    add_foreign_key :offerings, :lessons
  end
end

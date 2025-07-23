class PopulateLessonsFromUserData < ActiveRecord::Migration[8.0]
  def up
    User.where.not(lessons: nil).find_each do |user|
      user.lessons.each do |lesson_data|
        # Skip if lesson already exists with this ID
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
    Lesson.delete_all
  end
end

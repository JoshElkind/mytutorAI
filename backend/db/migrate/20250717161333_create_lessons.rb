class CreateLessons < ActiveRecord::Migration[8.0]
  def change
    create_table :lessons do |t|
      t.string :name
      t.string :subject
      t.string :age_group
      t.string :grades
      t.integer :student_cap
      t.text :description

      t.timestamps
    end
  end
end

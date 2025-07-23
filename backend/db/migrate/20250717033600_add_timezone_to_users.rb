class AddTimezoneToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :timezone, :string
  end
end

class CreateSessions < ActiveRecord::Migration[7.0]
  def change
    create_table :sessions do |t|
      t.references :tutor, null: false, foreign_key: { to_table: :users }
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.references :lesson, null: false
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.string :tutor_name
      t.string :tutor_email
      t.string :student_name
      t.string :student_email
      t.string :lesson_name
      t.timestamps
    end
    add_index :sessions, :start_time
    add_index :sessions, :end_time
  end
end

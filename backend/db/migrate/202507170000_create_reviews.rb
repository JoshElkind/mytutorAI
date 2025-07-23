class CreateReviews < ActiveRecord::Migration[8.0]
  def change
    create_table :reviews do |t|
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.references :tutor, null: false, foreign_key: { to_table: :users }
      t.integer :stars, null: false, default: 5
      t.text :comment, limit: 200
      t.timestamps
    end
    
    add_index :reviews, [:tutor_id, :created_at]
    add_index :reviews, [:student_id, :tutor_id], unique: true
  end
end 
class CreateOfferings < ActiveRecord::Migration[7.0]
  def change
    create_table :offerings do |t|
      t.references :tutor, null: false, foreign_key: { to_table: :users }
      t.references :lesson, null: false, foreign_key: true
      t.decimal :price, null: false, precision: 8, scale: 2
      t.integer :duration, null: false
      t.text :available_times, null: false # serialized as Array
      t.integer :max_students, null: false
      t.timestamps
    end
  end
end 
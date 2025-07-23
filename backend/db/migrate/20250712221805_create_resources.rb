class CreateResources < ActiveRecord::Migration[8.0]
  def change
    create_table :resources do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :resource_type, null: false
      t.string :file_url
      t.string :file_name
      t.string :content_type
      t.integer :file_size

      t.timestamps
    end
    
    add_index :resources, :resource_type
    add_index :resources, [:user_id, :resource_type]
  end
end

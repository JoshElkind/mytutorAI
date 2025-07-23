class CreateMaterials < ActiveRecord::Migration[8.0]
  def change
    create_table :materials do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.json :resource_ids

      t.timestamps
    end
    
    add_index :materials, [:user_id, :name]
  end
end

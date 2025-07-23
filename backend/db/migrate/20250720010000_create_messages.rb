class CreateMessages < ActiveRecord::Migration[8.0]
  def change
    create_table :messages do |t|
      t.bigint :sender_id, null: false
      t.bigint :receiver_id, null: false
      t.text :content, null: false
      t.boolean :read, default: false
      t.datetime :read_at
      t.timestamps
    end

    add_index :messages, :sender_id
    add_index :messages, :receiver_id
    add_index :messages, [:sender_id, :receiver_id]
    add_index :messages, [:receiver_id, :sender_id]
    add_index :messages, :created_at
    add_index :messages, :read
    add_foreign_key :messages, :users, column: :sender_id
    add_foreign_key :messages, :users, column: :receiver_id
  end
end 
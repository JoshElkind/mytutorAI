class CreateTranscripts < ActiveRecord::Migration[7.0]
  def change
    create_table :transcripts do |t|
      t.string :session_id
      t.text :content
      t.string :status, default: 'processing'
      t.text :error_message

      t.timestamps
    end

    add_index :transcripts, :session_id
  end
end 
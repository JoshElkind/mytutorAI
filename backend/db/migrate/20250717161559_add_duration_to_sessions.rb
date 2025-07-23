class AddDurationToSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :sessions, :duration, :integer
  end
end

class AddPastSessionsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :past_sessions, :json
  end
end 
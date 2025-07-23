class AddRatingToSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :sessions, :rating, :float, null: true
  end
end 
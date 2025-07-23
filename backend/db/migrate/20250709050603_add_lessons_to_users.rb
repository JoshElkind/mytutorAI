class AddLessonsToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :lessons, :json
  end
end

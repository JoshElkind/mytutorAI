class AddProfileFieldsToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :education, :string
    add_column :users, :gender, :string
    add_column :users, :age, :integer
    add_column :users, :bio, :text
  end
end

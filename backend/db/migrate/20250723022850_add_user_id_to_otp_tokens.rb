class AddUserIdToOtpTokens < ActiveRecord::Migration[8.0]
  def change
    add_column :otp_tokens, :user_id, :integer
  end
end

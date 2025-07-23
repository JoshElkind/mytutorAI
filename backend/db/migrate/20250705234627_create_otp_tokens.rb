class CreateOtpTokens < ActiveRecord::Migration[8.0]
  def change
    create_table :otp_tokens do |t|
      t.string :email
      t.string :token
      t.datetime :expires_at
      t.boolean :used

      t.timestamps
    end
  end
end

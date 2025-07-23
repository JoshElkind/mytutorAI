module Types
  class VerifyOtpAndLoginInput < Types::BaseInputObject
    argument :email, String, required: true
    argument :code, String, required: true
  end
end 
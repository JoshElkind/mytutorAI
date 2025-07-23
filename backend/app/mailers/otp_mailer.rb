class OtpMailer < ApplicationMailer
  def login_code(email, code)
    @code = code
    @email = email
    mail(to: email, subject: "Your MyTutor Login Code")
  end

  def signup_code(email, code)
    @code = code
    @email = email
    mail(to: email, subject: "Your MyTutor Signup Code")
  end
end

module Mutations
  class UpdateProfile < BaseMutation
    argument :education, String, required: false
    argument :gender, String, required: false
    argument :age, Integer, required: false
    argument :bio, String, required: false
    argument :profile_image_url, String, required: false
    argument :profile_image_base64, String, required: false
    argument :timezone, String, required: false

    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(education: nil, gender: nil, age: nil, bio: nil, profile_image_url: nil, profile_image_base64: nil, timezone: nil)
      user = current_user
      return { user: nil, errors: ['Not authenticated'] } unless user

      user.education = education if education
      user.gender = gender if gender
      user.age = age if age
      user.bio = bio if bio
      user.timezone = timezone if timezone

      # Handle profile image upload from base64
      if profile_image_base64.present?
        require 'base64'
        require 'stringio'
        begin
          # Extract content type and data if data URL
          if profile_image_base64 =~ /^data:(.*?);base64,(.*)$/
            content_type = $1
            base64_data = $2
          else
            content_type = 'image/jpeg'
            base64_data = profile_image_base64
          end
          decoded_data = Base64.decode64(base64_data)
          filename = "profile_image_#{user.id}_#{Time.now.to_i}.jpg"
          user.profile_image.attach(
            io: StringIO.new(decoded_data),
            filename: filename,
            content_type: content_type
          )
        rescue => e
          return { user: nil, errors: ["Failed to process image: #{e.message}"] }
        end
      end

      if user.save
        { user: user, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end 
module Mutations
  class DeleteResource < GraphQL::Schema::Mutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      unless user && user.user_type == 'tutor'
        return { success: false, errors: ['Only tutors can delete resources'] }
      end
      resource = user.resources.find_by(id: id)
      unless resource
        return { success: false, errors: ['Resource not found'] }
      end
      if resource.destroy
        { success: true, errors: [] }
      else
        { success: false, errors: resource.errors.full_messages }
      end
    end
  end
end 
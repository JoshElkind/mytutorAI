module Mutations
  class DeleteMaterial < GraphQL::Schema::Mutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      unless user && user.user_type == 'tutor'
        return { success: false, errors: ['Only tutors can delete materials'] }
      end
      material = user.materials.find_by(id: id)
      unless material
        return { success: false, errors: ['Material not found'] }
      end
      if material.destroy
        { success: true, errors: [] }
      else
        { success: false, errors: material.errors.full_messages }
      end
    end
  end
end 
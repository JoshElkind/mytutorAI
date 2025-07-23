module Mutations
  class UpdateMaterial < GraphQL::Schema::Mutation
    argument :id, ID, required: true
    argument :name, String, required: true
    argument :description, String, required: false
    argument :resourceIds, [ID], required: true

    field :material, Types::MaterialType, null: true
    field :errors, [String], null: false

    def resolve(id:, name:, description: nil, resourceIds: [])
      user = context[:current_user]
      unless user && user.user_type == 'tutor'
        return { material: nil, errors: ['Only tutors can update materials'] }
      end
      material = user.materials.find_by(id: id)
      unless material
        return { material: nil, errors: ['Material not found'] }
      end
      if material.update(name: name, description: description, resource_ids: resourceIds)
        { material: material, errors: [] }
      else
        { material: nil, errors: material.errors.full_messages }
      end
    end
  end
end 
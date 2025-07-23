module Mutations
  class CreateMaterial < GraphQL::Schema::Mutation
    argument :name, String, required: true
    argument :description, String, required: false
    argument :resourceIds, [ID], required: true

    field :material, Types::MaterialType, null: true
    field :errors, [String], null: false

    def resolve(name:, description: nil, resourceIds: [])
      user = context[:current_user]
      unless user && user.user_type == 'tutor'
        return { material: nil, errors: ['Only tutors can create materials'] }
      end
      material = user.materials.build(name: name, description: description, resource_ids: resourceIds)
      if material.save
        { material: material, errors: [] }
      else
        { material: nil, errors: material.errors.full_messages }
      end
    end
  end
end 
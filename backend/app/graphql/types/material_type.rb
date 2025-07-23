module Types
  class MaterialType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :description, String, null: true
    field :resource_ids, [ID], null: false, camelize: false
    field :resourceIds, [ID], null: false
    field :resources, [Types::ResourceType], null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false, camelize: false
    field :createdAt, GraphQL::Types::ISO8601DateTime, null: false

    def resources
      object.resources
    end

    def resource_ids
      object.resource_ids
    end

    def resourceIds
      object.resource_ids
    end

    def created_at
      object.created_at
    end

    def createdAt
      object.created_at
    end
  end
end 
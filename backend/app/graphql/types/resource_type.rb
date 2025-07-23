module Types
  class ResourceType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :resource_type, String, null: false, camelize: true
    field :file_url, String, null: true, camelize: true
    field :file_name, String, null: true, camelize: true
    field :content_type, String, null: true, camelize: true
    field :file_size, Integer, null: true, camelize: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false, camelize: true
    field :pdf_preview_url, String, null: true, camelize: true
  end
end 
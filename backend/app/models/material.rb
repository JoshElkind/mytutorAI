class Material < ApplicationRecord
  belongs_to :user
  
  validates :name, presence: true
  validates :resource_ids, presence: true
  
  scope :for_user, ->(user) { where(user: user) }
  
  def resources
    Resource.where(id: resource_ids)
  end
  
  def resource_ids
    self[:resource_ids] || []
  end
  
  def add_resource(resource_id)
    return false unless Resource.exists?(resource_id)
    self.resource_ids = (resource_ids + [resource_id.to_i]).uniq
    save
  end
  
  def remove_resource(resource_id)
    self.resource_ids = resource_ids.reject { |id| id == resource_id.to_i }
    save
  end
end

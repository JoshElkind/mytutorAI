module Types
  class OfferingFiltersInput < Types::BaseInputObject
    argument :subject, String, required: false
    argument :age_group, String, required: false
    argument :price_range, String, required: false
    argument :duration, String, required: false
    argument :availability, String, required: false
  end
end 
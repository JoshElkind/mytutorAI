# frozen_string_literal: true

module Types
  class QueryType < Types::BaseObject
    field :node, Types::NodeType, null: true, description: "Fetches an object given its ID." do
      argument :id, ID, required: true, description: "ID of the object."
    end

    def node(id:)
      context.schema.object_from_id(id, context)
    end

    field :nodes, [Types::NodeType, null: true], null: true, description: "Fetches a list of objects given a list of IDs." do
      argument :ids, [ID], required: true, description: "IDs of the objects."
    end

    def nodes(ids:)
      ids.map { |id| context.schema.object_from_id(id, context) }
    end

    field :test_field, String, null: false,
      description: "An example field added by the generator"
    def test_field
      "Hello World!"
    end

    field :me, Types::UserType, null: true, description: "Get current authenticated user"
    def me
      current_user
    end

    field :current_user, Types::UserType, null: true,
      description: "Get the currently authenticated user"
    def current_user
      context[:current_user]
    end

    field :my_resources, [Types::ResourceType], null: false, description: 'List all resources for the current tutor'
    field :my_materials, [Types::MaterialType], null: false, description: 'List all materials for the current tutor'
    field :my_reviews, [Types::ReviewType], null: false, description: 'List all reviews for the current tutor'
    field :my_offerings, [Types::OfferingType], null: false, resolver: Queries::MyOfferings
    field :all_offerings, [Types::OfferingType], null: false, resolver: Queries::AllOfferings
    field :search_offerings, [Types::OfferingType], null: false, resolver: Queries::SearchOfferings, description: 'Search offerings with filters'
    field :popular_offerings, [Types::OfferingType], null: false, resolver: Queries::PopularOfferings, description: 'Get popular offerings'
    
    field :get_conversations, [Types::ConversationType], null: false, resolver: Queries::GetConversations, description: 'Get user conversations'
    field :get_messages, [Types::MessageType], null: false, resolver: Queries::GetMessages, description: 'Get messages between users' do
      argument :other_user_id, ID, required: true
      argument :limit, Integer, required: false, default_value: 50
    end

    field :lesson, Types::LessonType, null: true do
      argument :id, ID, required: true
    end

    def lesson(id:)
      Lesson.find_by(id: id)
    end

    def my_resources
      user = context[:current_user]
      return [] unless user && user.user_type == 'tutor'
      user.resources
    end

    def my_materials
      user = context[:current_user]
      return [] unless user && user.user_type == 'tutor'
      user.materials
    end

    def my_reviews
      user = context[:current_user]
      return [] unless user && user.user_type == 'tutor'
      Review.for_tutor(user.id).ordered_by_date
    end

    def my_offerings
      user = context[:current_user]
      return [] unless user && user.user_type == 'tutor'
      user.offerings.order(created_at: :desc)
    end

    def all_offerings
      # Return all offerings that have available times in the future
      now = DateTime.current
      Offering.joins(:tutor)
              .where('JSON_LENGTH(available_times) > 0')
              .order(created_at: :desc)
    end

    field :myUpcomingSessions, [Types::SessionType], null: false, description: 'List all upcoming sessions for the current user (tutor or student)', resolver_method: :my_upcoming_sessions
    field :session, Types::SessionType, null: true do
      argument :id, ID, required: true
    end

    field :user, Types::UserType, null: true do
      argument :id, ID, required: true
      description "Fetch a user profile by ID"
    end

    def user(id:)
      User.find_by(id: id)
    end

    def my_upcoming_sessions
      user = context[:current_user]
      Rails.logger.info "[GraphQL] my_upcoming_sessions called for user: #{user&.email} (id: #{user&.id})"
      return [] unless user
      now = Time.current
      begin
        sessions = Session.where('(tutor_id = :uid OR student_id = :uid) AND (start_time >= :now OR (start_time <= :now AND end_time > :now))', uid: user.id, now: now)
        Rails.logger.info "[GraphQL] Found #{sessions.count} upcoming sessions for user #{user.id}"
        sessions.order(:start_time)
      rescue => e
        Rails.logger.error "[GraphQL] Error in my_upcoming_sessions: #{e.class} - #{e.message}"
        []
      end
    end

    def session(id:)
      Session.find_by(id: id)
    end

    field :offering, Types::OfferingType, null: true do
      argument :id, ID, required: true
      description "Fetch a single offering by ID"
    end

    def offering(id:)
      Offering.find_by(id: id)
    end
  end
end

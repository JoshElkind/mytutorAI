class KafkaService
  TOPICS = {
    offering_created: 'offerings.created',
    offering_updated: 'offerings.updated',
    offering_deleted: 'offerings.deleted',
    search_performed: 'searches.performed',
    user_activity: 'users.activity',
    message_sent: 'messages.sent',
    messages_read: 'messages.read',
    user_online: 'users.online'
  }.freeze

  def self.publish_offering_created(offering)
    publish_message(TOPICS[:offering_created], {
      offering_id: offering.id,
      tutor_id: offering.tutor_id,
      lesson_id: offering.lesson_id,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_offering_updated(offering)
    publish_message(TOPICS[:offering_updated], {
      offering_id: offering.id,
      tutor_id: offering.tutor_id,
      lesson_id: offering.lesson_id,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_offering_deleted(offering_id)
    publish_message(TOPICS[:offering_deleted], {
      offering_id: offering_id,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_search_performed(user_id, search_term, filters, result_count)
    publish_message(TOPICS[:search_performed], {
      user_id: user_id,
      search_term: search_term,
      filters: filters,
      result_count: result_count,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_user_activity(user_id, activity_type, metadata = {})
    publish_message(TOPICS[:user_activity], {
      user_id: user_id,
      activity_type: activity_type,
      metadata: metadata,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_message_sent(message)
    publish_message(TOPICS[:message_sent], {
      message_id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_messages_read(user_id, other_user_id, count)
    publish_message(TOPICS[:messages_read], {
      user_id: user_id,
      other_user_id: other_user_id,
      read_count: count,
      timestamp: Time.current.iso8601
    })
  end

  def self.publish_user_online(user_id, online: true)
    publish_message(TOPICS[:user_online], {
      user_id: user_id,
      online: online,
      timestamp: Time.current.iso8601
    })
  end

  private

  def self.publish_message(topic, message)
    return unless $kafka

    begin
      $kafka.deliver_message(
        message.to_json,
        topic: topic,
        key: message[:offering_id] || message[:user_id] || SecureRandom.uuid
      )
      Rails.logger.info "Published message to #{topic}: #{message}"
    rescue => e
      Rails.logger.error "Failed to publish message to #{topic}: #{e.message}"
    end
  end
end 
class EventService
  def self.publish_offering_created(offering)
    publish_event(KAFKA_TOPICS[:offering_created], {
      offering_id: offering.id,
      tutor_id: offering.tutor_id,
      lesson_id: offering.lesson_id,
      price: offering.price,
      duration: offering.duration,
      created_at: offering.created_at,
      lesson: {
        name: offering.lesson.name,
        subject: offering.lesson.subject,
        age_group: offering.lesson.age_group
      },
      tutor: {
        name: offering.tutor.name,
        email: offering.tutor.email
      }
    })
  end

  def self.publish_offering_updated(offering)
    publish_event(KAFKA_TOPICS[:offering_updated], {
      offering_id: offering.id,
      tutor_id: offering.tutor_id,
      lesson_id: offering.lesson_id,
      price: offering.price,
      duration: offering.duration,
      updated_at: offering.updated_at,
      lesson: {
        name: offering.lesson.name,
        subject: offering.lesson.subject,
        age_group: offering.lesson.age_group
      },
      tutor: {
        name: offering.tutor.name,
        email: offering.tutor.email
      }
    })
  end

  def self.publish_offering_deleted(offering_id, tutor_id, lesson_id)
    publish_event(KAFKA_TOPICS[:offering_deleted], {
      offering_id: offering_id,
      tutor_id: tutor_id,
      lesson_id: lesson_id,
      deleted_at: Time.current
    })
  end

  def self.publish_user_enrolled(student_id, offering_id, tutor_id)
    publish_event(KAFKA_TOPICS[:user_enrolled], {
      student_id: student_id,
      offering_id: offering_id,
      tutor_id: tutor_id,
      enrolled_at: Time.current
    })
  end

  def self.publish_search_performed(user_id, search_term, filters, result_count)
    # Use the new KafkaService for better performance
    KafkaService.publish_search_performed(user_id, search_term, filters, result_count)
  end

  private

  def self.publish_event(topic, payload)
    return unless $kafka

    begin
      producer = $kafka.producer
      producer.produce(
        payload.to_json,
        topic: topic,
        key: SecureRandom.uuid
      )
      producer.deliver_messages
      producer.shutdown
      
      Rails.logger.info "Published event to #{topic}: #{payload}"
    rescue => e
      Rails.logger.error "Failed to publish event to #{topic}: #{e.message}"
    end
  end
end 
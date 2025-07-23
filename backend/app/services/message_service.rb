class MessageService
  CACHE_TTL = 1.hour

  def self.get_conversations(user)
    Rails.logger.info "[MessageService] Getting conversations for user: #{user.id} (#{user.email})"
    cache_key = "conversations:#{user.id}"
    cached = Rails.cache.read(cache_key)
    Rails.logger.info "[MessageService] Cache read for key #{cache_key}: #{cached ? 'HIT' : 'MISS'}"
    if cached
      Rails.logger.info "[MessageService] Returning cached conversations: #{cached.length}"
      return cached
    end

    sent_to_users = Message.where(sender: user).select(:receiver_id).distinct
    received_from_users = Message.where(receiver: user).select(:sender_id).distinct
    Rails.logger.info "[MessageService] Users sent messages to: #{sent_to_users.map { |u| "#{u.receiver_id} (#{u.receiver&.email})" }}"
    Rails.logger.info "[MessageService] Users received messages from: #{received_from_users.map { |u| "#{u.sender_id} (#{u.sender&.email})" }}"
    all_user_ids = (sent_to_users.map(&:receiver_id) + received_from_users.map(&:sender_id)).uniq - [user.id]
    all_users = User.where(id: all_user_ids)
    conversations = []
    all_users.each do |other_user|
      last_message = Message.between_users(user.id, other_user.id).last
      unread_count = user.received_messages.where(sender: other_user, read: false).count
      messages_between = Message.between_users(user.id, other_user.id)
      only_placeholder = messages_between.count == 1 && messages_between.first.content == '[conversation started]'
      Rails.logger.info "[MessageService] Conversation with user #{other_user.id} only has placeholder: #{only_placeholder}"
      conversation_data = {
        user_id: other_user.id.to_s,
        name: other_user.name,
        email: other_user.email,
        profile_image_url: other_user.profile_image_url,
        last_message: last_message&.content,
        last_message_time: last_message&.created_at,
        unread_count: unread_count,
        is_online: false # TODO: implement online status
      }
      Rails.logger.info "[MessageService] Adding conversation for user #{other_user.id}: #{conversation_data[:name]} (last_message: #{conversation_data[:last_message]})"
      Rails.logger.info "[MessageService] Full conversation_data: #{conversation_data.inspect}"
      conversations << conversation_data
    end
    Rails.logger.info "[MessageService] Returning conversations: #{conversations.size}"
    Rails.cache.write(cache_key, conversations, expires_in: 5.minutes)
    Rails.logger.info "[MessageService] Cache write for key #{cache_key}: #{conversations.size} conversations"
    conversations
  end

  def self.get_messages(user1_id, user2_id, limit: 50)
    Rails.logger.info "[MessageService] Getting messages between users #{user1_id} and #{user2_id}"
    
    cache_key = "messages:#{user1_id}:#{user2_id}"
    
    # Try cache first
    cached_messages = get_cached_messages(cache_key)
    if cached_messages
      Rails.logger.info "[MessageService] Returning cached messages: #{cached_messages.length}"
      return cached_messages
    end

    messages = Message.between_users(user1_id, user2_id)
                     .includes(:sender, :receiver)
                     .limit(limit)
                     .order(created_at: :desc)
                     .reverse

    only_placeholder = messages.count == 1 && messages.first&.content == '[conversation started]'
    Rails.logger.info "[MessageService] Only placeholder message exists: #{only_placeholder}"

    Rails.logger.info "[MessageService] Found #{messages.length} messages"

    # Mark messages as read
    mark_messages_as_read(user1_id, user2_id)

    # Cache messages
    cache_messages(cache_key, messages)

    messages
  end

  def self.send_message(sender_id, receiver_id, content)
    Rails.logger.info "[MessageService] Sending message from #{sender_id} to #{receiver_id}: #{content[0..50]}..."
    
    # Validate users exist
    sender = User.find_by(id: sender_id)
    receiver = User.find_by(id: receiver_id)
    
    unless sender && receiver
      raise "Invalid sender or receiver"
    end
    
    message = Message.create!(
      sender_id: sender_id,
      receiver_id: receiver_id,
      content: content,
      read: false
    )

    Rails.logger.info "[MessageService] Message created with ID: #{message.id}"

    # Invalidate caches
    invalidate_conversation_caches(sender_id, receiver_id)
    
    # Publish to Kafka for real-time updates
    KafkaService.publish_message_sent(message)
    
    # Cache the new message
    cache_new_message(message)

    # Ensure associations are loaded
    message.sender = sender
    message.receiver = receiver

    message
  rescue => e
    Rails.logger.error "[MessageService] Failed to send message: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise e
  end

  def self.mark_messages_as_read(user1_id, user2_id)
    Rails.logger.info "[MessageService] Marking messages as read between users #{user1_id} and #{user2_id}"
    
    unread_messages = Message.where(
      sender_id: user2_id,
      receiver_id: user1_id,
      read: false
    )
    
    count = unread_messages.count
    Rails.logger.info "[MessageService] Marking #{count} messages as read"
    
    unread_messages.update_all(read: true, read_at: Time.current)
    
    # Publish read status to Kafka
    KafkaService.publish_messages_read(user1_id, user2_id, count)
  end

  def self.get_unread_count(user_id)
    Rails.logger.info "[MessageService] Getting unread count for user: #{user_id}"
    
    return 0 unless $redis

    begin
      cache_key = "unread_count:#{user_id}"
      cached_count = $redis.get(cache_key)
      if cached_count
        Rails.logger.info "[MessageService] Returning cached unread count: #{cached_count}"
        return cached_count.to_i
      end
    rescue => e
      Rails.logger.error "Failed to get cached unread count: #{e.message}"
    end

    count = Message.where(receiver_id: user_id, read: false).count
    Rails.logger.info "[MessageService] Calculated unread count: #{count}"
    
    # Cache the count
    cache_unread_count(user_id, count)
    
    count
  end

  private

  def self.get_cached_conversations(user_id)
    return nil unless $redis

    begin
      cache_key = "conversations:#{user_id}"
      cached_data = $redis.get(cache_key)
      if cached_data
        Rails.logger.info "[MessageService] Found cached conversations for user #{user_id}"
        return JSON.parse(cached_data)
      end
    rescue => e
      Rails.logger.error "Failed to get cached conversations: #{e.message}"
    end
    
    nil
  end

  def self.cache_conversations(user_id, conversations)
    return unless $redis

    begin
      cache_key = "conversations:#{user_id}"
      $redis.setex(cache_key, CACHE_TTL, conversations.to_json)
      Rails.logger.info "[MessageService] Cached #{conversations.length} conversations for user #{user_id}"
    rescue => e
      Rails.logger.error "Failed to cache conversations: #{e.message}"
    end
  end

  def self.get_cached_messages(cache_key)
    return nil unless $redis

    begin
      cached_data = $redis.get(cache_key)
      if cached_data
        Rails.logger.info "[MessageService] Found cached messages for key: #{cache_key}"
        message_hashes = JSON.parse(cached_data)
        # Convert back to Message objects
        message_ids = message_hashes.map { |h| h['id'] }
        messages = Message.includes(:sender, :receiver).where(id: message_ids)
        messages_by_id = messages.index_by(&:id)
        message_ids.map { |id| messages_by_id[id] }.compact
      end
    rescue => e
      Rails.logger.error "Failed to get cached messages: #{e.message}"
    end
    
    nil
  end

  def self.cache_messages(cache_key, messages)
    return unless $redis

    begin
      serialized_messages = messages.map(&:as_json)
      $redis.setex(cache_key, CACHE_TTL, serialized_messages.to_json)
      Rails.logger.info "[MessageService] Cached #{messages.length} messages for key: #{cache_key}"
    rescue => e
      Rails.logger.error "Failed to cache messages: #{e.message}"
    end
  end

  def self.cache_new_message(message)
    return unless $redis

    begin
      # Add to conversation cache
      sender_cache_key = "conversations:#{message.sender_id}"
      receiver_cache_key = "conversations:#{message.receiver_id}"
      
      # Invalidate conversation caches
      $redis.del(sender_cache_key, receiver_cache_key)
      Rails.logger.info "[MessageService] Invalidated conversation caches for users #{message.sender_id} and #{message.receiver_id}"
      
      # Update unread count cache
      unread_cache_key = "unread_count:#{message.receiver_id}"
      current_count = $redis.get(unread_cache_key) || 0
      $redis.setex(unread_cache_key, CACHE_TTL, current_count.to_i + 1)
    rescue => e
      Rails.logger.error "Failed to cache new message: #{e.message}"
    end
  end

  def self.invalidate_conversation_caches(user1_id, user2_id)
    return unless $redis

    begin
      # Invalidate conversation caches for both users
      $redis.del("conversations:#{user1_id}", "conversations:#{user2_id}")
      
      # Invalidate message caches
      $redis.del("messages:#{user1_id}:#{user2_id}", "messages:#{user2_id}:#{user1_id}")
      
      Rails.logger.info "[MessageService] Invalidated caches for users #{user1_id} and #{user2_id}"
    rescue => e
      Rails.logger.error "Failed to invalidate conversation caches: #{e.message}"
    end
  end

  def self.cache_unread_count(user_id, count)
    return unless $redis

    begin
      cache_key = "unread_count:#{user_id}"
      $redis.setex(cache_key, CACHE_TTL, count)
      Rails.logger.info "[MessageService] Cached unread count #{count} for user #{user_id}"
    rescue => e
      Rails.logger.error "Failed to cache unread count: #{e.message}"
    end
  end

  def self.check_user_online(user_id)
    return false unless $redis

    begin
      online_key = "user_online:#{user_id}"
      $redis.exists(online_key)
    rescue => e
      Rails.logger.error "Failed to check user online status: #{e.message}"
      false
    end
  end
end 
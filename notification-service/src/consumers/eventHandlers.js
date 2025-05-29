const Notification = require('../models/Notification');
const { sendEvent } = require('../utils/aiven-kafka');
const io = require('socket.io-client');
const User = require('../models/User');

// Connect to WebSocket server for notification delivery
console.log('Attempting to connect to WebSocket server at:', process.env.WEBSOCKET_SERVER || 'http://localhost:3002');

const socketClient = io(process.env.WEBSOCKET_SERVER || 'http://localhost:3002', {
  reconnection: true,
  reconnectionAttempts: Infinity,  // Try to reconnect indefinitely
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: true,
  transports: ['websocket', 'polling']
});

// Setup socket connection events
socketClient.on('connect', () => {
  console.log('✅ Notification service connected to WebSocket server at:', process.env.WEBSOCKET_SERVER || 'http://localhost:3002');
  console.log('Socket ID:', socketClient.id);
});

socketClient.on('connect_error', (error) => {
  console.error('❌ Error connecting to WebSocket server:', error.message);
  console.error('Connection options:', {
    url: process.env.WEBSOCKET_SERVER || 'http://localhost:3002',
    error: error.toString(),
    transport: socketClient.io.engine?.transport?.name
  });
  // Connection will be retried automatically due to reconnection: true
});

socketClient.on('disconnect', () => {
  console.log('Notification service disconnected from WebSocket server - will try to reconnect automatically');
});

// Add connection retry logic
let reconnectTimer = null;
const ensureSocketConnection = () => {
  if (!socketClient.connected && !reconnectTimer) {
    console.log('Socket not connected, attempting to reconnect...');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!socketClient.connected) {
        socketClient.connect();
      }
    }, 2000);
  }
  return socketClient.connected;
};

// Setup additional socket event handlers
socketClient.on('welcome', (data) => {
  console.log('Received welcome message from API server:', data.message);
});

socketClient.on('notificationReceived', (data) => {
  console.log('Notification receipt acknowledged:', data);
});

socketClient.on('notificationError', (data) => {
  console.error('Error delivering notification:', data.error);
});

// AI Relevance score calculation
const calculateRelevanceScore = (eventType, payload) => {
  // This would be more sophisticated in a real implementation
  // with user history and context
  
  let baseScore = 50;
  
  // Event type factor
  switch (eventType) {
    case 'user.follow':
      baseScore += 20;
      break;
    case 'post.comment':
      baseScore += 15;
      break;
    case 'post.like':
      baseScore += 10;
      break;
    case 'post.mention':
      baseScore += 25;
      break;
    case 'post.create':
      baseScore += 5;
      break;
  }
  
  // Time factor - newer events get higher score
  baseScore += 10; // All events are fresh when processed
  
  return Math.min(100, Math.max(0, baseScore));
};

// Process notification and deliver
const processNotification = async (notification) => {
  try {
    // Save notification to database
    const savedNotification = await Notification.create(notification);
    
    console.log(`Emitting notification to room user:${notification.recipient}:`, JSON.stringify(savedNotification));
    
    // Ensure socket connection before emitting
    ensureSocketConnection();
    
    // Emit to WebSocket server with timeout and retry
    const emitWithRetry = (retries = 5) => {
      if (!socketClient.connected) {
        if (retries > 0) {
          console.log(`Socket not connected, retrying in 1s... (${retries} attempts left)`);
          setTimeout(() => emitWithRetry(retries - 1), 1000);
          return;
        } else {
          console.error('Failed to deliver notification - socket disconnected');
        }
      }
      
      socketClient.emit('notification', {
        room: `user:${notification.recipient}`,
        data: savedNotification
      }, (ack) => {
        // This callback is executed if the server acknowledges the event
        if (ack) {
          console.log('Notification delivery acknowledged by server');
        }
      });
    };
    
    emitWithRetry(5);
    
    // Emit event to Kafka with robust retry
    const kafkaEvent = {
      eventType: 'notification.created',
      actorId: 'system',
      targetId: savedNotification._id.toString(),
      targetType: 'Notification',
      payload: {
        notificationType: notification.type,
        recipientId: notification.recipient,
        senderId: notification.sender,
        content: notification.content,
        relevanceScore: notification.relevanceScore
      }
    };
    
    // Use the more robust sendEvent with built-in retries
    sendEvent('notification-events', kafkaEvent, 5)
      .then(sent => {
        if (sent) {
          console.log('Notification event sent to Kafka successfully');
        } else {
          console.error('Failed to send notification event to Kafka after retries');
        }
      })
      .catch(error => {
        console.error('Error in Kafka notification send:', error.message);
    });
    
    console.log(`Notification sent to user ${notification.recipient}`);
    return savedNotification;
  } catch (error) {
    console.error(`Error processing notification: ${error.message}`);
    return null;
  }
};

// Handle user events
const handleUserEvent = async (event) => {
  console.log(`Handling user event: ${event.eventType}`, JSON.stringify(event));
  
  switch (event.eventType) {
    case 'user.follow':
      console.log(`Processing follow notification: User ${event.actorId} followed ${event.targetId}`);
      
      // Create follow notification
      try {
        const notification = {
          recipient: event.targetId,
          sender: event.actorId,
          type: 'follow',
          refId: event.actorId,
          refModel: 'User',
          content: `${event.payload.actorDisplayName || 'Someone'} started following you`,
          relevanceScore: calculateRelevanceScore('user.follow', event.payload),
          createdAt: new Date()
        };
        
        console.log('Creating follow notification:', JSON.stringify(notification));
        const savedNotification = await processNotification(notification);
        console.log('Follow notification created:', savedNotification ? savedNotification._id : 'Failed');
      } catch (error) {
        console.error('Error creating follow notification:', error.message);
      }
      break;
      
    // We don't create notifications for unfollows in this POC
    // case 'user.unfollow':
    //   break;
      
    case 'user.profile.update':
      // For important profile updates, we could notify followers
      // Not implemented in this POC
      break;
  }
};

// Handle post events
const handlePostEvent = async (event) => {
  switch (event.eventType) {
    case 'post.create':
      // Create notification for followers of the post author
      await notifyFollowers(event);
      break;
      
    case 'post.like':
      // Create notification for post author about like
      await processNotification({
        recipient: event.payload.postAuthorId,
        sender: event.actorId,
        type: 'post_like',
        refId: event.targetId,
        refModel: 'Post',
        content: `${event.payload.actorDisplayName || 'Someone'} liked your post "${truncateTitle(event.payload.postTitle)}"`,
        relevanceScore: calculateRelevanceScore('post.like', event.payload),
        createdAt: new Date()
      });
      break;
  }
};

// Notify followers about a new post
const notifyFollowers = async (event) => {
  try {
    console.log(`Notifying followers about new post. ActorId: ${event.actorId}`);
    
    // Get all followers of the post author
    const user = await User.findById(event.actorId).select('followers username displayName');
    
    if (!user) {
      console.log(`User ${event.actorId} not found, cannot notify followers`);
      return;
    }
    
    console.log(`Found user ${user.username} with ${user.followers?.length || 0} followers`);
    
    if (!user.followers || user.followers.length === 0) {
      console.log(`User ${user.username} has no followers to notify`);
      return;
    }
    
    // Create notifications for each follower
    for (const followerId of user.followers) {
      try {
        console.log(`Creating notification for follower ${followerId} about new post ${event.targetId}`);
        
        const notification = {
          recipient: followerId,
          sender: event.actorId,
          type: 'new_post',
          refId: event.targetId,
          refModel: 'Post',
          content: `${event.payload.actorDisplayName || user.displayName || 'Someone'} published a new post: "${truncateTitle(event.payload.postTitle)}"`,
          relevanceScore: calculateRelevanceScore('post.create', event.payload),
          createdAt: new Date()
        };
        
        const savedNotification = await processNotification(notification);
        console.log(`Notification for follower ${followerId} created:`, savedNotification ? savedNotification._id : 'Failed');
      } catch (followerError) {
        console.error(`Error creating notification for follower ${followerId}:`, followerError.message);
      }
    }
    
    console.log(`Finished notifying all ${user.followers.length} followers about post ${event.targetId}`);
  } catch (error) {
    console.error(`Error notifying followers: ${error.message}`, error.stack);
  }
};

// Helper to truncate long post titles
const truncateTitle = (title, maxLength = 30) => {
  if (!title) return '';
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};

// Handle notification events
const handleNotificationEvent = async (event) => {
  console.log(`Handling notification event: ${event.eventType}`, JSON.stringify(event));
  
  switch (event.eventType) {
    case 'notification.read':
      // This is handled directly in the API service
      break;
      
    case 'notification.read_all':
      // This is handled directly in the API service
      break;
      
    case 'notification.test':
      console.log('Processing test notification');
      
      try {
        const notification = {
          recipient: event.payload.recipient,
          sender: event.payload.sender,
          type: 'test',
          refId: event.targetId,
          refModel: 'Test',
          content: event.payload.content || 'Test notification from Aiven Kafka',
          relevanceScore: event.payload.relevanceScore || 50,
          createdAt: new Date()
        };
        
        console.log('Creating test notification:', JSON.stringify(notification));
        const savedNotification = await processNotification(notification);
        console.log('Test notification created:', savedNotification ? savedNotification._id : 'Failed');
      } catch (error) {
        console.error('Error creating test notification:', error.message);
      }
      break;
  }
};

// Main handler function that routes events to specific handlers
const handleEvent = async (topic, event) => {
  console.log(`Processing event: ${event.eventType} from topic ${topic}`);
  
  try {
    switch (topic) {
      case 'user-events':
        await handleUserEvent(event);
        break;
        
      case 'post-events':
        await handlePostEvent(event);
        break;
        
      case 'notification-events':
        await handleNotificationEvent(event);
        break;
        
      default:
        console.log(`Unknown topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Error handling event: ${error.message}`);
  }
};

// Add handler to the event type map
const eventHandlers = {
  'user.follow': handleUserEvent,
  'user.unfollow': handleUserEvent,
  'user.profile.update': handleUserEvent,
  'post.create': handlePostEvent,
  'post.like': handlePostEvent,
  'post.comment': handlePostEvent,
  'notification.read': handleNotificationEvent,
  'notification.read_all': handleNotificationEvent,
  'notification.test': handleNotificationEvent
};

module.exports = {
  handleEvent,
  processNotification,
  calculateRelevanceScore,
  eventHandlers,
  socketClient,
  ensureSocketConnection
}; 
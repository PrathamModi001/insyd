# Data Models for Insyd Notification System

This document outlines the MongoDB schemas for our notification system.

## User Model

```javascript
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: '/default-avatar.png'
  },
  bio: {
    type: String,
    default: '',
    maxlength: 250
  },
  profession: {
    type: String,
    enum: ['Architect', 'Interior Designer', 'Landscape Architect', 'Urban Planner', 'Other'],
    default: 'Other'
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    followActivity: {
      type: Boolean,
      default: true
    },
    contentActivity: {
      type: Boolean,
      default: true
    },
    digestFrequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'never'],
      default: 'immediate'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
```

## Post Model

```javascript
const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  images: [{
    type: String
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
```

## Notification Model

```javascript
const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['follow', 'like', 'comment', 'mention', 'post', 'system'],
    required: true
  },
  refId: {
    // Reference to the object that triggered the notification (post, comment, etc.)
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'refModel'
  },
  refModel: {
    // The model name for the refId
    type: String,
    enum: ['Post', 'User', 'Comment'],
    required: function() { return this.refId != null; }
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relevanceScore: {
    // AI-generated score for notification importance (0-100)
    type: Number,
    default: 50
  },
  metadata: {
    // Additional data related to the notification
    type: mongoose.Schema.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying of user notifications
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
```

## Event Model (Optional - for debugging/auditing)

```javascript
const EventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['user.follow', 'user.unfollow', 'post.create', 'post.like', 'post.comment', 'post.mention']
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: {
    // ID of the target object (user, post, etc.)
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetType: {
    // Type of the target object
    type: String,
    enum: ['User', 'Post', 'Comment'],
    required: true
  },
  payload: {
    // Additional data related to the event
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});
```

## Data Flow Examples

### User Follow Notification Flow

1. User A follows User B
2. Frontend emits `user.follow` event to Kafka
3. Event contains:
   ```javascript
   {
     eventType: 'user.follow',
     actorId: 'userId_A',
     targetId: 'userId_B',
     targetType: 'User',
     payload: {}
   }
   ```
4. Notification service consumes event
5. Creates notification:
   ```javascript
   {
     recipient: 'userId_B',
     sender: 'userId_A',
     type: 'follow',
     refId: 'userId_A',
     refModel: 'User',
     content: 'User A started following you',
     isRead: false,
     relevanceScore: 80,
     metadata: {},
     createdAt: new Date()
   }
   ```
6. Notification is stored in MongoDB
7. WebSocket server pushes notification to User B if online

### Post Like Notification Flow

1. User A likes User B's post
2. Frontend emits `post.like` event to Kafka
3. Event contains:
   ```javascript
   {
     eventType: 'post.like',
     actorId: 'userId_A',
     targetId: 'postId_123',
     targetType: 'Post',
     payload: {
       postAuthorId: 'userId_B'
     }
   }
   ```
4. Notification service consumes event
5. Creates notification:
   ```javascript
   {
     recipient: 'userId_B',
     sender: 'userId_A',
     type: 'like',
     refId: 'postId_123',
     refModel: 'Post',
     content: 'User A liked your post',
     isRead: false,
     relevanceScore: 60,
     metadata: {
       postPreview: 'Beginning of post content...'
     },
     createdAt: new Date()
   }
   ```
6. Notification is stored in MongoDB
7. WebSocket server pushes notification to User B if online 
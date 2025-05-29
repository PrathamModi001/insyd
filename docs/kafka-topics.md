# Kafka Topics for Insyd Notification System

This document outlines the Kafka topics and message formats for the notification system.

## Topics Overview

| Topic Name | Purpose | Retention | Partitions | Replication Factor |
|------------|---------|-----------|------------|-------------------|
| `user-events` | Events related to user actions such as follows | 7 days | 3 | 1 (POC), 3 (Prod) |
| `content-events` | Events related to content interactions | 7 days | 3 | 1 (POC), 3 (Prod) |
| `notification-events` | Events related to notification delivery | 7 days | 3 | 1 (POC), 3 (Prod) |

## Message Formats

### User Events

#### `user.follow` Event
```json
{
  "eventType": "user.follow",
  "actorId": "user_id_of_follower",
  "targetId": "user_id_being_followed",
  "targetType": "User",
  "timestamp": "2023-08-15T13:30:00Z",
  "payload": {
    "actorUsername": "johndoe",
    "actorDisplayName": "John Doe"
  }
}
```

#### `user.unfollow` Event
```json
{
  "eventType": "user.unfollow",
  "actorId": "user_id_of_unfollower",
  "targetId": "user_id_being_unfollowed",
  "targetType": "User",
  "timestamp": "2023-08-15T13:30:00Z",
  "payload": {}
}
```

#### `user.profile.update` Event
```json
{
  "eventType": "user.profile.update",
  "actorId": "user_id",
  "targetId": "user_id",
  "targetType": "User",
  "timestamp": "2023-08-15T13:30:00Z",
  "payload": {
    "updatedFields": ["displayName", "profession"],
    "previousValues": {
      "displayName": "John Smith",
      "profession": "Other"
    },
    "newValues": {
      "displayName": "John Doe",
      "profession": "Architect"
    }
  }
}
```

### Content Events

#### `post.create` Event
```json
{
  "eventType": "post.create",
  "actorId": "user_id_of_author",
  "targetId": "post_id",
  "targetType": "Post",
  "timestamp": "2023-08-15T14:30:00Z",
  "payload": {
    "postContent": "Check out my new sustainable design!",
    "postTags": ["sustainable", "design"],
    "authorUsername": "johndoe",
    "authorDisplayName": "John Doe"
  }
}
```

#### `post.like` Event
```json
{
  "eventType": "post.like",
  "actorId": "user_id_of_liker",
  "targetId": "post_id",
  "targetType": "Post",
  "timestamp": "2023-08-15T15:30:00Z",
  "payload": {
    "postAuthorId": "user_id_of_post_author",
    "actorUsername": "janedoe",
    "actorDisplayName": "Jane Doe",
    "postContent": "Check out my new sustainable design!" // First 50 chars
  }
}
```

#### `post.unlike` Event
```json
{
  "eventType": "post.unlike",
  "actorId": "user_id_of_unliker",
  "targetId": "post_id",
  "targetType": "Post",
  "timestamp": "2023-08-15T15:45:00Z",
  "payload": {
    "postAuthorId": "user_id_of_post_author"
  }
}
```

#### `post.comment` Event
```json
{
  "eventType": "post.comment",
  "actorId": "user_id_of_commenter",
  "targetId": "post_id",
  "targetType": "Post",
  "timestamp": "2023-08-15T16:30:00Z",
  "payload": {
    "commentId": "comment_id",
    "commentText": "Great design! Love the sustainable approach.",
    "postAuthorId": "user_id_of_post_author",
    "actorUsername": "janedoe",
    "actorDisplayName": "Jane Doe",
    "postContent": "Check out my new sustainable design!" // First 50 chars
  }
}
```

#### `post.mention` Event
```json
{
  "eventType": "post.mention",
  "actorId": "user_id_of_mentioner",
  "targetId": "post_id",
  "targetType": "Post",
  "timestamp": "2023-08-15T17:30:00Z",
  "payload": {
    "mentionedUserIds": ["user_id_1", "user_id_2"],
    "actorUsername": "johndoe",
    "actorDisplayName": "John Doe",
    "postContent": "Check out @janedoe's contribution to @bobsmith's project!"
  }
}
```

### Notification Events

#### `notification.created` Event
```json
{
  "eventType": "notification.created",
  "actorId": "system",
  "targetId": "notification_id",
  "targetType": "Notification",
  "timestamp": "2023-08-15T13:35:00Z",
  "payload": {
    "notificationType": "follow",
    "recipientId": "user_id",
    "senderId": "follower_user_id",
    "content": "John Doe started following you",
    "relevanceScore": 80
  }
}
```

#### `notification.read` Event
```json
{
  "eventType": "notification.read",
  "actorId": "user_id",
  "targetId": "notification_id",
  "targetType": "Notification",
  "timestamp": "2023-08-15T14:00:00Z",
  "payload": {
    "notificationType": "follow"
  }
}
```

#### `notification.read_all` Event
```json
{
  "eventType": "notification.read_all",
  "actorId": "user_id",
  "targetId": "user_id",
  "targetType": "User",
  "timestamp": "2023-08-15T14:15:00Z",
  "payload": {
    "count": 5
  }
}
```

## Topic Creation Commands

For the POC setup, here are the Kafka topic creation commands:

```bash
# Create user-events topic
kafka-topics.sh --create --bootstrap-server localhost:9092 --topic user-events --partitions 3 --replication-factor 1

# Create content-events topic
kafka-topics.sh --create --bootstrap-server localhost:9092 --topic content-events --partitions 3 --replication-factor 1

# Create notification-events topic
kafka-topics.sh --create --bootstrap-server localhost:9092 --topic notification-events --partitions 3 --replication-factor 1
```

## Event Flow Examples

### Follow Notification Flow

1. User A follows User B
2. Frontend sends a request to `/api/users/[userB_id]/follow`
3. Backend processes the follow request and updates the database
4. Backend produces a `user.follow` event to the `user-events` topic
5. Notification service consumes the event
6. Notification service creates a notification record in the database
7. Notification service produces a `notification.created` event to the `notification-events` topic
8. WebSocket service consumes the event and sends a real-time notification to User B if online

### Post Like Notification Flow

1. User A likes a post by User B
2. Frontend sends a request to `/api/posts/[postId]/like`
3. Backend processes the like request and updates the database
4. Backend produces a `post.like` event to the `content-events` topic
5. Notification service consumes the event
6. Notification service creates a notification record in the database
7. Notification service produces a `notification.created` event to the `notification-events` topic
8. WebSocket service consumes the event and sends a real-time notification to User B if online 
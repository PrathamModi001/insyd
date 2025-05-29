# Insyd Notification System - System Design Document

## 1. Overview

The Insyd notification system is designed for the Architecture Industry platform, providing real-time and persistent notifications for user activities. The system notifies users about follows, content interactions (likes, comments, shares), and discovery events, enhancing user engagement and platform stickiness.

## 2. System Architecture

The system follows a microservices architecture with event-driven communication patterns:

```
┌────────────┐       ┌────────────┐       ┌────────────────┐
│            │       │            │       │                │
│  Frontend  │◄─────►│ API Service│◄─────►│ Kafka Topics   │
│  (Next.js) │       │ (Express)  │       │                │
│            │       │            │       └────────┬───────┘
└─────┬──────┘       └────────────┘                │
      │                                            │
      │                                            │
      │                                            ▼
      │                                     ┌──────────────┐
      │                                     │ Notification │
      │                                     │   Service    │
      │                                     │              │
      │                                     └──────┬───────┘
      │                                            │
      │                                            │
      │                                            ▼
      │                                     ┌──────────────┐
      │                                     │              │
      └────────────────────────────────────►│   MongoDB    │
                  WebSockets                │              │
                                            └──────────────┘
```

## 3. Flow of Execution

### 3.1 Authentication Flow

1. **User Login:**
   - User enters credentials on the frontend login page (`/frontend/src/components/UserLogin.js`)
   - Frontend sends authentication request to API service
   - API service validates credentials against MongoDB user records
   - Upon successful authentication, JWT token is generated and returned to frontend
   - Frontend stores token in local storage for subsequent requests
   - WebSocket connection established with user's authentication token

### 3.2 Content Interaction Flow (Post Liking Example)

1. **User Likes a Post:**
   - User clicks "Like" button on a post in the feed (`/frontend/src/components/PostList.js`)
   - Frontend sends POST request to API endpoint (e.g., `/api/posts/:postId/like`)

2. **API Service Processing:**
   - API service (`/backend/api-service/src/controllers/`) receives like request
   - Controller validates user authentication and permissions
   - Database update: Like is recorded in MongoDB (post document updated)
   - Response sent to frontend confirming successful like action

3. **Event Production to Kafka:**
   - After DB update, API service creates a post-like event
   - Event structure contains:
     ```json
     {
       "event_type": "post_liked",
       "timestamp": "2023-07-01T12:34:56Z",
       "actor": {
         "user_id": "user123",
         "username": "architect_jane"
       },
       "object": {
         "post_id": "post456",
         "post_title": "New Building Design"
       },
       "target": {
         "user_id": "user789",
         "username": "design_studio"
       }
     }
     ```
   - API service publishes event to Kafka topic `notification-events`
   - Kafka acknowledges receipt of message

4. **Kafka Message Handling:**
   - Event is persisted to Kafka log
   - Message is assigned to a partition based on user ID for ordered processing
   - Kafka retains message according to retention policy
   - Message becomes available to subscribed consumers

### 3.3 Notification Processing Flow

1. **Event Consumption:**
   - Notification service (`/backend/notification-service/src/consumers/`) continuously polls Kafka
   - Consumer receives the post-like event from `content-events` topic
   - Event is deserialized and validated

2. **Notification Logic Application:**
   - Service applies business rules to determine notification relevance
   - Checks target user's notification preferences
   - Generates notification object:
     ```json
     {
       "notification_id": "notif123",
       "notification_type": "post_liked",
       "created_at": "2023-07-01T12:34:57Z",
       "read": false,
       "recipient_id": "user789",
       "actor": {
         "user_id": "user123",
         "username": "architect_jane"
       },
       "content": "architect_jane liked your post 'New Building Design'",
       "reference": {
         "post_id": "post456"
       }
     }
     ```

3. **Notification Storage:**
   - Notification document is saved to MongoDB notifications collection
   - Notification counters are updated for the recipient

4. **Real-time Delivery:**
   - Notification service identifies active WebSocket connections for recipient
   - Notification payload sent via WebSocket to connected clients
   - If recipient not connected, notification will be delivered on next connection

### 3.4 Frontend Notification Display

1. **Real-time Update Reception:**
   - WebSocket client in frontend (`/frontend/src/components/NotificationCenter.js`) receives notification
   - Frontend updates notification count and notification center UI
   - Visual and/or audio cue alerts user of new notification

2. **User Interaction with Notification:**
   - User opens notification center to view new notification
   - Clicking notification navigates to relevant content (the liked post)
   - Frontend marks notification as read via API call
   - API service updates notification status in MongoDB

### 3.5 Role of Kafka in the System

Kafka serves as the central nervous system for the notification infrastructure:

1. **Decoupling:**
   - API service and Notification service operate independently
   - API service can process user actions without direct dependency on notification delivery
   - System resilience: temporary notification service downtime doesn't affect core platform functionality

2. **Reliable Delivery:**
   - Events persisted to disk in Kafka log
   - Events not lost even if notification service temporarily unavailable
   - Configurable retention period ensures events are processed

3. **Scaling Benefits:**
   - Multiple notification service instances can consume from same topic using consumer groups
   - Partitioning allows parallel processing of notifications
   - Consumer offsets track processing progress independently

### 3.6 Notification Retrieval Flow

1. User opens the app or notification center
2. Frontend requests notification history via API
3. API service queries MongoDB for user's notifications
4. Notifications returned to frontend and displayed
5. WebSocket connection established for real-time updates
6. New notifications pushed to client as they occur

## 4. Scaling Considerations

### 4.1 Current Design (100 DAUs)

- Single instance of each service
- Basic Kafka setup with minimal partitioning
- Simple MongoDB without sharding
- Single WebSocket server instance

### 4.2 Scaling to 1M+ Users

**Horizontal Scaling:**
- Multiple API service instances behind load balancer
- Notification service scaled horizontally with consumer groups
- Kafka partitioning for parallel processing
- MongoDB sharding by user ID

**Caching Layer:**
- Redis for frequently accessed notifications
- Caching of notification counts and recent items
- Session caching for improved authentication performance

**Content Delivery:**
- CDN for static assets
- Edge caching for frequently accessed content

## 5. Conclusion

The Insyd notification system provides a scalable, reliable foundation for delivering real-time updates to users of the platform. Its event-driven architecture allows for loose coupling between services, enabling independent scaling and maintenance. While the current implementation addresses the needs of a startup with modest user numbers, the design accommodates future growth through horizontal scaling and performance optimizations. 
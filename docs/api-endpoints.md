# API Endpoints for Insyd Notification System

This document outlines the REST API endpoints for the Insyd notification system.

## Authentication
*Note: For the POC, we'll use simplified authentication. In production, we'd implement proper JWT authentication.*

## User Endpoints

### Create User
- **URL**: `/api/users`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "profession": "Architect",
    "bio": "I design sustainable buildings"
  }
  ```
- **Response**: 
  ```json
  {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "profession": "Architect",
    "bio": "I design sustainable buildings",
    "avatar": "/default-avatar.png",
    "following": [],
    "followers": [],
    "createdAt": "2023-08-15T10:30:00Z"
  }
  ```

### Get User
- **URL**: `/api/users/:userId`
- **Method**: `GET`
- **Response**: 
  ```json
  {
    "id": "user_id",
    "username": "johndoe",
    "displayName": "John Doe",
    "profession": "Architect",
    "bio": "I design sustainable buildings",
    "avatar": "/default-avatar.png",
    "following": [],
    "followers": [],
    "createdAt": "2023-08-15T10:30:00Z"
  }
  ```

### Get Users
- **URL**: `/api/users`
- **Method**: `GET`
- **Query Parameters**: 
  - `search`: Search by username or display name
  - `profession`: Filter by profession
  - `limit`: Number of results (default: 20)
  - `offset`: Pagination offset (default: 0)
- **Response**: 
  ```json
  {
    "users": [
      {
        "id": "user_id",
        "username": "johndoe",
        "displayName": "John Doe",
        "profession": "Architect",
        "avatar": "/default-avatar.png"
      }
    ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
  ```

### Follow User
- **URL**: `/api/users/:userId/follow`
- **Method**: `POST`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Successfully followed user"
  }
  ```

### Unfollow User
- **URL**: `/api/users/:userId/unfollow`
- **Method**: `POST`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Successfully unfollowed user"
  }
  ```

## Post Endpoints

### Create Post
- **URL**: `/api/posts`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "content": "Check out my new sustainable design!",
    "images": ["https://example.com/image.jpg"],
    "tags": ["sustainable", "design"]
  }
  ```
- **Response**: 
  ```json
  {
    "id": "post_id",
    "author": {
      "id": "user_id",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatar": "/default-avatar.png"
    },
    "content": "Check out my new sustainable design!",
    "images": ["https://example.com/image.jpg"],
    "likes": [],
    "comments": [],
    "tags": ["sustainable", "design"],
    "createdAt": "2023-08-15T11:30:00Z"
  }
  ```

### Get Post
- **URL**: `/api/posts/:postId`
- **Method**: `GET`
- **Response**: 
  ```json
  {
    "id": "post_id",
    "author": {
      "id": "user_id",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatar": "/default-avatar.png"
    },
    "content": "Check out my new sustainable design!",
    "images": ["https://example.com/image.jpg"],
    "likes": [],
    "comments": [],
    "tags": ["sustainable", "design"],
    "createdAt": "2023-08-15T11:30:00Z"
  }
  ```

### Get Posts
- **URL**: `/api/posts`
- **Method**: `GET`
- **Query Parameters**: 
  - `author`: Filter by author ID
  - `tag`: Filter by tag
  - `limit`: Number of results (default: 20)
  - `offset`: Pagination offset (default: 0)
- **Response**: 
  ```json
  {
    "posts": [
      {
        "id": "post_id",
        "author": {
          "id": "user_id",
          "username": "johndoe",
          "displayName": "John Doe",
          "avatar": "/default-avatar.png"
        },
        "content": "Check out my new sustainable design!",
        "images": ["https://example.com/image.jpg"],
        "likeCount": 5,
        "commentCount": 2,
        "tags": ["sustainable", "design"],
        "createdAt": "2023-08-15T11:30:00Z"
      }
    ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
  ```

### Like Post
- **URL**: `/api/posts/:postId/like`
- **Method**: `POST`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Successfully liked post"
  }
  ```

### Unlike Post
- **URL**: `/api/posts/:postId/unlike`
- **Method**: `POST`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Successfully unliked post"
  }
  ```

### Comment on Post
- **URL**: `/api/posts/:postId/comment`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "text": "Great design! Love the sustainable approach."
  }
  ```
- **Response**: 
  ```json
  {
    "id": "comment_id",
    "user": {
      "id": "user_id",
      "username": "janedoe",
      "displayName": "Jane Doe",
      "avatar": "/default-avatar.png"
    },
    "text": "Great design! Love the sustainable approach.",
    "createdAt": "2023-08-15T12:30:00Z"
  }
  ```

## Notification Endpoints

### Get User Notifications
- **URL**: `/api/notifications`
- **Method**: `GET`
- **Query Parameters**: 
  - `limit`: Number of results (default: 20)
  - `offset`: Pagination offset (default: 0)
  - `read`: Filter by read status (optional, `true`/`false`)
  - `type`: Filter by notification type (optional)
- **Response**: 
  ```json
  {
    "notifications": [
      {
        "id": "notification_id",
        "type": "follow",
        "sender": {
          "id": "user_id",
          "username": "janedoe",
          "displayName": "Jane Doe",
          "avatar": "/default-avatar.png"
        },
        "content": "Jane Doe started following you",
        "isRead": false,
        "createdAt": "2023-08-15T13:30:00Z"
      },
      {
        "id": "notification_id",
        "type": "like",
        "sender": {
          "id": "user_id",
          "username": "bobsmith",
          "displayName": "Bob Smith",
          "avatar": "/default-avatar.png"
        },
        "refId": "post_id",
        "refModel": "Post",
        "content": "Bob Smith liked your post",
        "isRead": true,
        "createdAt": "2023-08-15T12:30:00Z"
      }
    ],
    "unreadCount": 1,
    "total": 50,
    "limit": 20,
    "offset": 0
  }
  ```

### Mark Notification as Read
- **URL**: `/api/notifications/:notificationId/read`
- **Method**: `POST`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Notification marked as read"
  }
  ```

### Mark All Notifications as Read
- **URL**: `/api/notifications/read-all`
- **Method**: `POST`
- **Response**: 
  ```json
  {
    "success": true,
    "message": "All notifications marked as read",
    "count": 5
  }
  ```

### Update Notification Preferences
- **URL**: `/api/users/notification-preferences`
- **Method**: `PUT`
- **Body**:
  ```json
  {
    "email": true,
    "push": true,
    "followActivity": true,
    "contentActivity": false,
    "digestFrequency": "daily"
  }
  ```
- **Response**: 
  ```json
  {
    "notificationPreferences": {
      "email": true,
      "push": true,
      "followActivity": true,
      "contentActivity": false,
      "digestFrequency": "daily"
    }
  }
  ```

## WebSocket Events

The WebSocket server will emit the following events to connected clients:

### New Notification
```json
{
  "event": "notification",
  "data": {
    "id": "notification_id",
    "type": "follow",
    "sender": {
      "id": "user_id",
      "username": "janedoe",
      "displayName": "Jane Doe",
      "avatar": "/default-avatar.png"
    },
    "content": "Jane Doe started following you",
    "isRead": false,
    "createdAt": "2023-08-15T13:30:00Z"
  }
}
```

### Notification Count Update
```json
{
  "event": "notification_count",
  "data": {
    "unreadCount": 5
  }
}
``` 
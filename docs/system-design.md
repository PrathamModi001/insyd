# Insyd Notification System - System Design Document

## Overview

This document outlines the design for Insyd's notification system, a platform for the Architecture Industry. The system is designed to notify users of relevant activities including follows, content interactions, and discovery events.

## System Requirements

### Functional Requirements
- Alert users when someone follows them
- Notify users when their content receives interactions (likes, comments, shares)
- Inform users of new content from people they follow
- Allow users to manage notification preferences
- Support real-time and batch notifications

### Non-Functional Requirements
- Initially support 100 DAUs with architecture to scale to 1M+ DAUs
- Low latency for real-time notifications (<5 seconds)
- High reliability (notifications should not be lost)
- Cost-effective infrastructure for a bootstrapped startup

## Architecture Components

### 1. Core Services

#### User Service
- Manages user profiles and relationships
- Emits events when users follow/unfollow others

#### Content Service
- Handles posts, comments, and interactions
- Emits events when content is created or interacted with

#### Notification Service
- Processes events from other services
- Generates and stores notifications
- Delivers notifications to appropriate channels

### 2. Event Streaming Platform (Kafka)

Kafka serves as the central nervous system of our notification architecture:

- **Topics**:
  - `user-events`: Follow/unfollow events
  - `content-events`: Posts, comments, likes, shares
  - `notification-events`: Delivery status, read receipts

- **Benefits**:
  - Decouples services
  - Provides durability for events
  - Enables scaling of consumers independently
  - Maintains event ordering when needed

### 3. Data Storage

#### Notification Database (MongoDB)
- Stores notification records
- Tracks read/unread status
- Enables historical querying

#### User Preference Database
- Stores notification settings
- Controls delivery channels and frequency

### 4. Delivery Channels

#### WebSocket Server
- Maintains persistent connections with clients
- Pushes real-time notifications
- Updates notification center instantly

#### API Endpoints
- Fetch notification history
- Mark notifications as read
- Update notification preferences

## System Flow

1. **Event Generation**:
   - User actions trigger events (e.g., liking a post)
   - Events are published to appropriate Kafka topics

2. **Event Processing**:
   - Notification service consumes events
   - Applies filtering based on user preferences
   - Generates notification records
   - Stores notifications in database

3. **Notification Delivery**:
   - Real-time notifications sent via WebSockets
   - Notification counts updated
   - Periodic batch processing for digest notifications

## Scaling Considerations

### Current Design (100 DAUs)
- Single instance of each service
- Basic Kafka setup with minimal partitioning
- Simple database without sharding

### Future Scaling (1M+ DAUs)
- Horizontal scaling of all services
- Kafka topic partitioning for parallel processing
- Database sharding by user ID
- Caching layer for frequent notification queries
- CDN for static assets

## AI Integration Opportunities

1. **Notification Relevance Scoring**:
   - Rank notifications by predicted importance
   - Reduce notification fatigue

2. **Content Summarization**:
   - Generate concise notification text
   - Highlight key information

3. **Delivery Optimization**:
   - Determine optimal delivery times
   - Batch notifications intelligently

## Limitations and Considerations

1. **Cold Start Problem**:
   - New users have limited network and content
   - AI models need data to be effective

2. **Network Effects**:
   - Value increases with user count
   - Initial growth requires alternative engagement strategies

3. **Technical Debt**:
   - POC implementation may require refactoring for scale
   - Some components prioritize speed of implementation over optimal architecture

## Monitoring and Metrics

Key performance indicators to track:
- Notification delivery latency
- Read rates and interaction rates
- System resource utilization
- Error rates and failed deliveries

## Security Considerations

- All API endpoints properly authenticated
- Data segregation between users
- Rate limiting to prevent abuse
- Data retention policies for notifications 
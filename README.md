# Insyd Notification System

A proof-of-concept notification system for Insyd, a social platform for the Architecture Industry.

## Overview

This project implements a notification system that can handle various types of notifications for a social platform, including:
- Follow notifications
- Post interactions (likes, comments)
- Content mentions
- System notifications

The architecture is built with scalability in mind, starting with a simple implementation for 100 DAUs but designed to scale to 1M+ users.

## Project Structure

- `/docs` - System design and technical documentation
- `/frontend` - Next.js frontend application
- `/backend` - Node.js backend services
  - `/api-service` - Main REST API
  - `/notification-service` - Notification processing service

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Message Broker**: Apache Kafka
- **Real-time Communication**: Socket.io

## Prerequisites

- Node.js 16+
- MongoDB
- Kafka & Zookeeper (running in Docker)

## Getting Started

### 1. Set up MongoDB

Make sure MongoDB is running locally or update the connection string in the .env files.

### 2. Set up Kafka

Ensure Kafka is running in Docker with the following topics created:
- `user-events`
- `content-events`
- `notification-events`

You can create these topics with:

```bash
kafka-topics.sh --create --bootstrap-server localhost:9092 --topic user-events --partitions 3 --replication-factor 1
kafka-topics.sh --create --bootstrap-server localhost:9092 --topic content-events --partitions 3 --replication-factor 1
kafka-topics.sh --create --bootstrap-server localhost:9092 --topic notification-events --partitions 3 --replication-factor 1
```

### 3. Set up environment variables

Copy the example environment files and configure as needed:

```bash
cp backend/api-service/env.example backend/api-service/.env
cp backend/notification-service/env.example backend/notification-service/.env
cp frontend/env.example frontend/.env
```

### 4. Install dependencies

```bash
# API Service
cd backend/api-service
npm install

# Notification Service
cd ../../backend/notification-service
npm install

# Frontend
cd ../../frontend
npm install
```

### 5. Start the services

In separate terminals:

```bash
# API Service
cd backend/api-service
npm run dev

# Notification Service
cd backend/notification-service
npm run dev

# Frontend
cd frontend
npm run dev
```

## Using the Application

1. Open your browser to `http://localhost:3000`
2. Create some test users via the API (or use the UI if implemented)
3. Follow users to generate notifications
4. See real-time notifications appear in the UI

## Key Features

- **Event-driven architecture** using Kafka for reliable message delivery
- **Real-time notifications** using WebSockets
- **AI-enhanced relevance scoring** for notification prioritization
- **MongoDB** for flexible data storage
- **RESTful API** for client interactions

## System Design

For a detailed explanation of the system design, see the [System Design Document](docs/system-design.md).

## API Documentation

See the [API Endpoints](docs/api-endpoints.md) document for details on the available REST APIs.

## Kafka Topics and Events

See the [Kafka Topics](docs/kafka-topics.md) document for details on the event structure.

## AI Integration

This project leverages AI for:
- Notification relevance scoring
- Personalized notification content generation
- Smart notification batching

For more details, see the [AI Integration Document](docs/ai-integration.md).

## Future Enhancements

- Authentication and authorization
- Content creation and interaction
- Mobile push notifications
- Email notifications
- Analytics dashboard

## License

MIT 
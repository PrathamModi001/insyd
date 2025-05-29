#!/bin/bash

# Insyd Notification System Setup Script

echo "Setting up Insyd Notification System..."

# Create environment files if they don't exist
if [ ! -f backend/api-service/.env ]; then
  echo "Creating API service .env file..."
  cp backend/api-service/env.example backend/api-service/.env
fi

if [ ! -f backend/notification-service/.env ]; then
  echo "Creating notification service .env file..."
  cp backend/notification-service/env.example backend/notification-service/.env
fi

if [ ! -f frontend/.env ]; then
  echo "Creating frontend .env file..."
  cp frontend/env.example frontend/.env
fi

# Install dependencies
echo "Installing API service dependencies..."
cd backend/api-service
npm install
cd ../..

echo "Installing notification service dependencies..."
cd backend/notification-service
npm install
cd ../..

echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "Setup complete!"
echo ""
echo "To start the services:"
echo "1. Make sure MongoDB is running"
echo "2. Make sure Kafka is running with the required topics created"
echo "3. Start the API service: cd backend/api-service && npm run dev"
echo "4. Start the notification service: cd backend/notification-service && npm run dev"
echo "5. Start the frontend: cd frontend && npm run dev"
echo ""
echo "Open your browser to http://localhost:3000 to use the application." 
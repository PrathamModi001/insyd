const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import utilities
const connectDB = require('./utils/database');
// Use the Aiven Kafka utility
const { initKafka, subscribeToTopics, connectProducer } = require('./utils/aiven-kafka');

// Import event handlers
const { handleEvent } = require('./consumers/eventHandlers');

// Define Kafka topics to subscribe to
const topics = [
  'user-events',
  'post-events',
  'notification-events'
];

// Start the service
const startService = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Kafka - don't fail if Kafka connection has issues
    try {
    await initKafka();
    } catch (kafkaError) {
      console.error('Error initializing Kafka, will retry:', kafkaError.message);
      // Will retry connections later as needed
    }
    
    // Make sure producer is connected - essential for sending notifications
    setInterval(async () => {
      try {
        await connectProducer();
      } catch (error) {
        console.log('Background producer connection check failed:', error.message);
      }
    }, 10000); // Check every 10 seconds
    
    // Subscribe to Kafka topics - with retry mechanism built into subscribeToTopics
    try {
    await subscribeToTopics(topics, handleEvent);
    } catch (topicError) {
      console.error('Error subscribing to topics:', topicError.message);
      // The subscribeToTopics function has its own retry mechanism
    }
    
    console.log('Notification service started');
  } catch (error) {
    console.error(`Failed to start notification service: ${error.message}`);
    // Don't exit, try to recover
    console.log('Service will continue with limited functionality and retry connections');
  }
};

// Add graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't crash, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash, log and continue
});

startService(); 
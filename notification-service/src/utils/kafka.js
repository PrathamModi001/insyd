const { Kafka } = require('kafkajs');
require('dotenv').config();

// Create Kafka client
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'insyd-notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

// Create producer and consumer
const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group' 
});

// Initialize Kafka connections
const initKafka = async () => {
  try {
    // Connect producer
    await producer.connect();
    console.log('Kafka producer connected');
    
    // Connect consumer
    await consumer.connect();
    console.log('Kafka consumer connected');
    
    return { producer, consumer };
  } catch (error) {
    console.error(`Error connecting to Kafka: ${error.message}`);
    process.exit(1);
  }
};

// Send event to Kafka
const sendEvent = async (topic, event) => {
  try {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    await producer.send({
      topic,
      messages: [
        { 
          key: event.targetId.toString(),
          value: JSON.stringify(event)
        },
      ],
    });

    console.log(`Event sent to ${topic}: ${event.eventType}`);
    return true;
  } catch (error) {
    console.error(`Error sending event to Kafka: ${error.message}`);
    return false;
  }
};

// Subscribe to topics
const subscribeToTopics = async (topics, messageHandler) => {
  try {
    // Subscribe to all topics
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    
    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`Received event from ${topic}: ${event.eventType}`);
          
          // Process message with handler
          await messageHandler(topic, event);
        } catch (error) {
          console.error(`Error processing message: ${error.message}`);
        }
      },
    });
    
    console.log(`Subscribed to topics: ${topics.join(', ')}`);
  } catch (error) {
    console.error(`Error subscribing to topics: ${error.message}`);
    process.exit(1);
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  initKafka,
  sendEvent,
  subscribeToTopics,
}; 
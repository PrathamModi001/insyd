const { Kafka } = require('kafkajs');
const Rdkafka = require('node-rdkafka');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Connection status tracking
let producerConnected = false;
let consumerConnected = false;
let reconnectTimer = null;
const RECONNECT_INTERVAL = 5000; // 5 seconds

// Get CA certificate from environment
let caCert;
try {
  if (process.env.CA_CERT) {
    console.log('Using CA certificate from environment variable');
    caCert = Buffer.from(process.env.CA_CERT);
    console.log('✅ CA certificate loaded successfully from environment');
  } else {
    // Fallback to file if environment variable is not set
    const caCertPath = process.env.CA_CERT_PATH || './ca.pem';
    // Use absolute path to make sure we can find the certificate
    const absoluteCertPath = path.resolve(process.cwd(), caCertPath);
    console.log(`Loading CA certificate from file: ${absoluteCertPath}`);
    caCert = fs.readFileSync(absoluteCertPath);
    console.log('✅ CA certificate loaded successfully from file');
  }
} catch (error) {
  console.error(`❌ Error loading CA certificate: ${error.message}`);
  console.log('Will attempt to connect without certificate');
}

// KafkaJS configuration for Aiven
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'insyd-notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  // Use explicit SSL configuration with CA certificate
  ssl: {
    ca: [caCert],
    rejectUnauthorized: false  // Allow self-signed certificates
  },
  sasl: {
    mechanism: process.env.KAFKA_MECHANISM || 'PLAIN',
    username: process.env.KAFKA_USERNAME || 'avnadmin',
    password: process.env.KAFKA_PASSWORD || '',
  },
  connectionTimeout: 30000, // 30 seconds
  retry: {
    initialRetryTime: 300,
    retries: 15,
    maxRetryTime: 30000,
    factor: 0.2
  }
});

// Create producer and consumer
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  idempotent: true,
  maxInFlightRequests: 5
});

const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytes: 10485760 // 10MB
});

// Node-rdkafka configuration (alternative implementation)
const getRdKafkaConfig = () => {
  const config = {
    'metadata.broker.list': process.env.KAFKA_BROKERS || 'localhost:9092',
    'client.id': process.env.KAFKA_CLIENT_ID || 'insyd-notification-service',
    'security.protocol': 'sasl_ssl',
    'sasl.mechanisms': process.env.KAFKA_MECHANISM || 'PLAIN',
    'sasl.username': process.env.KAFKA_USERNAME || 'avnadmin',
    'sasl.password': process.env.KAFKA_PASSWORD || '',
    'debug': 'broker,security',
    'dr_cb': true,
    'enable.ssl.certificate.verification': false  // Allow self-signed certificates
  };
  
  // If using file-based certificate (fallback)
  if (!process.env.CA_CERT && process.env.CA_CERT_PATH) {
    const absoluteCertPath = path.resolve(process.cwd(), process.env.CA_CERT_PATH || './ca.pem');
    config['ssl.ca.location'] = absoluteCertPath;
  } 
  // If using certificate content from environment
  else if (process.env.CA_CERT) {
    // node-rdkafka doesn't support passing certificate content directly
    // would need to write to temp file, but we'll rely on KafkaJS for this scenario
    console.log('node-rdkafka config: Using KafkaJS for SSL with certificate from environment');
  }
  
  return config;
};

// Connect the producer with retry logic
const connectProducer = async () => {
  if (producerConnected) {
    return true;
  }
  
  try {
    console.log('Connecting Kafka producer...');
    await producer.connect();
    producerConnected = true;
    console.log('✅ Kafka producer connected successfully');
    
    // Add event listeners for connection events
    producer.on('producer.connect', () => {
      console.log('✅ Kafka producer connected event fired');
      producerConnected = true;
    });
    
    producer.on('producer.disconnect', () => {
      console.log('⚠️ Kafka producer disconnected event fired');
      producerConnected = false;
      
      // Schedule reconnection if not already scheduled
      if (!reconnectTimer) {
        console.log(`Scheduling producer reconnection in ${RECONNECT_INTERVAL}ms`);
        reconnectTimer = setTimeout(async () => {
          reconnectTimer = null;
          try {
            await producer.connect();
            producerConnected = true;
            console.log('✅ Kafka producer reconnected successfully');
          } catch (reconnectError) {
            console.error('❌ Failed to reconnect producer:', reconnectError.message);
            // Try again later
            producerConnected = false;
          }
        }, RECONNECT_INTERVAL);
      }
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error connecting Kafka producer: ${error.message}`);
    producerConnected = false;
    return false;
  }
};

// Connect the consumer with retry logic
const connectConsumer = async () => {
  if (consumerConnected) {
    return true;
  }
  
  try {
    console.log('Connecting Kafka consumer...');
    await consumer.connect();
    consumerConnected = true;
    console.log('✅ Kafka consumer connected successfully');
    
    // Add event listeners for connection events
    consumer.on('consumer.connect', () => {
      console.log('✅ Kafka consumer connected event fired');
      consumerConnected = true;
    });
    
    consumer.on('consumer.disconnect', () => {
      console.log('⚠️ Kafka consumer disconnected event fired');
      consumerConnected = false;
      
      // Schedule reconnection
      setTimeout(async () => {
        try {
          await consumer.connect();
          consumerConnected = true;
          console.log('✅ Kafka consumer reconnected successfully');
        } catch (reconnectError) {
          console.error('❌ Failed to reconnect consumer:', reconnectError.message);
          consumerConnected = false;
        }
      }, RECONNECT_INTERVAL);
    });
    
    consumer.on('consumer.crash', (event) => {
      console.error('❌ Kafka consumer crashed:', event);
      consumerConnected = false;
      
      // Schedule restart
      setTimeout(async () => {
        try {
          await consumer.connect();
          consumerConnected = true;
          console.log('✅ Kafka consumer restarted after crash');
        } catch (restartError) {
          console.error('❌ Failed to restart consumer after crash:', restartError.message);
          consumerConnected = false;
        }
      }, RECONNECT_INTERVAL);
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error connecting Kafka consumer: ${error.message}`);
    consumerConnected = false;
    return false;
  }
};

// Initialize Kafka connections
const initKafka = async () => {
  try {
    console.log('Connecting to Aiven Kafka...');
    console.log(`Broker: ${process.env.KAFKA_BROKERS}`);
    console.log(`Username: ${process.env.KAFKA_USERNAME}`);
    console.log(`SSL Enabled: ${process.env.KAFKA_SSL}`);
    
    // Connect producer and consumer
    await connectProducer();
    await connectConsumer();
    
    return { producer, consumer };
  } catch (error) {
    console.error(`❌ Error connecting to Aiven Kafka: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    // Don't exit, let's try to recover
    console.log('Will continue and retry connections as needed');
    return { producer, consumer };
  }
};

// Send event to Kafka with robust error handling and retries
const sendEvent = async (topic, event, retryCount = 3) => {
  try {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Make sure producer is connected
    if (!producerConnected) {
      console.log('Producer not connected, attempting to connect...');
      const connected = await connectProducer();
      if (!connected && retryCount <= 0) {
        console.error('Failed to connect producer after retries');
        return false;
      } else if (!connected) {
        // Wait and retry
        console.log(`Waiting ${RECONNECT_INTERVAL}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, RECONNECT_INTERVAL));
        return sendEvent(topic, event, retryCount - 1);
      }
    }

    // Send the message
    const result = await producer.send({
      topic,
      messages: [
        { 
          key: event.targetId ? event.targetId.toString() : 'default-key',
          value: JSON.stringify(event),
          headers: {
            'content-type': 'application/json',
            'event-type': event.eventType,
            'timestamp': new Date().toISOString()
          }
        },
      ],
      acks: -1, // Wait for all replicas to acknowledge
      timeout: 30000, // 30 seconds
    });

    console.log(`Event sent to ${topic}: ${event.eventType}`);
    return true;
  } catch (error) {
    console.error(`Error sending event to Kafka: ${error.message}`);
    
    // Check if it's a connection error and retry
    if (error.message.includes('not connected') || 
        error.message.includes('connection') || 
        error.message.includes('timeout')) {
      
      producerConnected = false;
      
      if (retryCount > 0) {
        console.log(`Retrying send after connection error (${retryCount} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendEvent(topic, event, retryCount - 1);
      }
    }
    
    return false;
  }
};

// Subscribe to topics
const subscribeToTopics = async (topics, messageHandler) => {
  try {
    // Make sure consumer is connected
    if (!consumerConnected) {
      console.log('Consumer not connected, attempting to connect...');
      const connected = await connectConsumer();
      if (!connected) {
        console.error('Failed to connect consumer, will retry subscription later');
        setTimeout(() => subscribeToTopics(topics, messageHandler), RECONNECT_INTERVAL);
        return;
      }
    }
    
    // Subscribe to all topics
    for (const topic of topics) {
      // Changed fromBeginning to true to ensure we read existing messages
      await consumer.subscribe({ topic, fromBeginning: true });
      console.log(`Subscribed to topic: ${topic}`);
    }
    
    // Start consuming
    await consumer.run({
      autoCommit: true,
      autoCommitInterval: 5000,
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
    
    console.log(`✅ Subscribed to topics on Aiven: ${topics.join(', ')}`);
  } catch (error) {
    console.error(`❌ Error subscribing to Aiven topics: ${error.message}`);
    
    // Instead of exiting, retry after a delay
    console.log('Retrying subscription in 5 seconds...');
    setTimeout(() => subscribeToTopics(topics, messageHandler), 5000);
  }
};

// Optional: node-rdkafka Producer example
const createRdkafkaProducer = () => {
  const rdProducer = new Rdkafka.Producer(getRdKafkaConfig());
  
  rdProducer.on('ready', () => {
    console.log('✅ node-rdkafka producer ready to send messages');
  });
  
  rdProducer.on('event.error', (err) => {
    console.error('❌ Error from rdkafka producer:', err);
  });
  
  rdProducer.connect();
  return rdProducer;
};

// Optional: node-rdkafka Consumer example
const createRdkafkaConsumer = (topics, messageHandler) => {
  const consumerConfig = {
    ...getRdKafkaConfig(),
    'group.id': process.env.KAFKA_GROUP_ID || 'notification-service-group',
    'enable.auto.commit': false
  };
  
  const rdConsumer = new Rdkafka.KafkaConsumer(consumerConfig);
  
  rdConsumer.on('ready', () => {
    console.log('✅ node-rdkafka consumer ready');
    rdConsumer.subscribe(topics);
    rdConsumer.consume();
  });
  
  rdConsumer.on('data', (data) => {
    try {
      const event = JSON.parse(data.value.toString());
      console.log(`Received event from ${data.topic}: ${event.eventType}`);
      messageHandler(data.topic, event);
      rdConsumer.commit(data);
    } catch (error) {
      console.error(`Error processing message: ${error.message}`);
    }
  });
  
  rdConsumer.on('event.error', (err) => {
    console.error('❌ Consumer error:', err);
  });
  
  rdConsumer.connect();
  return rdConsumer;
};

// Check producer connection status
const isProducerConnected = () => producerConnected;

// Export only what's necessary
module.exports = {
  kafka,
  producer,
  consumer,
  initKafka,
  sendEvent,
  subscribeToTopics,
  isProducerConnected,
  connectProducer,
  connectConsumer,
  getRdKafkaConfig
}; 
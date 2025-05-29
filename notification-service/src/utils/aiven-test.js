/**
 * Aiven Kafka Connection Test Script
 * 
 * Usage: 
 * - Configure your .env file with Aiven credentials
 * - Run with: node src/utils/aiven-test.js
 */

require('dotenv').config();
const { Kafka } = require('kafkajs');
const Rdkafka = require('node-rdkafka');

// Test topic - must exist on your Aiven Kafka instance
const TEST_TOPIC = 'test-topic';

// Test with KafkaJS
const testKafkaJS = async () => {
  console.log('Testing Aiven connection with KafkaJS...');
  
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'test-client',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: {
      mechanism: process.env.KAFKA_MECHANISM || 'PLAIN',
      username: process.env.KAFKA_USERNAME || 'avnadmin',
      password: process.env.KAFKA_PASSWORD || '',
    },
  });
  
  // Create admin to check topics
  const admin = kafka.admin();
  
  try {
    // Connect
    await admin.connect();
    console.log('✅ KafkaJS connected to Aiven successfully');
    
    // List topics
    const topics = await admin.listTopics();
    console.log('Available topics:', topics);
    
    // Check if test topic exists
    if (!topics.includes(TEST_TOPIC)) {
      console.warn(`⚠️ Test topic '${TEST_TOPIC}' not found. Creating it...`);
      await admin.createTopics({
        topics: [{ topic: TEST_TOPIC, numPartitions: 1, replicationFactor: 1 }],
      });
      console.log(`✅ Test topic '${TEST_TOPIC}' created`);
    }
    
    // Test producer
    const producer = kafka.producer();
    await producer.connect();
    console.log('✅ Producer connected');
    
    // Send a test message
    await producer.send({
      topic: TEST_TOPIC,
      messages: [{ value: `Test message ${new Date().toISOString()}` }],
    });
    console.log('✅ Test message sent');
    
    // Test consumer
    const consumer = kafka.consumer({ groupId: 'test-group' });
    await consumer.connect();
    console.log('✅ Consumer connected');
    
    await consumer.subscribe({ topic: TEST_TOPIC, fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`✅ Received message: ${message.value.toString()}`);
        await consumer.disconnect();
        await producer.disconnect();
        await admin.disconnect();
        console.log('✅ KafkaJS test completed successfully');
      },
    });
    
    // Send another message for the consumer to receive
    await producer.send({
      topic: TEST_TOPIC,
      messages: [{ value: `Consumer test ${new Date().toISOString()}` }],
    });
    
  } catch (error) {
    console.error('❌ KafkaJS test failed:', error.message);
    try {
      await admin.disconnect();
    } catch (e) {
      // Ignore disconnect error
    }
  }
};

// Test with node-rdkafka
const testRdkafka = () => {
  console.log('Testing Aiven connection with node-rdkafka...');
  
  const config = {
    'metadata.broker.list': process.env.KAFKA_BROKERS || 'localhost:9092',
    'security.protocol': process.env.KAFKA_SSL === 'true' ? 'sasl_ssl' : 'sasl_plaintext',
    'sasl.mechanisms': process.env.KAFKA_MECHANISM || 'PLAIN',
    'sasl.username': process.env.KAFKA_USERNAME || 'avnadmin',
    'sasl.password': process.env.KAFKA_PASSWORD || '',
    'client.id': 'rdkafka-test',
    'debug': 'all'
  };
  
  // Create producer
  const producer = new Rdkafka.Producer(config);
  
  // Wait for producer to be ready
  producer.on('ready', () => {
    console.log('✅ node-rdkafka producer ready');
    
    try {
      // Send a test message
      producer.produce(
        TEST_TOPIC,
        null,
        Buffer.from(`rdkafka test message ${new Date().toISOString()}`),
        null,
        Date.now()
      );
      console.log('✅ node-rdkafka test message sent');
    } catch (err) {
      console.error('❌ Error producing message:', err);
    }
    
    // Create consumer
    const consumer = new Rdkafka.KafkaConsumer({
      ...config,
      'group.id': 'rdkafka-test-group',
      'enable.auto.commit': false
    });
    
    consumer.on('ready', () => {
      console.log('✅ node-rdkafka consumer ready');
      consumer.subscribe([TEST_TOPIC]);
      consumer.consume();
      
      // Send another message for the consumer to receive
      try {
        producer.produce(
          TEST_TOPIC,
          null,
          Buffer.from(`rdkafka consumer test ${new Date().toISOString()}`),
          null,
          Date.now()
        );
      } catch (err) {
        console.error('❌ Error producing second message:', err);
      }
    });
    
    consumer.on('data', (data) => {
      console.log(`✅ Received message: ${data.value.toString()}`);
      consumer.disconnect();
      producer.disconnect();
      console.log('✅ node-rdkafka test completed successfully');
    });
    
    consumer.on('event.error', (err) => {
      console.error('❌ Consumer error:', err);
    });
    
    // Connect consumer
    consumer.connect();
  });
  
  producer.on('event.error', (err) => {
    console.error('❌ Producer error:', err);
  });
  
  // Connect producer
  producer.connect();
};

// Run tests
const runTests = async () => {
  try {
    // Test KafkaJS
    await testKafkaJS();
    
    // Wait a bit before running rdkafka test
    setTimeout(() => {
      // Test node-rdkafka
      testRdkafka();
    }, 2000);
  } catch (error) {
    console.error('Test failed:', error);
  }
};

runTests(); 
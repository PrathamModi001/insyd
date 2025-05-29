const { handleEvent, eventHandlers } = require('./eventHandlers');

const processEvent = async (event) => {
  try {
    console.log(`Processing event: ${event.eventType}`);
    
    // Route event to appropriate handler
    if (eventHandlers[event.eventType]) {
      await eventHandlers[event.eventType](event);
    } else {
      console.log(`No handler for event type: ${event.eventType}`);
    }
  } catch (error) {
    console.error(`Error processing event: ${error.message}`);
  }
}; 
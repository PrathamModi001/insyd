const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Sample users
const users = [
  {
    username: 'john_architect',
    email: 'john@example.com',
    displayName: 'John Doe',
    profession: 'Architect',
    bio: 'Designing sustainable buildings for the future'
  },
  {
    username: 'sarah_designer',
    email: 'sarah@example.com',
    displayName: 'Sarah Smith',
    profession: 'Interior Designer',
    bio: 'Creating beautiful spaces that inspire'
  },
  {
    username: 'mike_planner',
    email: 'mike@example.com',
    displayName: 'Mike Johnson',
    profession: 'Urban Planner',
    bio: 'Building communities that thrive'
  }
];

async function createUsers() {
  console.log('Creating test users...');
  
  for (const user of users) {
    try {
      const response = await axios.post(`${API_URL}/api/users`, user);
      console.log(`Created user: ${user.displayName} with ID: ${response.data._id}`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`User ${user.displayName} already exists`);
      } else {
        console.error(`Error creating user ${user.displayName}:`, error.message);
      }
    }
  }
  
  console.log('Finished creating test users');
}

createUsers().catch(console.error); 
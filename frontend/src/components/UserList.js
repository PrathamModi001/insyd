import React from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const UserList = ({ users, currentUser, onFollowToggle, onSwitchUser }) => {
  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Suggested Users</h2>
        <p className="text-gray-500">No more users to follow at the moment.</p>
      </div>
    );
  }

  const handleFollowUser = async (userId) => {
    if (!currentUser) return;
    
    try {
      await axios.post(
        `${API_URL}/api/users/${userId}/follow?followerId=${currentUser._id}`
      );
      
      // Call the parent's onFollowToggle
      onFollowToggle(userId, false);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Suggested Users</h2>
      </div>
      <ul className="divide-y">
        {users.map(user => (
          <li key={user._id} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">{user.displayName}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
              <p className="text-xs text-gray-400">{user.profession}</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onSwitchUser(user)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                Switch to
              </button>
              
              {currentUser && (
                <button
                  onClick={() => handleFollowUser(user._id)}
                  className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  Follow
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList; 
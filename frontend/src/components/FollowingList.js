import React, { useState } from 'react';

const FollowingList = ({ users, currentUser, onFollowToggle, onSwitchUser }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Following</h2>
        <p className="text-gray-500">You are not following anyone yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="p-4 border-b flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-lg font-semibold">Following ({users.length})</h2>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {!isCollapsed && (
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
                    onClick={() => onFollowToggle(user._id, true)}
                    className="px-3 py-1 text-sm rounded bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    Unfollow
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FollowingList; 
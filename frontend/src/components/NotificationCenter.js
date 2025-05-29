import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

// Format notification time
const formatTime = (timestamp) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch (error) {
    return 'recently';
  }
};

// Get notification type label
const getNotificationTypeLabel = (type) => {
  switch (type) {
    case 'follow':
      return 'New Follower';
    case 'new_post':
      return 'New Post';
    case 'post_like':
      return 'Post Liked';
    case 'comment':
      return 'New Comment';
    case 'mention':
      return 'Mention';
    default:
      return 'Notification';
  }
};

// Get notification color based on type
const getNotificationColor = (type) => {
  switch (type) {
    case 'follow':
      return 'blue';
    case 'new_post':
      return 'purple';
    case 'post_like':
      return 'red';
    case 'comment':
      return 'green';
    case 'mention':
      return 'yellow';
    default:
      return 'gray';
  }
};

// Determine notification icon based on type
const getNotificationIcon = (type) => {
  switch (type) {
    case 'follow':
      return '👥';
    case 'new_post':
      return '📝';
    case 'post_like':
      return '❤️';
    case 'comment':
      return '💬';
    case 'mention':
      return '@️';
    default:
      return '🔔';
  }
};

const NotificationCenter = ({ notifications, onMarkAsRead, onMarkAllAsRead, onViewPost }) => {
  const [expanded, setExpanded] = useState(true);
  
  // Add debug logging
  console.log('NotificationCenter rendering with notifications:', 
    notifications ? notifications.length : 0, 
    notifications && notifications.length > 0 ? 
      `(Most recent: ${notifications[0].content})` : '(empty)'
  );
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Function to render notification content based on type
  const renderNotificationContent = (notification) => {
    // Safety check for invalid notification object
    if (!notification) {
      return null;
    }
    
    const handleClick = (e) => {
      if (!notification.isRead) {
        onMarkAsRead(notification._id);
      }
    };
    
    const handleViewDetail = (e) => {
      e.stopPropagation();
      onMarkAsRead(notification._id);
      
      // For post notifications, allow viewing the post
      if (
        (notification.type === 'new_post' || notification.type === 'post_like') && 
        notification.refModel === 'Post' && 
        notification.refId
      ) {
        onViewPost(notification.refId);
      }
    };
    
    // Get type-specific details with fallbacks
    const type = notification.type || 'unknown';
    const color = getNotificationColor(type);
    const icon = getNotificationIcon(type);
    const typeLabel = getNotificationTypeLabel(type);
    
    // Use the content field directly from the notification object
    const notificationContent = notification.content || 'You have a new notification';
    
    // Format display content based on notification type
    let displayContent = notificationContent;
    
    // Highlight names in the notification content
    if (type === 'follow' && notificationContent.includes('started following you')) {
      const followerName = notificationContent.split(' started following you')[0].trim();
      displayContent = (
        <span>
          <span className="font-medium text-blue-600">{followerName}</span> started following you
        </span>
      );
    } else if (type === 'new_post' && notificationContent.includes('published a new post:')) {
      const parts = notificationContent.split('published a new post:');
      if (parts.length === 2) {
        const userName = parts[0].trim();
        const postTitle = parts[1].trim();
        displayContent = (
          <span>
            <span className="font-medium text-blue-600">{userName}</span> published a new post: 
            <span className="font-medium">{postTitle}</span>
          </span>
        );
      }
    } else if (type === 'post_like' && notificationContent.includes('liked your post:')) {
      const parts = notificationContent.split('liked your post:');
      if (parts.length === 2) {
        const userName = parts[0].trim();
        const postTitle = parts[1].trim();
        displayContent = (
          <span>
            <span className="font-medium text-blue-600">{userName}</span> liked your post: 
          </span>
        );
      }
    }
    
    const createdAt = notification.createdAt ? new Date(notification.createdAt) : new Date();
    const isUnread = notification.isRead === false;
    
    return (
      <div 
        className={`p-4 border-b border-gray-200 ${isUnread ? `bg-${color}-50` : 'bg-white'} hover:bg-gray-100`}
        onClick={handleClick}
      >
        <div className="flex items-start">
          {/* Notification icon */}
          <div className={`flex-shrink-0 mr-3 p-2 bg-${color}-100 text-${color}-600 rounded-full h-10 w-10 flex items-center justify-center`}>
            <span className="text-xl">{icon}</span>
          </div>
          
          {/* Notification content */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <span className={`inline-block px-2 py-1 text-xs font-semibold text-${color}-600 bg-${color}-100 rounded-full mb-1`}>
                {typeLabel}
              </span>
              {isUnread && (
                <div className={`h-3 w-3 bg-${color}-500 rounded-full`}></div>
              )}
            </div>
            
            <p className="text-gray-700 text-sm mb-1">{displayContent}</p>
            
            <div className="mt-2 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {formatTime(createdAt)}
              </p>
              
              {/* Action buttons */}
              <div className="flex space-x-2">
                {/* View Post button for post notifications */}
                {(type === 'new_post' || type === 'post_like') && notification.refId && (
                  <button 
                    onClick={handleViewDetail}
                    className={`text-xs px-2 py-1 rounded bg-${color}-100 text-${color}-600 hover:bg-${color}-200`}
                  >
                    View {type === 'new_post' ? 'Post' : 'Details'}
                  </button>
                )}
                
                {isUnread && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification._id);
                    }}
                    className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div 
        className="flex justify-between items-center p-4 bg-blue-600 text-white cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="flex items-center">
          <span className="text-xl mr-2">🔔</span>
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : 'rotate-0'}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {expanded && (
        <div className="max-h-[600px] overflow-y-auto">
          {unreadCount > 0 && (
            <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </span>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                onClick={onMarkAllAsRead}
              >
                Mark all as read
              </button>
            </div>
          )}
          
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-lg font-medium mb-1">No notifications yet</p>
              <p className="text-sm text-gray-400">When you get notifications, they'll appear here</p>
            </div>
          ) : (
            <div>
              {unreadCount > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">New</h3>
                </div>
              )}
              
              {/* Unread notifications */}
              {notifications
                .filter(n => !n.isRead)
                .map(notification => (
                  <div key={notification._id}>
                    {renderNotificationContent(notification)}
                  </div>
                ))
              }
              
              {/* Earlier section header, only show if there are read notifications */}
              {notifications.some(n => n.isRead) && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Earlier</h3>
                </div>
              )}
              
              {/* Read notifications */}
              {notifications
                .filter(n => n.isRead)
                .map(notification => (
                  <div key={notification._id}>
                    {renderNotificationContent(notification)}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 
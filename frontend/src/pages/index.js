import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';
import io from 'socket.io-client';
import Link from 'next/link';

// Components
import Navbar from '../components/Navbar';
import UserList from '../components/UserList';
import NotificationCenter from '../components/NotificationCenter';
import UserRegistration from '../components/UserRegistration';
import UserLogin from '../components/UserLogin';
import PostModal from '../components/PostModal';
import ViewPostModal from '../components/ViewPostModal';
import DiscoverModal from '../components/DiscoverModal';

// API URL from env
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3002';

export default function Home() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showViewPostModal, setShowViewPostModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);
  const pollingIntervalRef = useRef(null);

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        // Don't show login/registration forms if we have a user
        setShowLogin(false);
        setShowRegistration(false);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        // Show login form if there's an error with stored user
        setShowLogin(true);
        localStorage.removeItem('currentUser');
      }
    } else {
      // Show login form by default if no user is stored
      setShowLogin(true);
    }
    setIsLoading(false);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    console.log('WebSocket initialization effect triggered');
    console.log('Current user:', currentUser);
    console.log('WebSocket URL:', WEBSOCKET_URL);
    
    if (currentUser) {
      console.log('Initializing socket connection for user:', currentUser._id);
      
      // Fix WebSocket connection with proper configuration
      const newSocket = io(WEBSOCKET_URL, {
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true,
        path: '/socket.io/' // Explicitly set the Socket.IO path
      });
      
      console.log('Socket instance created with config:', {
        url: WEBSOCKET_URL,
        transports: ['polling', 'websocket'],
        path: '/socket.io/'
      });
      
      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
        console.log('Socket ID:', newSocket.id);
        console.log('Transport:', newSocket.io.engine.transport.name);
        
        // Set socket as connected and disable polling if it was active
        setSocketConnected(true);
        setPollingActive(false);
        
        // Clear polling interval if it exists
        if (pollingIntervalRef.current) {
          console.log('Clearing notification polling interval - WebSocket connected');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Authenticate with user ID
        newSocket.emit('authenticate', currentUser._id);
        console.log('Sent authentication with user ID:', currentUser._id);
        
        // Also join a room with the user ID directly (alternative format)
        newSocket.emit('join', `user:${currentUser._id}`);
        console.log('Joined room:', `user:${currentUser._id}`);
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: error.description,
          type: error.type,
          context: error
        });
        
        // Mark socket as disconnected
        setSocketConnected(false);
        
        // Start polling if not already active
        if (!pollingActive) {
          console.log('WebSocket connection failed, activating notification polling');
          startNotificationPolling();
        }
      });
      
      // Add catch-all event listener to debug
      const originalOnevent = newSocket.onevent;
      newSocket.onevent = function(packet) {
        const args = packet.data || [];
        console.log('WebSocket event received:', args[0], args.length > 1 ? args.slice(1) : '');
        originalOnevent.call(this, packet);
      };

      newSocket.on('notification', (notification) => {
        console.log('===== REAL-TIME NOTIFICATION RECEIVED =====');
        console.log('Raw notification:', JSON.stringify(notification));
        console.log('Current notifications state:', notifications.length);
        
        // Force display - add notification directly to DOM for debugging
        try {
          const debugDiv = document.createElement('div');
          debugDiv.style.position = 'fixed';
          debugDiv.style.top = '10px';
          debugDiv.style.right = '10px';
          debugDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
          debugDiv.style.color = 'white';
          debugDiv.style.padding = '10px';
          debugDiv.style.borderRadius = '5px';
          debugDiv.style.zIndex = '9999';
          debugDiv.style.maxWidth = '300px';
          
          // Extract content regardless of notification structure
          const content = notification?.content || notification?.data?.content || 'Unknown content';
          const type = notification?.type || notification?.data?.type || 'Unknown type';
          const recipient = notification?.recipient || notification?.data?.recipient || 'Unknown recipient';
          
          debugDiv.innerHTML = `
            <h3>🔔 New Notification</h3>
            <p><strong>Content:</strong> ${content}</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>For user:</strong> ${recipient}</p>
            <p><strong>Current user:</strong> ${currentUser?._id || 'Unknown'}</p>
            <button id="debug-dismiss" style="background: #444; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Dismiss</button>
          `;
          document.body.appendChild(debugDiv);
          
          // Add click handler for dismiss button
          document.getElementById('debug-dismiss')?.addEventListener('click', () => {
            try {
              document.body.removeChild(debugDiv);
            } catch (e) {
              console.log('Error removing debug div:', e);
            }
          });
          
          // Remove after 20 seconds
          setTimeout(() => {
            try {
              if (document.body.contains(debugDiv)) {
                document.body.removeChild(debugDiv);
              }
            } catch (e) {
              console.log('Error removing debug div:', e);
            }
          }, 20000);
        } catch (debugError) {
          console.error('Error creating debug notification:', debugError);
        }
        
        try {
          // There might be different ways the notification is being sent
          // It could be either the direct notification object or nested in a data property
          const notificationData = notification.data ? notification.data : notification;
          
          console.log('Parsed notification data:', notificationData);
          console.log('Notification type:', notificationData.type);
          console.log('Notification recipient:', notificationData.recipient);
          console.log('Current user ID:', currentUser._id);
          
          // Make sure notification is for this user
          if (notificationData.recipient === currentUser._id) {
            console.log('✅ Notification is for current user, updating state...');
            
            // Force notification to update UI immediately
            const updatedNotifications = [notificationData, ...notifications];
            setNotifications(updatedNotifications);
            console.log('Notifications state updated, new length:', updatedNotifications.length);
            
            // Update unread count
            const newUnreadCount = unreadCount + 1;
            setUnreadCount(newUnreadCount);
            console.log('Unread count updated:', newUnreadCount);
            
            // Also trigger a sound or visual indicator
            try {
              // Flash the title briefly
              const originalTitle = document.title;
              document.title = '🔔 New Notification!';
              setTimeout(() => {
                document.title = originalTitle;
              }, 3000);
              
              // Play a sound if the browser supports it
              if (typeof Audio !== 'undefined') {
                const notificationSound = new Audio('/notification-sound.mp3');
                notificationSound.play().catch(e => console.log('Could not play notification sound'));
              }
            } catch (e) {
              console.log('Error with notification indicators:', e);
            }
          } else {
            console.log('❌ Notification is NOT for current user, ignoring');
            console.log('Expected:', currentUser._id);
            console.log('Received for:', notificationData.recipient);
            
            // Log as warning in case the room filtering isn't working
            console.warn('WARNING: Received notification for different user. Room filtering may not be working properly.');
          }
        } catch (error) {
          console.error('Error processing notification:', error);
          // Try to handle the notification anyway
          try {
            console.log('Attempting to handle notification directly...');
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          } catch (e) {
            console.error('Failed to handle notification:', e);
          }
        }
        console.log('========================================');
      });
      
      // Listen for room join confirmations
      newSocket.on('joined', (data) => {
        console.log('✅ Successfully joined room:', data.room);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server. Reason:', reason);
        
        // Mark socket as disconnected
        setSocketConnected(false);
        
        // Start polling if not already active
        if (!pollingActive) {
          console.log('WebSocket disconnected, activating notification polling');
          startNotificationPolling();
        }
        
        // Auto-reconnect handling
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected the socket
          console.log('Attempting to reconnect...');
          newSocket.connect();
        }
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      // Add event for welcome message from server
      newSocket.on('welcome', (data) => {
        console.log('Welcome message from server:', data.message);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        console.log('Cleaning up WebSocket connection');
        newSocket.disconnect();
        
        // Clear polling interval if active
        if (pollingIntervalRef.current) {
          console.log('Clearing notification polling interval');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      console.log('No current user, skipping WebSocket initialization');
      
      // Clear polling interval if active
      if (pollingIntervalRef.current) {
        console.log('Clearing notification polling interval - no user');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setPollingActive(false);
      }
    }
  }, [currentUser]);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users`);
        
        if (currentUser) {
          // Filter out current user and users already being followed
          const filteredUsers = response.data.users.filter(user => {
            // Skip current user
            if (user._id === currentUser._id) {
              return false;
            }
            
            // Skip users that the current user is already following
            if (currentUser.following && currentUser.following.includes(user._id)) {
              return false;
            }
            
            return true;
          });
          
          setUsers(filteredUsers);
        } else {
          // For users who aren't logged in, show all users
          setUsers(response.data.users);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Fetch notifications when current user changes
  useEffect(() => {
    const fetchNotifications = async () => {
      if (currentUser) {
        try {
          const response = await axios.get(`${API_URL}/api/notifications?userId=${currentUser._id}`);
          
          // Store the latest notification ID for incremental polling
          if (response.data.notifications.length > 0) {
            setLastNotificationId(response.data.notifications[0]._id);
          }
          
          setNotifications(response.data.notifications);
          setUnreadCount(response.data.unreadCount);
          
          // If WebSocket is not connected, start polling
          if (currentUser && !socketConnected) {
            startNotificationPolling();
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    };

    fetchNotifications();
  }, [currentUser, socketConnected]);

  // Handle follow/unfollow
  const handleFollowToggle = async (userId, isFollowing) => {
    if (!currentUser) return;

    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      await axios.post(
        `${API_URL}/api/users/${userId}/${endpoint}?followerId=${currentUser._id}`
      );

      // Refresh user list
      const response = await axios.get(`${API_URL}/api/users`);
      
      // Filter out current user and users already being followed
      const filteredUsers = response.data.users.filter(user => {
        // Skip current user
        if (user._id === currentUser._id) {
          return false;
        }
        
        // For unfollowing, we need to include the user we just unfollowed
        if (isFollowing && user._id === userId) {
          return true;
        }
        
        // Skip users that the current user is already following
        if (currentUser.following && currentUser.following.includes(user._id)) {
          return false;
        }
        
        return true;
      });
      
      setUsers(filteredUsers);
      
      // Update current user's following list in state
      if (!isFollowing) {
        // Add to following list
        setCurrentUser(prev => ({
          ...prev,
          following: [...(prev.following || []), userId]
        }));
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          ...currentUser,
          following: [...(currentUser.following || []), userId]
        }));
      } else {
        // Remove from following list
        setCurrentUser(prev => ({
          ...prev,
          following: prev.following.filter(id => id !== userId)
        }));
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          ...currentUser,
          following: currentUser.following.filter(id => id !== userId)
        }));
      }
    } catch (error) {
      console.error(`Error ${isFollowing ? 'unfollowing' : 'following'} user:`, error);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    if (!currentUser) return;

    try {
      await axios.post(
        `${API_URL}/api/notifications/${notificationId}/read?userId=${currentUser._id}`
      );

      // Update notifications list
      setNotifications(notifications.map(notification => {
        if (notification._id === notificationId) {
          return {
            ...notification,
            isRead: true
          };
        }
        return notification;
      }));

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      await axios.post(
        `${API_URL}/api/notifications/read-all?userId=${currentUser._id}`
      );

      // Update all notifications as read
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true
      })));

      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Switch user (for demo purposes)
  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  // Handle post creation
  const handlePostCreated = (newPost) => {
    // Just hide the modal after post creation
    setShowPostModal(false);
  };

  // Handle login
  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowLogin(false);
    setShowRegistration(false);
  };

  // Handle logout
  const handleLogout = () => {
    // Remove user from local storage
    localStorage.removeItem('currentUser');
    
    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
    
    // Reset state
    setCurrentUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setShowLogin(true);
    setShowRegistration(false);
  };

  // Handle toggle between login and registration
  const toggleAuthForms = () => {
    setShowLogin(!showLogin);
    setShowRegistration(!showRegistration);
  };

  // Toggle post modal
  const togglePostModal = () => {
    setShowPostModal(!showPostModal);
  };

  // Handle viewing a post from notification
  const handleViewPost = (postId) => {
    setSelectedPostId(postId);
    setShowViewPostModal(true);
  };

  // Toggle discover modal
  const toggleDiscoverModal = () => {
    setShowDiscoverModal(!showDiscoverModal);
  };

  // Fallback polling function for notifications
  const startNotificationPolling = () => {
    if (pollingIntervalRef.current || !currentUser) return;
    
    console.log('Starting notification polling mechanism');
    setPollingActive(true);
    
    // Poll every 10 seconds
    pollingIntervalRef.current = setInterval(async () => {
      if (!currentUser) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setPollingActive(false);
        return;
      }
      
      try {
        console.log('Polling for new notifications...');
        const response = await axios.get(
          `${API_URL}/api/notifications?userId=${currentUser._id}&since=${lastNotificationId || ''}`
        );
        
        const newNotifications = response.data.notifications;
        console.log(`Polled ${newNotifications.length} new notifications`);
        
        if (newNotifications.length > 0) {
          // Update last notification ID for next polling
          setLastNotificationId(newNotifications[0]._id);
          
          // Merge with existing notifications, avoiding duplicates
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n._id));
            const uniqueNew = newNotifications.filter(n => !existingIds.has(n._id));
            
            if (uniqueNew.length > 0) {
              console.log(`Adding ${uniqueNew.length} new notifications from polling`);
              
              // Update unread count
              const newUnreadCount = uniqueNew.filter(n => !n.isRead).length;
              if (newUnreadCount > 0) {
                setUnreadCount(prevCount => prevCount + newUnreadCount);
                
                // Show visual notification for the first new notification
                try {
                  // Flash the title briefly
                  const originalTitle = document.title;
                  document.title = '🔔 New Notification!';
                  setTimeout(() => {
                    document.title = originalTitle;
                  }, 3000);
                } catch (e) {
                  console.log('Error with notification indicators:', e);
                }
              }
              
              return [...uniqueNew, ...prev];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error polling for notifications:', error);
      }
    }, 10000); // Poll every 10 seconds
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div>
      <Head>
        <title>Insyd Notification System</title>
        <meta name="description" content="A POC for Insyd notification system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar 
        currentUser={currentUser} 
        unreadCount={unreadCount}
        onRegisterClick={() => setShowRegistration(true)} 
        onLogout={handleLogout}
        onDiscoverClick={toggleDiscoverModal}
        socketConnected={socketConnected}
        pollingActive={pollingActive}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-bold mb-6">Insyd Notification System POC</h1>
            
            {!currentUser ? (
              // Show login or registration form if no user is selected
              <div className="mb-8">
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6">
                  <p>Welcome to Insyd! Please login or register to get started.</p>
                </div>
                
                {showLogin ? (
                  <UserLogin 
                    onLogin={handleLogin} 
                    onShowRegister={() => toggleAuthForms()} 
                  />
                ) : (
                  <UserRegistration 
                    onUserCreated={handleLogin} 
                    onShowLogin={() => toggleAuthForms()}
                  />
                )}
              </div>
            ) : (
              // Show user dashboard for logged in users
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Your Dashboard</h2>
                  <div className="flex space-x-4">
                    <Link 
                      href="/feed" 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      New Posts
                    </Link>
                    <button 
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                      onClick={toggleDiscoverModal}
                    >
                      Discover
                    </button>
                    <button 
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      onClick={togglePostModal}
                    >
                      Create Post
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <h2 className="text-xl font-semibold mb-2">Current User</h2>
                  <p className="mb-1">Username: {currentUser.username}</p>
                  <p className="mb-1">Display Name: {currentUser.displayName}</p>
                  <p>Profession: {currentUser.profession}</p>
                </div>
                
                {/* Available Users to Follow */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Suggested Users</h2>
                  <UserList 
                    users={users} 
                    currentUser={currentUser} 
                    onFollowToggle={handleFollowToggle} 
                    onSwitchUser={handleSwitchUser}
                  />
                </div>
              </>
            )}
          </div>
          
          <div>
            <NotificationCenter 
              notifications={notifications} 
              onMarkAsRead={handleMarkAsRead} 
              onMarkAllAsRead={handleMarkAllAsRead}
              onViewPost={handleViewPost}
            />
          </div>
        </div>
      </main>
      
      {/* Post Creation Modal */}
      <PostModal 
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        currentUser={currentUser}
        onPostCreated={handlePostCreated}
      />

      {/* View Post Modal */}
      <ViewPostModal
        isOpen={showViewPostModal}
        onClose={() => setShowViewPostModal(false)}
        postId={selectedPostId}
        currentUser={currentUser}
      />
      
      {/* Discover Modal */}
      <DiscoverModal 
        isOpen={showDiscoverModal}
        onClose={() => setShowDiscoverModal(false)}
        currentUser={currentUser}
        onViewPost={handleViewPost}
      />
    </div>
  );
} 
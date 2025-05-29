import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';

// Components
import Navbar from '../components/Navbar';
import PostList from '../components/PostList';
import ViewPostModal from '../components/ViewPostModal';
import DiscoverModal from '../components/DiscoverModal';

// API URL from env
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Feed() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showViewPostModal, setShowViewPostModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  
  const router = useRouter();

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        // Redirect to home if no valid user
        router.push('/');
      }
    } else {
      // Redirect to home if no user
      router.push('/');
    }
  }, [router]);

  // Fetch posts from followed users when current user changes
  useEffect(() => {
    const fetchFollowedPosts = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        setError('');
        
        // First, get notifications to find posts that you were notified about
        const notificationsResponse = await axios.get(`${API_URL}/api/notifications?userId=${currentUser._id}`);
        console.log('Notifications API response:', notificationsResponse.data);
        
        if (!notificationsResponse.data || !notificationsResponse.data.notifications) {
          setError('Invalid response from notifications API');
          setIsLoading(false);
          return;
        }
        
        console.log('Notifications retrieved:', notificationsResponse.data.notifications.length);
        
        // Focus on post notifications - specifically new posts from users you follow
        const postNotifications = notificationsResponse.data.notifications.filter(n => 
          n.type === 'new_post' && n.refId && n.refModel === 'Post'
        );
        
        console.log('Post notifications found:', postNotifications.length);
        
        if (postNotifications.length === 0) {
          setPosts([]);
          setError('No post notifications found. When users you follow create new posts, they will appear here.');
          setIsLoading(false);
          return;
        }
        
        // Extract post IDs from notifications
        const notificationPostIds = postNotifications.map(n => n.refId);
        console.log('Post IDs from notifications:', notificationPostIds);
        
        // Fetch all posts
        const postsResponse = await axios.get(`${API_URL}/api/posts`);
        console.log('Posts API response:', postsResponse.data);
        
        // Handle different response formats for posts
        let allPosts = [];
        if (Array.isArray(postsResponse.data)) {
          allPosts = postsResponse.data;
        } else if (postsResponse.data && postsResponse.data.posts && Array.isArray(postsResponse.data.posts)) {
          allPosts = postsResponse.data.posts;
        } else {
          console.error('Unexpected posts response format:', postsResponse.data);
          setError('Unexpected response format from posts API');
          setIsLoading(false);
          return;
        }
        
        console.log('All posts retrieved:', allPosts.length);
        
        if (allPosts.length === 0) {
          setPosts([]);
          setError('No posts available in the system.');
          setIsLoading(false);
          return;
        }
        
        // Filter posts to only include those from notifications
        const notifiedPosts = allPosts.filter(post => {
          const postId = post._id.toString();
          const isInNotifications = notificationPostIds.includes(postId);
          
          if (isInNotifications) {
            console.log(`Including post ${postId} from notifications`);
          }
          
          return isInNotifications;
        });
        
        console.log('Posts from notifications:', notifiedPosts.length);
        
        if (notifiedPosts.length === 0) {
          setError('No posts found from your notifications. This could happen if posts were deleted.');
        }
        
        // Sort posts by creation date (newest first)
        const sortedPosts = notifiedPosts.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        setPosts(sortedPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Could not load posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowedPosts();
  }, [currentUser]);

  // Handle post click to view details
  const handleViewPost = (postId) => {
    setSelectedPostId(postId);
    setShowViewPostModal(true);
  };

  // Toggle discover modal
  const toggleDiscoverModal = () => {
    setShowDiscoverModal(!showDiscoverModal);
  };

  // Handle logout
  const handleLogout = () => {
    // Remove user from local storage
    localStorage.removeItem('currentUser');
    
    // Redirect to home
    router.push('/');
  };

  if (!currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }

  return (
    <div>
      <Head>
        <title>New Posts Feed | Insyd</title>
        <meta name="description" content="Posts you've been notified about on Insyd" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar 
        currentUser={currentUser} 
        onLogout={handleLogout}
        onDiscoverClick={toggleDiscoverModal}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">New Posts Feed</h1>
            <p className="text-gray-600 mt-1">
              Showing new posts from users you follow
            </p>
          </div>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p>Loading posts...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No Posts Yet</h2>
            <p className="text-gray-600 mb-6">Follow more users to see their posts in your feed, or create your own post.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map(post => (
              <div 
                key={post._id} 
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <div className="font-medium text-blue-600">{post.user?.displayName || 'Unknown User'}</div>
                  <span className="mx-2 text-gray-400">•</span>
                  <div className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>
                
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {post.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 flex items-center space-x-4">
                  <button 
                    onClick={() => handleViewPost(post._id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-1">👍</span> 
                    {post.likes?.length || 0} Likes
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-1">💬</span> 
                    {post.comments?.length || 0} Comments
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
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
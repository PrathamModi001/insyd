import { useState, useEffect } from 'react';
import axios from 'axios';

// API URL from env
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DiscoverModal = ({ isOpen, onClose, currentUser, onViewPost }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [likedPosts, setLikedPosts] = useState({});

  useEffect(() => {
    const fetchRecentPosts = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch all posts
        const response = await axios.get(`${API_URL}/api/posts`);
        console.log('Discover posts API response:', response.data); // Log the full response
        
        // Verify response structure
        if (!response.data) {
          setError('Invalid response from server');
          setIsLoading(false);
          return;
        }
        
        // Handle different response formats
        let postsData = [];
        if (Array.isArray(response.data)) {
          postsData = response.data;
        } else if (response.data.posts && Array.isArray(response.data.posts)) {
          postsData = response.data.posts;
        } else {
          console.error('Unexpected response format:', response.data);
          setError('Unexpected response format from server');
          setIsLoading(false);
          return;
        }
        
        console.log('All posts retrieved:', postsData.length);
        
        if (postsData.length === 0) {
          setPosts([]);
          setError('No posts available in the system.');
          setIsLoading(false);
          return;
        }
        
        // Sort posts by creation date (newest first)
        const sortedPosts = postsData.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Take only the top 3 most recent posts
        const top3Posts = sortedPosts.slice(0, 3);
        
        setPosts(top3Posts);
        
        // Initialize liked status for each post
        if (currentUser) {
          const initialLikedStatus = {};
          top3Posts.forEach(post => {
            // Skip if post has no likes array
            if (!post.likes) {
              initialLikedStatus[post._id] = false;
              return;
            }
            
            // Check if current user has liked this post
            const hasLiked = post.likes.some(like => {
              // Handle cases where like is an object or just an ID string
              if (typeof like === 'object' && like._id) {
                return like._id.toString() === currentUser._id.toString();
              }
              return like.toString() === currentUser._id.toString();
            });
            
            initialLikedStatus[post._id] = hasLiked;
          });
          setLikedPosts(initialLikedStatus);
        }
      } catch (error) {
        console.error('Error fetching recent posts:', error);
        setError('Could not load posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentPosts();
  }, [isOpen, currentUser]);

  const handleLikeToggle = async (postId, event) => {
    event.stopPropagation(); // Prevent triggering the post click
    
    if (!currentUser) return;
    
    try {
      const isLiked = likedPosts[postId];
      const endpoint = isLiked ? 'unlike' : 'like';
      
      console.log(`Sending ${endpoint} request for post: ${postId}`);
      
      // Change from sending userId in the body to sending it as a query parameter
      const response = await axios.post(
        `${API_URL}/api/posts/${postId}/${endpoint}?userId=${currentUser._id}`, 
        {} // Empty body
      );
      console.log(`Post ${isLiked ? 'unliked' : 'liked'} response:`, response.data);
      
      // Update the local state
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !isLiked
      }));
      
      // Update the like count in the posts array
      setPosts(posts.map(post => {
        if (post._id === postId) {
          // Use the response data if available
          if (response.data && response.data.likes) {
            return {
              ...post,
              likes: response.data.likes
            };
          }
          
          // Otherwise update the likes array manually
          const updatedLikes = [...(post.likes || [])];
          if (isLiked) {
            // Remove the current user from likes (filter both object and string IDs)
            return {
              ...post,
              likes: updatedLikes.filter(like => {
                if (typeof like === 'object' && like._id) {
                  return like._id.toString() !== currentUser._id.toString();
                }
                return like.toString() !== currentUser._id.toString();
              })
            };
          } else {
            // Add the current user to likes
            return {
              ...post,
              likes: [...updatedLikes, currentUser._id]
            };
          }
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Provide more specific error message
      let errorMessage = 'Failed to update like status';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        
        // Check for specific error statuses
        if (error.response.status === 404) {
          errorMessage = `The post was not found (ID: ${postId}). It may have been deleted.`;
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Invalid request';
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      }
      
      // Show error to the user
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Discover Recent Posts</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading posts...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No posts available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <div 
                key={post._id} 
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
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
                    onClick={() => {
                      onViewPost(post._id);
                      onClose();
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                  
                  <button 
                    onClick={(e) => handleLikeToggle(post._id, e)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                      likedPosts[post._id] 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={!currentUser}
                  >
                    <span>{likedPosts[post._id] ? '❤️' : '🤍'}</span>
                    <span>{post.likes?.length || 0}</span>
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-1">💬</span> 
                    {post.comments?.length || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverModal; 
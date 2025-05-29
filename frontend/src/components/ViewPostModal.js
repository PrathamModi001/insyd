import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ViewPostModal = ({ isOpen, onClose, postId, currentUser }) => {
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      if (!isOpen || !postId) return;
      
      try {
        setIsLoading(true);
        setError('');
        
        console.log('Fetching post with ID:', postId);
        const response = await axios.get(`${API_URL}/api/posts/${postId}`);
        console.log('Post API response:', response.data);
        
        // Check if we have a post object in the response (direct or under post property)
        let postData = null;
        if (response.data && response.data.post) {
          postData = response.data.post;
          console.log('Found post data in response.data.post');
        } else if (response.data && response.data._id) {
          // The post data might be directly in the response
          postData = response.data;
          console.log('Found post data directly in response.data');
        }
        
        if (postData) {
          console.log('Using post data:', postData);
          setPost(postData);
          
          // Check if post is liked by current user
          if (currentUser && postData.likes) {
            console.log('Checking if post is liked by current user:', currentUser._id);
            console.log('Post likes:', postData.likes);
            
            // Handle both array of objects and array of strings
            const liked = postData.likes.some(like => {
              if (typeof like === 'object' && like._id) {
                return like._id.toString() === currentUser._id.toString();
              }
              return like.toString() === currentUser._id.toString();
            });
            
            console.log('Is post liked by current user:', liked);
            setIsLiked(liked);
          } else {
            console.log('Cannot check likes: currentUser or post.likes not available');
          }
          
          // Set like count
          setLikeCount(postData.likes ? postData.likes.length : 0);
        } else {
          console.error('Post data not found in response structure:', response.data);
          setError('Unable to extract post data from the response');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
          setError(`Failed to load post: ${error.response.data.message || error.message}`);
        } else {
          setError(`Failed to load post: ${error.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [isOpen, postId, currentUser]);

  const handleLikeToggle = async () => {
    if (!currentUser || !post) return;
    
    try {
      const endpoint = isLiked ? 'unlike' : 'like';
      console.log(`Sending ${endpoint} request for post:`, post._id);
      
      const response = await axios.post(
        `${API_URL}/api/posts/${post._id}/${endpoint}?userId=${currentUser._id}`, 
        {} // Empty body
      );
      
      console.log(`${endpoint} response:`, response.data);
      
      // Update UI
      setIsLiked(!isLiked);
      setLikeCount(response.data.likeCount || (isLiked ? likeCount - 1 : likeCount + 1));
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Provide more specific error message
      let errorMessage = 'Failed to update like status';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        
        // Check for specific error statuses
        if (error.response.status === 404) {
          errorMessage = 'The post was not found. It may have been deleted.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Invalid request';
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      }
      
      // Show error to the user
      setError(errorMessage);
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">View Post</h2>
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
            <p>Loading post...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        ) : post ? (
          <div>
            <div className="mb-4">
              <div className="flex items-center mb-3">
                <div className="font-medium text-blue-600">{post.user?.displayName || 'Unknown User'}</div>
                <span className="mx-2 text-gray-400">•</span>
                <div className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                </div>
              </div>
              
              <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
              
              <div className="prose max-w-none mb-4">
                <p className="whitespace-pre-wrap">{post.content}</p>
              </div>
              
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
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
              
              <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleLikeToggle}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                    isLiked 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  disabled={!currentUser}
                >
                  <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                  <span className="ml-1">({likeCount})</span>
                </button>
                
                <div className="text-gray-500">
                  <span className="mr-1">💬</span> 
                  {post.comments?.length || 0} Comments
                </div>
              </div>
            </div>
            
            {/* Comments section could be added here */}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Post not found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPostModal; 
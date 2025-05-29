import React from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PostList = ({ posts, currentUser, onPostsChange }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Posts</h2>
        <p className="text-gray-500">No posts yet. Create one!</p>
      </div>
    );
  }

  const handleFollowUser = async (userId) => {
    if (!currentUser) return;
    
    try {
      await axios.post(
        `${API_URL}/api/users/${userId}/follow?followerId=${currentUser._id}`
      );
      
      // Notify parent component to refresh posts
      if (onPostsChange) {
        onPostsChange();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };
  
  const handleLikePost = async (postId) => {
    if (!currentUser) return;
    
    try {
      await axios.post(
        `${API_URL}/api/posts/${postId}/like?userId=${currentUser._id}`
      );
      
      // Notify parent component to refresh posts
      if (onPostsChange) {
        onPostsChange();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const isFollowing = (userId) => {
    if (!currentUser || !currentUser.following) return false;
    return currentUser.following.includes(userId);
  };

  const isOwnPost = (userId) => {
    if (!currentUser) return false;
    return currentUser._id === userId;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Posts</h2>
      </div>
      <ul className="divide-y">
        {posts.map(post => (
          <li key={post._id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <div className="font-medium text-blue-600">{post.user?.displayName || 'Unknown User'}</div>
                <span className="mx-2 text-gray-400">•</span>
                <div className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
              
              {!isOwnPost(post.userId) && (
                <div>
                  {!isFollowing(post.userId) ? (
                    <button 
                      onClick={() => handleFollowUser(post.userId)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    >
                      Follow
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Following</span>
                  )}
                </div>
              )}
            </div>
            
            <h3 className="font-bold text-lg mb-2">{post.title}</h3>
            <p className="text-gray-700 mb-3">{post.content}</p>
            
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
            
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <button 
                className="hover:text-blue-600 mr-4"
                onClick={() => handleLikePost(post._id)}
              >
                <span className="mr-1">👍</span> 
                Like {post.likes && post.likes.length > 0 && `(${post.likes.length})`}
              </button>
              <button className="hover:text-blue-600">
                <span className="mr-1">💬</span> Comment
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PostList; 
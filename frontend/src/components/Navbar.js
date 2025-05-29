import { useState } from 'react';
import Link from 'next/link';
import { Bell, User, LogOut, Plus, Compass } from 'react-feather';

const Navbar = ({ 
  currentUser, 
  unreadCount, 
  onRegisterClick, 
  onLogout,
  onDiscoverClick,
  socketConnected,
  pollingActive
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Insyd
        </Link>

        <div className="flex items-center space-x-4">
          {currentUser ? (
            <>
              {/* Connection status indicator */}
              <div className="flex items-center mr-2">
                <div className={`h-2 w-2 rounded-full mr-1 ${
                  socketConnected 
                    ? 'bg-green-500' 
                    : pollingActive 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-300">
                  {socketConnected 
                    ? 'WebSocket' 
                    : pollingActive 
                      ? 'Polling' 
                      : 'Offline'}
                </span>
              </div>

              <Link href="/feed" className="hover:text-gray-300">
                Feed
              </Link>
              
              <button 
                onClick={onDiscoverClick}
                className="flex items-center hover:text-gray-300"
              >
                <Compass size={18} className="mr-1" />
                Discover
              </button>

              <div className="relative">
                <Link href="#" className="flex items-center hover:text-gray-300">
                  <Bell size={18} className="mr-1" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </div>

              <div className="relative">
                <button 
                  onClick={toggleDropdown}
                  className="flex items-center hover:text-gray-300 focus:outline-none"
                >
                  <User size={18} className="mr-1" />
                  {currentUser.displayName || currentUser.username}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <Link 
                      href="#" 
                      onClick={onLogout}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button 
              onClick={onRegisterClick} 
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              <Plus size={18} className="mr-1" />
              Register / Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
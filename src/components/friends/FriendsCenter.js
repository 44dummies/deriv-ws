import React, { useState, useEffect } from 'react';
import FriendSearch from './FriendSearch';
import FriendList from './FriendList';
import FriendRequests from './FriendRequests';
import FriendChat from './FriendChat';
import NotificationBell from './NotificationBell';
import StreakDisplay from './StreakDisplay';
import friendsService from '../../services/friendsService';
import notificationsService from '../../services/notificationsService';
import friendsSocket from '../../services/friendsSocket';
import './FriendsCenter.css';

const FriendsCenter = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      loadData();
      connectSocket();
    }

    return () => {
      friendsSocket.disconnect();
    };
  }, [token]);

  const connectSocket = () => {
    friendsSocket.connect(token, user?.deriv_account_id);
    
    // Listen for real-time events
    friendsSocket.onNewMessage((message) => {
      // Handle new message notification
      if (selectedFriend?.id !== message.senderId) {
        setUnreadCount(prev => prev + 1);
      }
    });

    friendsSocket.onFriendRequest((request) => {
      setPendingRequests(prev => [...prev, request]);
      setUnreadCount(prev => prev + 1);
    });

    friendsSocket.onFriendOnline((data) => {
      setFriends(prev => prev.map(f => 
        f.friend_id === data.userId ? { ...f, is_online: true } : f
      ));
    });

    friendsSocket.onFriendOffline((data) => {
      setFriends(prev => prev.map(f => 
        f.friend_id === data.userId ? { ...f, is_online: false } : f
      ));
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [friendsData, requestsData, notifData, unreadData] = await Promise.all([
        friendsService.getFriends(token),
        friendsService.getPendingRequests(token),
        notificationsService.getNotifications(token),
        notificationsService.getUnreadCount(token)
      ]);
      
      setFriends(friendsData.friends || []);
      setPendingRequests(requestsData.requests || []);
      setNotifications(notifData.notifications || []);
      setUnreadCount(unreadData.count || 0);
    } catch (err) {
      setError('Failed to load friends data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendSelect = (friend) => {
    setSelectedFriend(friend);
    setActiveTab('chat');
  };

  const handleBackToList = () => {
    setSelectedFriend(null);
    setActiveTab('friends');
  };

  const handleRequestAccepted = (friendId) => {
    setPendingRequests(prev => prev.filter(r => r.id !== friendId));
    loadData(); // Reload to get updated friends list
  };

  const handleRequestRejected = (friendId) => {
    setPendingRequests(prev => prev.filter(r => r.id !== friendId));
  };

  if (loading) {
    return (
      <div className="friends-center">
        <div className="friends-loading">
          <div className="loading-spinner"></div>
          <p>Loading Friends Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-center">
      <div className="friends-header">
        <h2>👥 Friends Center</h2>
        <div className="header-actions">
          <StreakDisplay userId={user?.deriv_account_id} token={token} />
          <NotificationBell 
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={(id) => {
              notificationsService.markAsRead(token, id);
              setUnreadCount(prev => Math.max(0, prev - 1));
            }}
            onMarkAllRead={() => {
              notificationsService.markAllAsRead(token);
              setUnreadCount(0);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="friends-error">
          <span>⚠️ {error}</span>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {activeTab === 'chat' && selectedFriend ? (
        <FriendChat 
          friend={selectedFriend}
          user={user}
          token={token}
          onBack={handleBackToList}
        />
      ) : (
        <>
          <div className="friends-tabs">
            <button 
              className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Friends ({friends.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Requests {pendingRequests.length > 0 && <span className="badge">{pendingRequests.length}</span>}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Find Friends
            </button>
          </div>

          <div className="friends-content">
            {activeTab === 'friends' && (
              <FriendList 
                friends={friends}
                onSelectFriend={handleFriendSelect}
                token={token}
              />
            )}

            {activeTab === 'requests' && (
              <FriendRequests 
                requests={pendingRequests}
                onAccept={handleRequestAccepted}
                onReject={handleRequestRejected}
                token={token}
              />
            )}

            {activeTab === 'search' && (
              <FriendSearch 
                token={token}
                currentUserId={user?.deriv_account_id}
                existingFriends={friends.map(f => f.friend_id)}
                onRequestSent={() => loadData()}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FriendsCenter;

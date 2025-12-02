import React from 'react';

const FriendList = ({ friends, onSelectFriend, token }) => {
  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (friends.length === 0) {
    return (
      <div className="friend-list-empty">
        <span className="empty-icon">👥</span>
        <p>No friends yet</p>
        <p className="hint">Search for friends to start connecting!</p>
      </div>
    );
  }

  // Sort friends: online first, then by last seen
  const sortedFriends = [...friends].sort((a, b) => {
    if (a.is_online && !b.is_online) return -1;
    if (!a.is_online && b.is_online) return 1;
    return new Date(b.last_seen || 0) - new Date(a.last_seen || 0);
  });

  return (
    <div className="friend-list">
      {sortedFriends.map(friend => (
        <div 
          key={friend.friend_id} 
          className="friend-card"
          onClick={() => onSelectFriend(friend)}
        >
          <div className="friend-avatar">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt={friend.username} />
            ) : (
              getInitials(friend.username)
            )}
            <span className={`online-indicator ${friend.is_online ? '' : 'offline'}`}></span>
          </div>
          <div className="friend-info">
            <div className="friend-name">{friend.username || friend.nickname || 'Friend'}</div>
            <div className="friend-status">
              {friend.is_online ? (
                <span style={{ color: '#4caf50' }}>● Online</span>
              ) : (
                <span>Last seen {formatLastSeen(friend.last_seen)}</span>
              )}
            </div>
          </div>
          <div className="friend-actions">
            <button 
              className="friend-action-btn" 
              title="Send message"
              onClick={(e) => {
                e.stopPropagation();
                onSelectFriend(friend);
              }}
            >
              💬
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendList;

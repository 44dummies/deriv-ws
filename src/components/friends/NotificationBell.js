import React, { useState, useRef, useEffect } from 'react';

const NotificationBell = ({ notifications, unreadCount, onMarkRead, onMarkAllRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request': return '👋';
      case 'friend_accepted': return '✅';
      case 'message': return '💬';
      case 'ping': return '🔔';
      case 'achievement': return '🏆';
      case 'streak': return '🔥';
      case 'anniversary': return '🎉';
      case 'mentor_request': return '🎓';
      default: return '📢';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    // Additional handling based on notification type can be added here
    setIsOpen(false);
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button 
        className="notification-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔕</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? '' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <div className="notification-text">{notification.content}</div>
                    <div className="notification-time">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

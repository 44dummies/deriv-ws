/**
 * Notification Bell Component - UI for notifications
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, requestNotificationPermission } from '../../trading/notificationService.js';

const styles = {
  container: {
    position: 'relative',
  },
  bellButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--theme-surface)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    position: 'relative',
    transition: 'background-color 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  dropdown: {
    position: 'absolute',
    top: '50px',
    right: 0,
    width: '360px',
    maxHeight: '480px',
    backgroundColor: 'var(--theme-surface)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid var(--theme-border)',
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: '16px',
    color: 'var(--theme-text)',
  },
  headerAction: {
    fontSize: '12px',
    color: 'var(--theme-primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  list: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  notificationItem: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--theme-border)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  notificationItemUnread: {
    backgroundColor: 'var(--theme-primary)08',
  },
  notificationTitle: {
    fontWeight: '600',
    fontSize: '14px',
    color: 'var(--theme-text)',
    marginBottom: '4px',
  },
  notificationMessage: {
    fontSize: '13px',
    color: 'var(--theme-text-secondary)',
    lineHeight: '1.4',
  },
  notificationTime: {
    fontSize: '11px',
    color: 'var(--theme-text-secondary)',
    marginTop: '6px',
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--theme-text-secondary)',
  },
  typeIcon: {
    marginRight: '8px',
  },
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clear } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Request browser notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'session_created': return '🆕';
      case 'session_started': return '▶️';
      case 'session_ended': return '⏹️';
      case 'trade_executed': return '📈';
      case 'tp_reached': return '🎉';
      case 'sl_reached': return '⚠️';
      case 'recovery_started': return '🔄';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '📌';
    }
  };
  
  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };
  
  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.headerTitle}>Notifications</span>
            <div>
              {unreadCount > 0 && (
                <button style={styles.headerAction} onClick={markAllAsRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  style={{ ...styles.headerAction, marginLeft: '12px' }}
                  onClick={clear}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          
          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔕</div>
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationItem,
                    ...(!notification.read ? styles.notificationItemUnread : {}),
                  }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div style={styles.notificationTitle}>
                    <span style={styles.typeIcon}>{getTypeIcon(notification.type)}</span>
                    {notification.title}
                  </div>
                  <div style={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  <div style={styles.notificationTime}>
                    {formatTime(notification.timestamp)}
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

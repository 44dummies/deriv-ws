/**
 * Notification Bell Component
 * Trading notifications dropdown
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Check, CheckCheck, X, Activity, DollarSign,
  UserPlus, Play, Pause, AlertTriangle, TrendingUp, TrendingDown
} from 'lucide-react';
import './NotificationBell.css';

const NOTIFICATION_ICONS = {
  session_invite: UserPlus,
  session_started: Play,
  session_ended: Pause,
  session_paused: Pause,
  session_completed: CheckCheck,
  trade_executed: Activity,
  trade_won: TrendingUp,
  trade_lost: TrendingDown,
  profit_target_reached: DollarSign,
  loss_threshold_reached: AlertTriangle,
  tp_hit: DollarSign,
  sl_hit: AlertTriangle,
  account_connected: Check,
  account_disconnected: X,
  recovery_started: Activity,
  recovery_completed: CheckCheck,
  system_alert: AlertTriangle
};

const NotificationBell = ({ socket = null }: { socket?: any }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Load notifications and invitations
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { tradingApi } = await import('../../trading/tradingApi');
      const apiClient = (await import('../../services/apiClient')).default;

      let allNotifications = [];

      // Fetch trading notifications from API
      try {
        const notifRes = await apiClient.get<{ success?: boolean; notifications?: any[] }>('/user/notifications?limit=50');
        if (notifRes?.success && notifRes?.notifications) {
          const tradingNotifs = notifRes.notifications.map((n: any) => ({
            id: n.id,
            notification_type: n.type || 'trade_executed',
            title: n.type === 'trade_executed' ? '📊 Trade Analysis' : n.type?.replace(/_/g, ' ') || 'Notification',
            message: n.message,
            created_at: n.created_at,
            is_read: n.is_read || false,
            data: n.data
          }));
          allNotifications = [...tradingNotifs];
        }
      } catch (e) {
        console.log('Trading notifications fetch failed:', e);
      }

      // Fetch invitations
      try {
        const accountRes = await tradingApi.getAccounts();
        if (accountRes?.data?.length > 0) {
          const activeAccount = accountRes.data.find((a: any) => a.is_active) || accountRes.data[0];
          const invitesRes = await tradingApi.getInvitations(activeAccount.id);
          if (invitesRes?.data) {
            const invites = invitesRes.data.map((inv: any) => ({
              id: inv.id,
              notification_type: 'session_invite',
              title: 'New Session Invitation',
              message: `You have been invited to join session "${inv.trading_sessions?.session_name}"`,
              created_at: inv.created_at,
              is_read: false,
              data: inv
            }));
            allNotifications = [...allNotifications, ...invites];
          }
        }
      } catch (e) {
        console.log('Invitations fetch failed:', e);
      }

      setNotifications(prev => {
        const merged = [...allNotifications, ...prev];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        return unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
      });

      const unread = allNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);

    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    const handleUnreadCount = ({ count }) => {
      setUnreadCount(count);
    };

    socket.on('trading:notification', handleNotification);
    socket.on('trading:unreadCount', handleUnreadCount);

    // Request initial unread count
    socket.emit('trading:getUnreadCount');

    return () => {
      socket.off('trading:notification', handleNotification);
      socket.off('trading:unreadCount', handleUnreadCount);
    };
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      if (socket) {
        socket.emit('trading:markNotificationRead', { notificationId });
      }
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      for (const notification of notifications.filter(n => !n.is_read)) {
        if (socket) {
          socket.emit('trading:markNotificationRead', { notificationId: notification.id });
        }
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Format time
  const formatTime = (timestamp: string | Date): string => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Get notification icon
  const getIcon = (type) => {
    const IconComponent = NOTIFICATION_ICONS[type] || Bell;
    return <IconComponent size={16} />;
  };

  // Get notification color class
  const getColorClass = (type) => {
    if (type.includes('won') || type.includes('profit') || type.includes('completed')) {
      return 'success';
    }
    if (type.includes('lost') || type.includes('loss') || type.includes('alert')) {
      return 'danger';
    }
    if (type.includes('invite') || type.includes('started')) {
      return 'primary';
    }
    return 'default';
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className={`bell-button ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={32} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getColorClass(notification.notification_type)}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className={`notification-icon ${getColorClass(notification.notification_type)}`}>
                    {getIcon(notification.notification_type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && (
                    <div className="unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="dropdown-footer">
              <button className="view-all">View All Notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

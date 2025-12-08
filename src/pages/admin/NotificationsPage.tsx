/**
 * Notifications Page
 * Manage system notifications and announcements
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Bell, Check, CheckCheck, Trash2, Send, AlertTriangle,
    Info, CheckCircle, X, Plus, RefreshCw
} from 'lucide-react';
import apiClient from '../../services/apiClient';

interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [newNotification, setNewNotification] = useState({
        type: 'info' as 'info' | 'success' | 'warning' | 'error',
        title: '',
        message: ''
    });

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<{ notifications: Notification[] }>('/admin/notifications');
            setNotifications(res?.notifications || []);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            // Use sample data
            setNotifications(generateSampleNotifications());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const generateSampleNotifications = (): Notification[] => [
        {
            id: '1',
            type: 'success',
            title: 'Trading Session Completed',
            message: 'Session "Morning Scalp" completed with +$45.20 profit.',
            read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
            id: '2',
            type: 'warning',
            title: 'High Drawdown Alert',
            message: 'Session reached 80% of stop loss threshold. Consider reviewing.',
            read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
            id: '3',
            type: 'info',
            title: 'New User Registration',
            message: 'User CR9935850 has registered and connected their account.',
            read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        },
        {
            id: '4',
            type: 'error',
            title: 'Connection Error',
            message: 'Lost connection to Deriv API. Attempting reconnection...',
            read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
        },
        {
            id: '5',
            type: 'success',
            title: 'System Update',
            message: 'Trading engine updated to version 2.4.0 with improved performance.',
            read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        }
    ];

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        toast.success('Marked as read');
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('All notifications marked as read');
    };

    const deleteNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Notification deleted');
    };

    const createNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNotification.title || !newNotification.message) {
            toast.error('Please fill in all fields');
            return;
        }

        const newItem: Notification = {
            id: Date.now().toString(),
            ...newNotification,
            read: false,
            created_at: new Date().toISOString()
        };

        setNotifications(prev => [newItem, ...prev]);
        setShowCreateModal(false);
        setNewNotification({ type: 'info', title: '', message: '' });
        toast.success('Notification created');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} style={{ color: '#10b981' }} />;
            case 'warning': return <AlertTriangle size={20} style={{ color: '#f59e0b' }} />;
            case 'error': return <AlertTriangle size={20} style={{ color: '#ef4444' }} />;
            default: return <Info size={20} style={{ color: '#3b82f6' }} />;
        }
    };

    const formatTime = (date: string): string => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const filteredNotifications = notifications.filter(n =>
        filter === 'all' || !n.read
    );

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            background: filter === 'all' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                            border: filter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color: filter === 'all' ? '#fff' : '#9ca3af',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            background: filter === 'unread' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                            border: filter === 'unread' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color: filter === 'unread' ? '#fff' : '#9ca3af',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {unreadCount > 0 && (
                        <button className="btn btn-secondary" onClick={markAllAsRead}>
                            <CheckCheck size={18} />
                            Mark All Read
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        Create Announcement
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="admin-card" style={{ overflow: 'hidden' }}>
                {filteredNotifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                        <Bell size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                        </h3>
                        <p>You're all caught up!</p>
                    </div>
                ) : (
                    <div>
                        {filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '16px',
                                    padding: '20px 24px',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: notification.read ? 'transparent' : 'rgba(59, 130, 246, 0.03)',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '12px',
                                    background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                        notification.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                                            notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                                                'rgba(59, 130, 246, 0.1)'
                                }}>
                                    {getIcon(notification.type)}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: 600 }}>{notification.title}</span>
                                        {!notification.read && (
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#3b82f6'
                                            }} />
                                        )}
                                    </div>
                                    <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                                        {notification.message}
                                    </p>
                                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'block' }}>
                                        {formatTime(notification.created_at)}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!notification.read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                color: '#9ca3af',
                                                cursor: 'pointer'
                                            }}
                                            title="Mark as read"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(notification.id)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer'
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    padding: '20px'
                }}>
                    <div className="admin-card" style={{ width: '100%', maxWidth: '500px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '24px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Create Announcement</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={createNotification} style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                    Type
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(['info', 'success', 'warning', 'error'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewNotification(prev => ({ ...prev, type }))}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: '10px',
                                                border: newNotification.type === type ? '2px solid' : '1px solid rgba(255,255,255,0.1)',
                                                borderColor: newNotification.type === type ? (
                                                    type === 'success' ? '#10b981' :
                                                        type === 'warning' ? '#f59e0b' :
                                                            type === 'error' ? '#ef4444' : '#3b82f6'
                                                ) : undefined,
                                                background: newNotification.type === type ? (
                                                    type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                                        type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                                                            type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                                                ) : 'transparent',
                                                color: type === 'success' ? '#10b981' :
                                                    type === 'warning' ? '#f59e0b' :
                                                        type === 'error' ? '#ef4444' : '#3b82f6',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={newNotification.title}
                                    onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Announcement title"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                    Message
                                </label>
                                <textarea
                                    value={newNotification.message}
                                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Notification message..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Send size={18} />
                                    Send Announcement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationsPage;

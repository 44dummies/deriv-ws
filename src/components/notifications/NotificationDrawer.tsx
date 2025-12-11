import React, { useEffect, useState } from 'react';
import { GlassDrawer } from '../ui/glass/GlassDrawer';
import { notificationsService } from '../../services/notificationsService';
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
}

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await notificationsService.getNotifications({ limit: 20 });
            setNotifications(res.notifications || res.data || []);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success('All marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-emerald-400" size={20} />;
            case 'warning': return <AlertTriangle className="text-amber-400" size={20} />;
            case 'error': return <XCircle className="text-red-400" size={20} />;
            default: return <Info className="text-blue-400" size={20} />;
        }
    };

    const getGlowColor = (type: string) => {
        switch (type) {
            case 'success': return 'border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            case 'warning': return 'border-l-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
            case 'error': return 'border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
            default: return 'border-l-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
        }
    };

    return (
        <GlassDrawer isOpen={isOpen} onClose={onClose} title="Notifications">
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                    <CheckCheck size={14} /> Mark all read
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <Bell size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No new notifications</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(n => (
                        <div
                            key={n.id}
                            className={`
                                relative overflow-hidden p-4 rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10
                                border-l-4 ${getGlowColor(n.type)}
                                ${!n.read ? 'bg-white/10' : 'opacity-70'}
                            `}
                        >
                            <div className="flex gap-3">
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-semibold text-sm ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                                            {n.title}
                                        </h4>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        {n.message}
                                    </p>

                                    {!n.read && (
                                        <button
                                            onClick={(e) => handleMarkRead(n.id, e)}
                                            className="mt-3 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassDrawer>
    );
};

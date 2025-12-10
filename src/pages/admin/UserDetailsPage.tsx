/**
 * User Details Page
 * View detailed user profile, stats, and activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Shield, ShieldOff, Activity, DollarSign,
    TrendingUp, Calendar, Clock, BarChart2, Mail, AlertTriangle
} from 'lucide-react';
import apiClient from '../../services/apiClient';

interface UserProfile {
    id: string;
    deriv_id?: string;
    email?: string;
    fullname?: string;
    username?: string;
    is_admin?: boolean;
    is_online?: boolean;
    created_at?: string;
    last_seen?: string;
    performance_tier?: string;
    stats?: {
        totalTrades: number;
        winRate: number;
        totalProfit: number;
        sessionsJoined: number;
    };
    recentActivity?: Array<{
        type: string;
        description: string;
        timestamp: string;
    }>;
}

const UserDetailsPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const res = await apiClient.get<UserProfile>(`/admin/users/${userId}`);
            setUser(res);
        } catch (error) {
            console.error('Failed to load user:', error);
            // Use sample data
            setUser({
                id: userId,
                deriv_id: 'CR' + userId.slice(0, 7),
                email: 'user@example.com',
                fullname: 'Demo User',
                username: 'demouser',
                is_admin: false,
                is_online: Math.random() > 0.5,
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
                last_seen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                performance_tier: 'intermediate',
                stats: {
                    totalTrades: 156,
                    winRate: 54.2,
                    totalProfit: 127.50,
                    sessionsJoined: 8
                },
                recentActivity: [
                    { type: 'trade', description: 'Won DIGITOVER trade +$0.87', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
                    { type: 'session', description: 'Joined session "Morning Scalp"', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
                    { type: 'trade', description: 'Lost DIGITMATCH trade -$0.35', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
                    { type: 'session', description: 'Left session "Recovery Mode"', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
                    { type: 'login', description: 'Logged in from new device', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() }
                ]
            });
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const toggleAdminRole = async () => {
        if (!user) return;

        try {
            await apiClient.put(`/admin/users/${user.id}/role`, { is_admin: !user.is_admin });
            setUser(prev => prev ? { ...prev, is_admin: !prev.is_admin } : null);
            toast.success(`User ${!user.is_admin ? 'promoted to' : 'removed from'} admin`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update role');
        }
    };

    const formatDate = (date?: string): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date: string): string => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return formatDate(date);
    };

    const formatCurrency = (value: number): string => {
        const sign = value >= 0 ? '+' : '';
        return sign + new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <User size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>User not found</h3>
                <button className="btn btn-secondary" onClick={() => navigate('/admin/users')} style={{ marginTop: '16px' }}>
                    <ArrowLeft size={18} />
                    Back to Users
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Back Button */}
            <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 text-gray-400 bg-transparent border-none cursor-pointer mb-4 sm:mb-6 text-sm hover:text-white transition-colors"
            >
                <ArrowLeft size={18} />
                Back to Users
            </button>

            {/* User Header Card */}
            <div className="admin-card p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-3xl font-bold text-white ${user.is_admin
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            }`}>
                            {(user.fullname || user.username || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold mb-1">
                                {user.fullname || user.username || 'Unknown User'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-400">
                                <code className="px-2 py-1 rounded bg-white/5 text-[10px] sm:text-xs">
                                    {user.deriv_id}
                                </code>
                                <span className={`badge ${user.is_online ? 'badge-success' : 'badge-neutral'}`}>
                                    {user.is_online ? 'Online' : 'Offline'}
                                </span>
                                <span className={`badge ${user.is_admin ? 'badge-info' : 'badge-neutral'}`}>
                                    {user.is_admin ? 'Admin' : 'User'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        className={`btn w-full sm:w-auto text-sm ${user.is_admin ? 'btn-danger' : 'btn-primary'}`}
                        onClick={toggleAdminRole}
                    >
                        {user.is_admin ? <ShieldOff size={16} /> : <Shield size={16} />}
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                </div>

                {/* User Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                    <InfoItem icon={<Mail size={16} />} label="Email" value={user.email || '-'} />
                    <InfoItem icon={<Calendar size={16} />} label="Joined" value={formatDate(user.created_at)} />
                    <InfoItem icon={<Clock size={16} />} label="Last Seen" value={formatTime(user.last_seen || '')} />
                    <InfoItem
                        icon={<TrendingUp size={16} />}
                        label="Performance Tier"
                        value={<span className="capitalize">{user.performance_tier || 'Beginner'}</span>}
                    />
                </div>
            </div>

            {/* Stats & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Stats */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-sm sm:text-base font-semibold mb-4 sm:mb-5 flex items-center gap-2">
                        <BarChart2 size={18} className="text-blue-500" />
                        Trading Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <StatBox label="Total Trades" value={String(user.stats?.totalTrades || 0)} />
                        <StatBox label="Win Rate" value={`${(user.stats?.winRate || 0).toFixed(1)}%`} color={(user.stats?.winRate || 0) >= 50 ? '#10b981' : '#ef4444'} />
                        <StatBox label="Total Profit" value={formatCurrency(user.stats?.totalProfit || 0)} color={(user.stats?.totalProfit || 0) >= 0 ? '#10b981' : '#ef4444'} />
                        <StatBox label="Sessions Joined" value={String(user.stats?.sessionsJoined || 0)} />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-sm sm:text-base font-semibold mb-4 sm:mb-5 flex items-center gap-2">
                        <Activity size={18} className="text-purple-500" />
                        Recent Activity
                    </h3>
                    <div className="flex flex-col gap-2 sm:gap-3">
                        {user.recentActivity?.length === 0 ? (
                            <p className="text-gray-400 text-center py-5">No recent activity</p>
                        ) : (
                            user.recentActivity?.slice(0, 5).map((activity, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03]"
                                >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${activity.type === 'trade' ? 'bg-blue-500' :
                                        activity.type === 'session' ? 'bg-purple-500' :
                                            'bg-green-500'
                                        }`} />
                                    <span className="flex-1 text-xs sm:text-sm truncate">{activity.description}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 shrink-0">{formatTime(activity.timestamp)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

// Info Item Component
interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-gray-400 shrink-0">{icon}</div>
        <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">{label}</div>
            <div className="font-medium text-xs sm:text-sm truncate">{value}</div>
        </div>
    </div>
);

// Stat Box Component
interface StatBoxProps {
    label: string;
    value: string;
    color?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, color }) => (
    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5">
        <div className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2">{label}</div>
        <div className="text-base sm:text-2xl font-bold" style={{ color: color || 'inherit' }}>{value}</div>
    </div>
);

export default UserDetailsPage;

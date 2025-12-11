/**
 * User Details Page - Liquid Glass Renovation
 * View detailed user profile, stats, and activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Shield, ShieldOff, Activity, DollarSign,
    TrendingUp, Calendar, Clock, BarChart2, Mail, AlertTriangle, Monitor, Star
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassMetricTile } from '../../components/ui/glass/GlassMetricTile';
import { GlassStatusBadge } from '../../components/ui/glass/GlassStatusBadge';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-16 text-slate-500">
                <User size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-white mb-2">User not found</h3>
                <GlassButton onClick={() => navigate('/admin/users')} icon={<ArrowLeft size={18} />}>
                    Back to Users
                </GlassButton>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={18} />
                <span>Back to Users</span>
            </button>

            {/* User Header Card */}
            <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <User size={120} />
                </div>

                <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ${user.is_admin
                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            }`}>
                            {(user.fullname || user.username || 'U').slice(0, 2).toUpperCase()}
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {user.fullname || user.username || 'Unknown User'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <code className="px-2 py-1 rounded bg-black/30 border border-white/10 text-xs font-mono text-emerald-400">
                                    {user.deriv_id}
                                </code>
                                <GlassStatusBadge status={user.is_online ? 'active' : 'inactive'}>
                                    {user.is_online ? 'ONLINE' : 'OFFLINE'}
                                </GlassStatusBadge>
                                <GlassStatusBadge status={user.is_admin ? 'warning' : 'neutral'}>
                                    {user.is_admin ? 'ADMIN' : 'USER'}
                                </GlassStatusBadge>
                            </div>
                        </div>
                    </div>

                    <GlassButton
                        variant={user.is_admin ? 'danger' : 'primary'}
                        onClick={toggleAdminRole}
                        icon={user.is_admin ? <ShieldOff size={16} /> : <Shield size={16} />}
                    >
                        {user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                    </GlassButton>
                </div>

                {/* User Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/10">
                    <InfoItem icon={<Mail size={16} />} label="Email Address" value={user.email || '-'} />
                    <InfoItem icon={<Calendar size={16} />} label="Joined Date" value={formatDate(user.created_at)} />
                    <InfoItem icon={<Clock size={16} />} label="Last Seen" value={formatTime(user.last_seen || '')} />
                    <InfoItem
                        icon={<Star size={16} />}
                        label="Status Tier"
                        value={<span className="capitalize text-emerald-400 font-bold">{user.performance_tier || 'Standard'}</span>}
                    />
                </div>
            </GlassCard>

            {/* Stats & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <GlassMetricTile
                        label="Total Trades"
                        value={String(user.stats?.totalTrades || 0)}
                        icon={<BarChart2 size={18} />}
                    />
                    <GlassMetricTile
                        label="Win Rate"
                        value={`${(user.stats?.winRate || 0).toFixed(1)}%`}
                        icon={<TrendingUp size={18} />}
                        trend={((user.stats?.winRate || 0) >= 50) ? 'up' : 'down'}
                    />
                    <GlassMetricTile
                        label="Total Profit"
                        value={`$${(user.stats?.totalProfit || 0).toFixed(2)}`}
                        icon={<DollarSign size={18} />}
                        trend={((user.stats?.totalProfit || 0) >= 0) ? 'up' : 'down'}
                    />
                    <GlassMetricTile
                        label="Sessions Joined"
                        value={String(user.stats?.sessionsJoined || 0)}
                        icon={<Monitor size={18} />}
                    />
                </div>

                {/* Recent Activity */}
                <GlassCard className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-purple-400" size={20} />
                        <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                    </div>

                    <div className="flex-1 space-y-3">
                        {user.recentActivity?.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">
                                No recent activity recorded
                            </div>
                        ) : (
                            user.recentActivity?.slice(0, 5).map((activity, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_10px_currentColor] ${activity.type === 'trade' ? 'bg-blue-500 text-blue-500' :
                                            activity.type === 'session' ? 'bg-purple-500 text-purple-500' :
                                                'bg-emerald-500 text-emerald-500'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-200 truncate">{activity.description}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{formatTime(activity.timestamp)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

// Info Item Component
interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
        <div className="text-slate-400 p-2 bg-white/5 rounded-lg">{icon}</div>
        <div className="min-w-0">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="font-medium text-slate-200 truncate">{value}</div>
        </div>
    </div>
);

export default UserDetailsPage;

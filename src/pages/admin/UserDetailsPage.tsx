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
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#9ca3af',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '24px',
                    fontSize: '14px'
                }}
            >
                <ArrowLeft size={18} />
                Back to Users
            </button>

            {/* User Header Card */}
            <div className="admin-card" style={{ padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '20px',
                            background: user.is_admin
                                ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 700,
                            color: 'white'
                        }}>
                            {(user.fullname || user.username || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
                                {user.fullname || user.username || 'Unknown User'}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#9ca3af' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <code style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        fontSize: '12px'
                                    }}>
                                        {user.deriv_id}
                                    </code>
                                </span>
                                <span className={`badge ${user.is_online ? 'badge-success' : 'badge-neutral'}`}>
                                    {user.is_online ? 'Online' : 'Offline'}
                                </span>
                                <span className={`badge ${user.is_admin ? 'badge-info' : 'badge-neutral'}`}>
                                    {user.is_admin ? 'Admin' : 'User'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className={`btn ${user.is_admin ? 'btn-danger' : 'btn-primary'}`}
                            onClick={toggleAdminRole}
                        >
                            {user.is_admin ? <ShieldOff size={18} /> : <Shield size={18} />}
                            {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                    </div>
                </div>

                {/* User Info Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '24px',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <InfoItem icon={<Mail />} label="Email" value={user.email || '-'} />
                    <InfoItem icon={<Calendar />} label="Joined" value={formatDate(user.created_at)} />
                    <InfoItem icon={<Clock />} label="Last Seen" value={formatTime(user.last_seen || '')} />
                    <InfoItem
                        icon={<TrendingUp />}
                        label="Performance Tier"
                        value={<span style={{ textTransform: 'capitalize' }}>{user.performance_tier || 'Beginner'}</span>}
                    />
                </div>
            </div>

            {/* Stats & Activity Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Stats */}
                <div className="admin-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart2 size={20} style={{ color: '#3b82f6' }} />
                        Trading Stats
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <StatBox label="Total Trades" value={String(user.stats?.totalTrades || 0)} />
                        <StatBox label="Win Rate" value={`${(user.stats?.winRate || 0).toFixed(1)}%`} color={(user.stats?.winRate || 0) >= 50 ? '#10b981' : '#ef4444'} />
                        <StatBox label="Total Profit" value={formatCurrency(user.stats?.totalProfit || 0)} color={(user.stats?.totalProfit || 0) >= 0 ? '#10b981' : '#ef4444'} />
                        <StatBox label="Sessions Joined" value={String(user.stats?.sessionsJoined || 0)} />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="admin-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity size={20} style={{ color: '#8b5cf6' }} />
                        Recent Activity
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {user.recentActivity?.length === 0 ? (
                            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No recent activity</p>
                        ) : (
                            user.recentActivity?.slice(0, 5).map((activity, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: activity.type === 'trade' ? '#3b82f6' :
                                            activity.type === 'session' ? '#8b5cf6' :
                                                '#10b981'
                                    }} />
                                    <span style={{ flex: 1, fontSize: '14px' }}>{activity.description}</span>
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatTime(activity.timestamp)}</span>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ color: '#9ca3af' }}>{icon}</div>
        <div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontWeight: 500 }}>{value}</div>
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
    <div style={{
        padding: '16px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)'
    }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: color || 'inherit' }}>{value}</div>
    </div>
);

export default UserDetailsPage;

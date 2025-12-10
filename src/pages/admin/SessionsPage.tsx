/**
 * Sessions Management Page
 * View, create, and manage trading sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Plus, Search, Play, Square, Trash2,
    Calendar, Activity, X, Users, UserX, Eye
} from 'lucide-react';
import * as tradingApi from '../../trading/tradingApi';

interface Session {
    id: string;
    name: string;
    status: string;
    session_type?: string;
    trade_count?: number;
    current_pnl?: number;
    created_at?: string;
    min_balance?: number;
    initial_stake?: number;
    // Legacy support (V1 schema)
    session_name?: string;
    total_trades?: number;
    net_pnl?: number;
    // V2 schema
    type?: string;
}

interface Participant {
    id: string;
    user_id: string;
    session_id: string;
    tp: number;
    sl: number;
    status: string;
    current_pnl: number;
    initial_balance: number;
    accepted_at: string;
    removed_at?: string;
    removal_reason?: string;
    user_profiles?: {
        id: string;
        deriv_id?: string;
        username?: string;
        fullname?: string;
        email?: string;
    };
}

interface ParticipantStats {
    total: number;
    active: number;
    removed: number;
    totalPnl: number;
    totalInitialBalance: number;
}

interface FormData {
    name: string;
    session_type: string;
    mode: 'real' | 'demo';
    min_balance: number;
    initial_stake: number;
    stake_percentage: number;
    default_tp: number;
    default_sl: number;
    martingale_multiplier: number;
    max_consecutive_losses: number;
    description: string;
}

const SessionsPage: React.FC = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        session_type: 'day',
        mode: 'real',
        min_balance: 100,
        initial_stake: 1.0,
        stake_percentage: 1.5,
        martingale_multiplier: 2.0,
        max_consecutive_losses: 4,
        default_tp: 10,
        default_sl: 5,
        description: ''
    });
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [participantStats, setParticipantStats] = useState<ParticipantStats | null>(null);
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    const loadSessions = useCallback(async () => {
        try {
            const res = await tradingApi.getSessions({ limit: 50 });
            setSessions(res?.data || res?.sessions || []);
        } catch (error) {
            console.error('Failed to load sessions:', error);
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Session name is required');
            return;
        }

        setCreating(true);
        try {
            await tradingApi.createSession(formData);
            toast.success('Session created successfully!');
            setShowCreateModal(false);
            setFormData({
                name: '',
                session_type: 'day',
                mode: 'real',
                min_balance: 100,
                initial_stake: 1.0,
                stake_percentage: 1.5,
                default_tp: 10,
                default_sl: 5,
                martingale_multiplier: 2.0,
                max_consecutive_losses: 4,
                description: ''
            });
            // Refresh list
            loadSessions();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create session');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!window.confirm('Are you sure you want to delete this session?')) return;

        try {
            await tradingApi.deleteSession(sessionId);
            toast.success('Session deleted');
            loadSessions();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete session');
        }
    };

    const loadParticipants = async (session: Session) => {
        setSelectedSession(session);
        setLoadingParticipants(true);
        try {
            const res = await tradingApi.getSessionParticipants(session.id);
            setParticipants(res?.participants || []);
            setParticipantStats(res?.stats || null);
        } catch (error: any) {
            console.error('Failed to load participants:', error);
            toast.error(error.message || 'Failed to load participants');
        } finally {
            setLoadingParticipants(false);
        }
    };

    const handleKickUser = async (userId: string, userName: string) => {
        if (!selectedSession) return;
        if (!window.confirm(`Are you sure you want to remove ${userName} from this session?`)) return;

        try {
            await tradingApi.kickParticipant(selectedSession.id, userId, 'admin_kick');
            toast.success(`${userName} removed from session`);
            // Refresh participants
            loadParticipants(selectedSession);
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove user');
        }
    };

    const formatCurrency = (value?: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    };

    const formatDate = (date?: string): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = (session.session_name || session.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (session.id || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
        // Use logic from context if available, or omit type filter if not defined in state
        const matchesType = true; // Placeholder until I see the state variables

        return matchesSearch && matchesStatus && matchesType;
    });

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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 max-w-full sm:max-w-[500px]">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex-1">
                        <Search size={16} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-gray-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white text-sm cursor-pointer outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="running">Running</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <button className="btn btn-primary w-full sm:w-auto text-sm py-2.5" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    <span className="sm:inline">Create Session</span>
                </button>
            </div>

            {/* Sessions Table */}
            <div className="admin-card admin-table-container">
                {filteredSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                        <Activity size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>No sessions found</h3>
                        <p>Create your first trading session to get started</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Session Name</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Trades</th>
                                <th>P&L</th>
                                <th>Created</th>
                                <th style={{ width: '80px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSessions.map(session => (
                                <tr key={session.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{session.name || session.session_name}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">
                                            {session.session_type || session.type || 'Standard'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${session.status === 'running' ? 'badge-success' :
                                            session.status === 'pending' ? 'badge-warning' :
                                                session.status === 'completed' ? 'badge-info' :
                                                    'badge-neutral'
                                            }`}>
                                            {session.status}
                                        </span>
                                    </td>
                                    <td>{session.trade_count || session.total_trades || 0}</td>
                                    <td style={{
                                        fontFamily: 'monospace',
                                        fontWeight: 600,
                                        color: (session.current_pnl || session.net_pnl || 0) >= 0 ? '#10b981' : '#ef4444'
                                    }}>
                                        {formatCurrency(session.current_pnl || session.net_pnl)}
                                    </td>
                                    <td style={{ color: '#9ca3af' }}>{formatDate(session.created_at)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-icon btn-secondary"
                                                onClick={() => loadParticipants(session)}
                                                title="View Participants"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-secondary"
                                                onClick={() => handleDeleteSession(session.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-3 sm:p-5">
                    <div className="admin-card w-full max-w-[600px] max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10">
                            <h2 className="text-base sm:text-xl font-bold">Create New Session</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="bg-transparent border-none text-gray-400 cursor-pointer p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSession} className="p-4 sm:p-6">
                            <div className="grid gap-4 sm:gap-5">
                                {/* Session Name */}
                                <div>
                                    <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                        Session Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Morning Scalp"
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none"
                                        required
                                    />
                                </div>

                                {/* Type & Mode */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                            Session Type
                                        </label>
                                        <select
                                            value={formData.session_type}
                                            onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none cursor-pointer"
                                        >
                                            <option value="day">Day Trading</option>
                                            <option value="one_time">One Time</option>
                                            <option value="recovery">Recovery</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                            Mode
                                        </label>
                                        <select
                                            value={formData.mode || 'real'}
                                            onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'real' | 'demo' })}
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none cursor-pointer"
                                        >
                                            <option value="real">Real Account</option>
                                            <option value="demo">Demo Account</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Min Balance Row */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                        Min Balance ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.min_balance}
                                        onChange={(e) => setFormData({ ...formData, min_balance: Number(e.target.value) })}
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
                                        min="0"
                                    />
                                </div>

                                {/* Stake Settings */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                            Initial Stake ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.initial_stake}
                                            onChange={(e) => setFormData({ ...formData, initial_stake: Number(e.target.value) })}
                                            step="0.01"
                                            min="0.35"
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                            Martingale Multiplier
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.martingale_multiplier}
                                            onChange={(e) => setFormData({ ...formData, martingale_multiplier: Number(e.target.value) })}
                                            step="0.1"
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                {/* TP/SL Settings */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                            Take Profit ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.default_tp}
                                            onChange={(e) => setFormData({ ...formData, default_tp: Number(e.target.value) })}
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                            Stop Loss ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.default_sl}
                                            onChange={(e) => setFormData({ ...formData, default_sl: Number(e.target.value) })}
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block mb-2 text-xs sm:text-sm text-gray-400">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief plan for this session..."
                                        rows={3}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black/30 border border-white/10 text-white text-sm outline-none resize-none"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                                <button
                                    type="button"
                                    className="btn btn-secondary w-full sm:w-auto"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary w-full sm:w-auto"
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-t-2 border-b-2 border-white"></div>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            Create Session
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Participants Panel */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-3 sm:p-5">
                    <div className="admin-card w-full max-w-[700px] max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
                                    <Users size={20} />
                                    {selectedSession.name || selectedSession.session_name}
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">Session Participants</p>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="bg-transparent border-none text-gray-400 cursor-pointer p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Stats Row */}
                        {participantStats && (
                            <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/10">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-white">{participantStats.total}</div>
                                    <div className="text-xs text-gray-400">Total</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-400">{participantStats.active}</div>
                                    <div className="text-xs text-gray-400">Active</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-red-400">{participantStats.removed}</div>
                                    <div className="text-xs text-gray-400">Removed</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-lg font-bold ${participantStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(participantStats.totalPnl)}
                                    </div>
                                    <div className="text-xs text-gray-400">Total PnL</div>
                                </div>
                            </div>
                        )}

                        {/* Participants List */}
                        <div className="p-4">
                            {loadingParticipants ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            ) : participants.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No participants in this session</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {participants.map(p => (
                                        <div
                                            key={p.id}
                                            className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 ${p.status !== 'active' ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold">
                                                    {(p.user_profiles?.fullname || p.user_profiles?.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">
                                                        {p.user_profiles?.fullname || p.user_profiles?.username || p.user_id.slice(0, 8)}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        TP: ${p.tp} / SL: ${p.sl}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className={`font-mono font-bold ${(p.current_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {formatCurrency(p.current_pnl)}
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                            p.status === 'removed' ? 'bg-red-500/20 text-red-400' :
                                                                p.status === 'left' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </div>
                                                {p.status === 'active' && (
                                                    <button
                                                        onClick={() => handleKickUser(p.user_id, p.user_profiles?.fullname || p.user_profiles?.username || 'User')}
                                                        className="btn btn-icon bg-red-500/20 hover:bg-red-500/30 text-red-400 border-none"
                                                        title="Remove from session"
                                                    >
                                                        <UserX size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SessionsPage;

/**
 * Sessions Management Page
 * View, create, and manage trading sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Plus, Search, Filter, Play, Square, Trash2,
    Calendar, DollarSign, Activity, MoreVertical, X
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

interface FormData {
    name: string;
    session_type: string;
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
        min_balance: 100,
        initial_stake: 0.35,
        stake_percentage: 1.5,
        default_tp: 10,
        default_sl: 10,
        martingale_multiplier: 2.1,
        max_consecutive_losses: 4,
        description: ''
    });

    const loadSessions = useCallback(async () => {
        try {
            const res = await tradingApi.getSessions({ limit: 50 });
            setSessions(res?.sessions || []);
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
                min_balance: 100,
                initial_stake: 0.35,
                stake_percentage: 1.5,
                default_tp: 10,
                default_sl: 10,
                martingale_multiplier: 2.1,
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
        const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
        return matchesSearch && matchesStatus;
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '500px' }}>
                    {/* Search */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        flex: 1
                    }}>
                        <Search size={18} style={{ color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: '14px',
                                width: '100%'
                            }}
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="running">Running</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={20} />
                    Create Session
                </button>
            </div>

            {/* Sessions Table */}
            <div className="admin-card" style={{ overflow: 'hidden' }}>
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
                    <div className="admin-card" style={{
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '24px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Create New Session</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSession} style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gap: '20px' }}>
                                {/* Session Name */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                        Session Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Morning Scalp"
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
                                        required
                                    />
                                </div>

                                {/* Type & Min Balance */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                            Session Type
                                        </label>
                                        <select
                                            value={formData.session_type}
                                            onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff',
                                                fontSize: '14px',
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="day">Day Trading</option>
                                            <option value="one_time">One Time</option>
                                            <option value="recovery">Recovery</option>
                                        </select>
                                    </div>
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
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                            Martingale Multiplier
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.martingale_multiplier}
                                            onChange={(e) => setFormData({ ...formData, martingale_multiplier: Number(e.target.value) })}
                                            step="0.1"
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
                                </div>

                                {/* TP/SL Settings */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                            Take Profit ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.default_tp}
                                            onChange={(e) => setFormData({ ...formData, default_tp: Number(e.target.value) })}
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
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                            Stop Loss ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.default_sl}
                                            onChange={(e) => setFormData({ ...formData, default_sl: Number(e.target.value) })}
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
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief plan for this session..."
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
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    ) : (
                                        <>
                                            <Plus size={20} />
                                            Create Session
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default SessionsPage;

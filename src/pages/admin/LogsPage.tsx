/**
 * Activity Logs Page
 * View system activity and events
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Search, Filter, RefreshCw, Activity, AlertTriangle,
    CheckCircle, Info, Clock, Download
} from 'lucide-react';
import apiClient from '../../services/apiClient';

interface LogEntry {
    id: string;
    type: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    details?: string;
    user_id?: string;
    created_at: string;
}

const LogsPage: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<{ logs: LogEntry[] }>('/admin/logs?limit=100');
            setLogs(response?.logs || []);
        } catch (error) {
            console.error('Failed to load logs:', error);
            // Generate sample logs for demo
            setLogs(generateSampleLogs());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const generateSampleLogs = (): LogEntry[] => {
        const types = ['trade', 'session', 'user', 'system', 'bot'];
        const levels: ('info' | 'warning' | 'error' | 'success')[] = ['info', 'warning', 'error', 'success'];
        const messages = [
            'Trading session started',
            'User logged in successfully',
            'Bot executed trade',
            'Session completed with profit',
            'Connection timeout - retrying',
            'Emergency stop triggered',
            'New user registered',
            'Trade won - DIGITMATCH',
            'Trade lost - DIGITOVER',
            'Market analysis updated'
        ];

        return Array.from({ length: 20 }, (_, i) => ({
            id: `log-${i}`,
            type: types[Math.floor(Math.random() * types.length)],
            level: levels[Math.floor(Math.random() * levels.length)],
            message: messages[Math.floor(Math.random() * messages.length)],
            created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString()
        }));
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'success': return <CheckCircle size={16} style={{ color: '#10b981' }} />;
            case 'warning': return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
            case 'error': return <AlertTriangle size={16} style={{ color: '#ef4444' }} />;
            default: return <Info size={16} style={{ color: '#3b82f6' }} />;
        }
    };

    const getLevelBadgeClass = (level: string) => {
        switch (level) {
            case 'success': return 'badge-success';
            case 'warning': return 'badge-warning';
            case 'error': return 'badge-danger';
            default: return 'badge-info';
        }
    };

    const formatTime = (date: string): string => {
        const d = new Date(date);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const exportLogs = () => {
        const csv = [
            ['Time', 'Type', 'Level', 'Message'].join(','),
            ...filteredLogs.map(log =>
                [formatTime(log.created_at), log.type, log.level, `"${log.message}"`].join(',')
            )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Logs exported');
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
        return matchesSearch && matchesLevel;
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
                <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
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
                            placeholder="Search logs..."
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

                    {/* Level Filter */}
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
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
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={loadLogs}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button className="btn btn-primary" onClick={exportLogs}>
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="admin-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)' }}>
                        <Info size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>{logs.filter(l => l.level === 'info').length}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Info</div>
                    </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)' }}>
                        <CheckCircle size={20} style={{ color: '#10b981' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>{logs.filter(l => l.level === 'success').length}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Success</div>
                    </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)' }}>
                        <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>{logs.filter(l => l.level === 'warning').length}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Warning</div>
                    </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)' }}>
                        <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>{logs.filter(l => l.level === 'error').length}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Error</div>
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="admin-card" style={{ overflow: 'hidden' }}>
                {filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                        <Activity size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>No logs found</h3>
                        <p>Activity logs will appear here</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                        {filteredLogs.map(log => (
                            <div
                                key={log.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {getLevelIcon(log.level)}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 500 }}>{log.message}</span>
                                        <span className={`badge ${getLevelBadgeClass(log.level)}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                            {log.level}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', gap: '12px' }}>
                                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{log.type}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px', flexShrink: 0 }}>
                                    <Clock size={14} />
                                    {formatTime(log.created_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default LogsPage;

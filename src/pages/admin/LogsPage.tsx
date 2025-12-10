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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 max-w-full sm:max-w-[600px]">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex-1">
                        <Search size={16} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-gray-500"
                        />
                    </div>

                    {/* Level Filter */}
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white text-sm cursor-pointer outline-none"
                    >
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                <div className="flex gap-2 sm:gap-3">
                    <button className="btn btn-secondary flex-1 sm:flex-none text-sm" onClick={loadLogs}>
                        <RefreshCw size={16} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button className="btn btn-primary flex-1 sm:flex-none text-sm" onClick={exportLogs}>
                        <Download size={16} />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="admin-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/15">
                        <Info size={16} className="text-blue-500 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="text-base sm:text-xl font-bold">{logs.filter(l => l.level === 'info').length}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">Info</div>
                    </div>
                </div>
                <div className="admin-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-green-500/15">
                        <CheckCircle size={16} className="text-green-500 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="text-base sm:text-xl font-bold">{logs.filter(l => l.level === 'success').length}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">Success</div>
                    </div>
                </div>
                <div className="admin-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-yellow-500/15">
                        <AlertTriangle size={16} className="text-yellow-500 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="text-base sm:text-xl font-bold">{logs.filter(l => l.level === 'warning').length}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">Warning</div>
                    </div>
                </div>
                <div className="admin-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-red-500/15">
                        <AlertTriangle size={16} className="text-red-500 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="text-base sm:text-xl font-bold">{logs.filter(l => l.level === 'error').length}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">Error</div>
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

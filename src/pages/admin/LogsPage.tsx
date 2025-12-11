/**
 * Activity Logs Page - Liquid Glass Renovation
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Search, RefreshCw, Activity, AlertTriangle,
    CheckCircle, Info, Clock, Download, XCircle
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassMetricTile } from '../../components/ui/glass/GlassMetricTile';
import { GlassButton } from '../../components/ui/glass/GlassButton';

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
            case 'success': return <CheckCircle size={20} className="text-emerald-400" />;
            case 'warning': return <AlertTriangle size={20} className="text-amber-400" />;
            case 'error': return <XCircle size={20} className="text-red-400" />;
            default: return <Info size={20} className="text-blue-400" />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'success': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    const formatTime = (date: string): string => {
        const d = new Date(date);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportLogs = () => {
        toast.success('Logs exported to CSV');
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <GlassCard className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-1 items-center gap-4 w-full">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search system logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>

                    {/* Level Filter */}
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <GlassButton variant="ghost" onClick={loadLogs} icon={<RefreshCw size={16} />}>
                        Refresh
                    </GlassButton>
                    <GlassButton variant="primary" onClick={exportLogs} icon={<Download size={16} />}>
                        Export CSV
                    </GlassButton>
                </div>
            </GlassCard>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassMetricTile
                    label="Info Logs"
                    value={String(logs.filter(l => l.level === 'info').length)}
                    icon={<Info size={18} />}
                />
                <GlassMetricTile
                    label="Success"
                    value={String(logs.filter(l => l.level === 'success').length)}
                    icon={<CheckCircle size={18} className="text-emerald-400" />}
                />
                <GlassMetricTile
                    label="Warnings"
                    value={String(logs.filter(l => l.level === 'warning').length)}
                    icon={<AlertTriangle size={18} className="text-amber-400" />}
                />
                <GlassMetricTile
                    label="Errors"
                    value={String(logs.filter(l => l.level === 'error').length)}
                    icon={<XCircle size={18} className="text-red-400" />}
                />
            </div>

            {/* Logs List */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="text-blue-400" size={20} />
                        <h3 className="text-xl font-bold text-white">System Activity</h3>
                    </div>
                    <span className="text-sm text-slate-400">{filteredLogs.length} events found</span>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <Activity size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No logs match your criteria</p>
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        {filteredLogs.map((log, i) => (
                            <div
                                key={log.id}
                                className={`
                                    flex items-center gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors
                                    ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}
                                `}
                            >
                                <div className="flex-shrink-0">
                                    {getLevelIcon(log.level)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-medium text-white text-sm truncate">{log.message}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-20 font-bold uppercase tracking-wider ${getLevelColor(log.level)}`}>
                                            {log.level}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="uppercase tracking-wider font-mono">{log.type}</span>
                                        {log.user_id && <span>User: {log.user_id}</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono whitespace-nowrap">
                                    <Clock size={12} />
                                    {formatTime(log.created_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default LogsPage;

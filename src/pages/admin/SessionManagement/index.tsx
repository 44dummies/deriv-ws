/**
 * Advanced Session Management Page
 * Comprehensive real-time trading session monitoring and control
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity, Play, Pause, Square, RefreshCw, Filter, Search, ChevronDown, ChevronUp,
    TrendingUp, TrendingDown, DollarSign, Users, Clock, Zap, AlertTriangle, Bell,
    BellOff, Sun, Moon, Settings, BarChart2, Target, Shield, Eye, EyeOff,
    CheckCircle, XCircle, Volume2, VolumeX, Maximize2, Minimize2, Download
} from 'lucide-react';
import { ChartPanel } from '../../../components/chart/ChartPanel';
import { CreateSessionModal } from '../../../components/admin/SessionManagement/CreateSessionModal';
import { SessionHealthPanel } from '../../../components/admin/SessionManagement/SessionHealthPanel';
import { ThemeContext } from '../../../context/ThemeContext';
import { useSessionManagement } from '../../../hooks/useSessionManagement';
import { useSessionTicks } from '../../../hooks/useSessionTicks';
import { useAudioAlerts } from '../../../hooks/useAudioAlerts';
import { ManagedSession, SessionFilters, SessionStatus, StrategyType } from '../../../types/session';

// Theme Context
const ThemeContext = React.createContext<{ theme: 'dark' | 'light'; toggle: () => void }>({
    theme: 'dark',
    toggle: () => { }
});

export default function SessionManagement() {
    // Theme
    const [theme, setTheme] = useState<'dark' | 'light'>(() =>
        localStorage.getItem('theme') as 'dark' | 'light' || 'dark'
    );
    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // Session Management Hook
    const {
        sessions,
        filteredSessions,
        selectedSession,
        alerts,
        loading,
        error,
        connected,
        filters,
        setFilters,
        selectSession,
        refreshSessions,
        startSession,
        pauseSession,
        resumeSession,
        stopSession,
        updateTPSL,
        bulkOperation,
        acknowledgeAlert,
        clearAlerts
    } = useSessionManagement();

    // Audio Alerts
    const { playAlert, setMuted, isMuted } = useAudioAlerts();

    // Local State
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'logs'>('overview');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
    const [expandedPanels, setExpandedPanels] = useState({
        chart: true,
        controls: true,
        alerts: true,
        analytics: true
    });
    const [editingTPSL, setEditingTPSL] = useState<{ tp: number; sl: number } | null>(null);
    const [showAuditLog, setShowAuditLog] = useState(false);

    // Ticks for selected session
    const { ticks } = useSessionTicks(selectedSession?.id || null);
    const activeMarket = selectedSession?.symbols[0] || 'R_100';
    const chartTicks = ticks[activeMarket] || [];

    // Play audio on new alerts
    useEffect(() => {
        if (alerts.length > 0 && !alerts[0].soundPlayed) {
            playAlert(alerts[0].type);
        }
    }, [alerts, playAlert]);

    // Bulk selection handlers
    const toggleSessionSelection = (sessionId: string) => {
        setSelectedSessionIds(prev =>
            prev.includes(sessionId)
                ? prev.filter(id => id !== sessionId)
                : [...prev, sessionId]
        );
    };

    const selectAllSessions = () => {
        setSelectedSessionIds(filteredSessions.map(s => s.id));
    };

    const clearSelection = () => {
        setSelectedSessionIds([]);
    };

    // Stats calculations
    const stats = useMemo(() => {
        const runningSessions = sessions.filter(s => s.status === 'running');
        const totalPnL = sessions.reduce((sum, s) => sum + s.pnl, 0);
        const totalTrades = sessions.reduce((sum, s) => sum + s.trades.length, 0);
        const totalWins = sessions.reduce((sum, s) => sum + s.analytics.wins, 0);
        const totalExposure = runningSessions.reduce((sum, s) => sum + s.currentExposure, 0);

        return {
            totalSessions: sessions.length,
            runningSessions: runningSessions.length,
            totalPnL,
            totalTrades,
            winRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
            totalExposure
        };
    }, [sessions]);

    // Status color helper
    const getStatusColor = (status: SessionStatus) => {
        switch (status) {
            case 'running': return 'bg-emerald-500 text-emerald-400';
            case 'paused': return 'bg-yellow-500 text-yellow-400';
            case 'stopped': return 'bg-slate-500 text-slate-400';
            case 'error': return 'bg-red-500 text-red-400';
            case 'completed': return 'bg-blue-500 text-blue-400';
            default: return 'bg-slate-500 text-slate-400';
        }
    };

    // Theme classes
    const isDark = theme === 'dark';
    const bgMain = isDark ? 'bg-transparent' : 'bg-gray-100';
    const bgCard = isDark ? 'bg-slate-800/50 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md';
    const bgHover = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50/80';
    const border = isDark ? 'border-slate-700/50' : 'border-gray-200/50';
    const text = isDark ? 'text-slate-100' : 'text-gray-900';
    const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

    return (
        <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
            <div className={`min-h-screen ${bgMain} ${text} transition-colors duration-300`}>
                {/* Header */}
                <header className={`sticky top-0 z-50 ${bgCard} border-b ${border} px-4 py-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Title & Status */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-6 h-6 text-emerald-500" />
                                <h1 className="text-xl font-bold">Session Management</h1>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${connected ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-xs font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={refreshSessions}
                                className={`p-2 rounded-lg ${bgHover} ${textMuted} hover:text-white transition-all`}
                                title="Refresh"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setMuted(!isMuted)}
                                className={`p-2 rounded-lg ${bgHover} ${textMuted} hover:text-white transition-all`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={toggleTheme}
                                className={`p-2 rounded-lg ${bgHover} ${textMuted} hover:text-white transition-all`}
                                title="Toggle Theme"
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => setShowAuditLog(!showAuditLog)}
                                className={`p-2 rounded-lg ${bgHover} ${textMuted} hover:text-white transition-all`}
                                title="Audit Log"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Stats Bar */}
                <div className={`${bgCard} border-b ${border} px-4 py-3`}>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <StatCard
                            icon={<Users className="w-4 h-4" />}
                            label="Sessions"
                            value={`${stats.runningSessions}/${stats.totalSessions}`}
                            color="text-blue-400"
                            isDark={isDark}
                        />
                        <StatCard
                            icon={<DollarSign className="w-4 h-4" />}
                            label="Total P/L"
                            value={`${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`}
                            color={stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}
                            isDark={isDark}
                        />
                        <StatCard
                            icon={<Activity className="w-4 h-4" />}
                            label="Total Trades"
                            value={stats.totalTrades.toString()}
                            color="text-purple-400"
                            isDark={isDark}
                        />
                        <StatCard
                            icon={<Target className="w-4 h-4" />}
                            label="Win Rate"
                            value={`${stats.winRate.toFixed(1)}%`}
                            color="text-cyan-400"
                            isDark={isDark}
                        />
                        <StatCard
                            icon={<Shield className="w-4 h-4" />}
                            label="Exposure"
                            value={`$${stats.totalExposure.toFixed(2)}`}
                            color="text-yellow-400"
                            isDark={isDark}
                        />
                        <StatCard
                            icon={<Bell className="w-4 h-4" />}
                            label="Alerts"
                            value={alerts.filter(a => !a.acknowledged).length.toString()}
                            color="text-orange-400"
                            isDark={isDark}
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Panel - Session List */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-4">
                        {/* Filters */}
                        <div className={`${bgCard} rounded-xl border ${border} p-4`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Sessions
                                </h3>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-1 rounded ${bgHover}`}
                                >
                                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-100'} border ${border} focus:ring-2 focus:ring-emerald-500 outline-none text-sm`}
                                />
                            </div>

                            {/* Filter Options */}
                            {showFilters && (
                                <div className="space-y-3 mb-3">
                                    <select
                                        value={filters.status || 'all'}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                                        className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-100'} border ${border} text-sm`}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="running">Running</option>
                                        <option value="paused">Paused</option>
                                        <option value="stopped">Stopped</option>
                                        <option value="completed">Completed</option>
                                    </select>

                                    <select
                                        value={filters.accountType || 'all'}
                                        onChange={(e) => setFilters({ ...filters, accountType: e.target.value as any })}
                                        className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-100'} border ${border} text-sm`}
                                    >
                                        <option value="all">All Accounts</option>
                                        <option value="demo">Demo</option>
                                        <option value="real">Real</option>
                                    </select>

                                    <select
                                        value={filters.sortBy || 'startTime'}
                                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                                        className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-100'} border ${border} text-sm`}
                                    >
                                        <option value="startTime">Sort by Time</option>
                                        <option value="pnl">Sort by P/L</option>
                                        <option value="trades">Sort by Trades</option>
                                        <option value="balance">Sort by Balance</option>
                                    </select>
                                </div>
                            )}

                            {/* Bulk Actions */}
                            {selectedSessionIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                                    <span className="text-xs text-emerald-400">{selectedSessionIds.length} selected</span>
                                    <button
                                        onClick={() => bulkOperation({ action: 'start', sessionIds: selectedSessionIds })}
                                        className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
                                    >
                                        Start All
                                    </button>
                                    <button
                                        onClick={() => bulkOperation({ action: 'stop', sessionIds: selectedSessionIds })}
                                        className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                    >
                                        Stop All
                                    </button>
                                    <button
                                        onClick={clearSelection}
                                        className="text-xs px-2 py-1 bg-slate-500/20 text-slate-400 rounded hover:bg-slate-500/30"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Session List */}
                        <div className={`${bgCard} rounded-xl border ${border} overflow-hidden`}>
                            <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                                {loading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                                        <p className={textMuted}>Loading sessions...</p>
                                    </div>
                                ) : filteredSessions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Zap className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                                        <p className={textMuted}>No sessions found</p>
                                    </div>
                                ) : (
                                    filteredSessions.map(session => (
                                        <SessionRow
                                            key={session.id}
                                            session={session}
                                            selected={selectedSession?.id === session.id}
                                            checked={selectedSessionIds.includes(session.id)}
                                            onSelect={() => selectSession(session.id)}
                                            onCheck={() => toggleSessionSelection(session.id)}
                                            isDark={isDark}
                                            getStatusColor={getStatusColor}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Details */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                        {selectedSession ? (
                            <>
                                {/* Chart Panel */}
                                <div className={`${bgCard} rounded-xl border ${border} overflow-hidden`}>
                                    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                                            <span className="font-semibold">{selectedSession.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedSession.status)}`}>
                                                {selectedSession.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedSession.symbols.map(s => (
                                                <span key={s} className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-[350px] bg-[#10141e]">
                                        <ChartPanel
                                            initialTicks={chartTicks}
                                            currentTick={null}
                                            tradeMarkers={[]}
                                            signalMarkers={[]}
                                            height={350}
                                        />
                                    </div>
                                </div>

                                {/* Controls & Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Session Controls */}
                                    <div className={`${bgCard} rounded-xl border ${border} p-4`}>
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-400" />
                                            Session Controls
                                        </h3>

                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {selectedSession.status === 'running' ? (
                                                <>
                                                    <button
                                                        onClick={() => pauseSession(selectedSession.id)}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all"
                                                    >
                                                        <Pause className="w-4 h-4" />
                                                        Pause
                                                    </button>
                                                    <button
                                                        onClick={() => stopSession(selectedSession.id)}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                                                    >
                                                        <Square className="w-4 h-4" />
                                                        Stop
                                                    </button>
                                                </>
                                            ) : selectedSession.status === 'paused' ? (
                                                <>
                                                    <button
                                                        onClick={() => resumeSession(selectedSession.id)}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                        Resume
                                                    </button>
                                                    <button
                                                        onClick={() => stopSession(selectedSession.id)}
                                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                                                    >
                                                        <Square className="w-4 h-4" />
                                                        Stop
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => startSession(selectedSession.id)}
                                                    className="col-span-3 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
                                                >
                                                    <Play className="w-4 h-4" />
                                                    Start Session
                                                </button>
                                            )}
                                        </div>

                                        {/* TP/SL Controls */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                                    <span className="text-sm">Take Profit</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-emerald-400">${selectedSession.tp}</span>
                                                    {selectedSession.pnl > 0 && (
                                                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 transition-all"
                                                                style={{ width: `${Math.min((selectedSession.pnl / selectedSession.tp) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="w-4 h-4 text-red-400" />
                                                    <span className="text-sm">Stop Loss</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-red-400">-${selectedSession.sl}</span>
                                                    {selectedSession.pnl < 0 && (
                                                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-500 transition-all"
                                                                style={{ width: `${Math.min((Math.abs(selectedSession.pnl) / selectedSession.sl) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session Stats */}
                                    <div className={`${bgCard} rounded-xl border ${border} p-4`}>
                                        {/* System Health Module */}
                                        <div className="mb-6">
                                            <SessionHealthPanel session={selectedSession} isDark={isDark} />
                                        </div>

                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-purple-400" />
                                            Session Analytics
                                        </h3>

                                        <div className="grid grid-cols-2 gap-3">
                                            <MiniStat label="P/L" value={`${selectedSession.pnl >= 0 ? '+' : ''}$${selectedSession.pnl.toFixed(2)}`} color={selectedSession.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'} isDark={isDark} />
                                            <MiniStat label="Trades" value={selectedSession.trades.length.toString()} color="text-blue-400" isDark={isDark} />
                                            <MiniStat label="Win Rate" value={`${selectedSession.analytics.winRate.toFixed(1)}%`} color="text-cyan-400" isDark={isDark} />
                                            <MiniStat label="Wins/Losses" value={`${selectedSession.analytics.wins}/${selectedSession.analytics.losses}`} color="text-purple-400" isDark={isDark} />
                                            <MiniStat label="Exposure" value={`$${selectedSession.currentExposure.toFixed(2)}`} color="text-yellow-400" isDark={isDark} />
                                            <MiniStat label="Duration" value={formatDuration(selectedSession.duration)} color="text-slate-400" isDark={isDark} />
                                        </div>

                                        {/* Open Trades */}
                                        {selectedSession.openTrades.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <h4 className="text-sm font-medium text-slate-400 mb-2">Open Contracts</h4>
                                                <div className="space-y-2">
                                                    {selectedSession.openTrades.map(trade => (
                                                        <div key={trade.id} className={`p-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-100'} text-xs`}>
                                                            <div className="flex justify-between">
                                                                <span className="text-blue-400">{trade.type}</span>
                                                                <span className="text-slate-400">${trade.stake}</span>
                                                            </div>
                                                            <div className="flex justify-between mt-1">
                                                                <span className="text-slate-500">Entry: {trade.entryPrice}</span>
                                                                <span className="text-emerald-400">Payout: ${trade.potentialPayout.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Alerts Panel */}
                                <div className={`${bgCard} rounded-xl border ${border} p-4`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-orange-400" />
                                            Recent Activity
                                        </h3>
                                        {alerts.length > 0 && (
                                            <button
                                                onClick={clearAlerts}
                                                className="text-xs text-slate-400 hover:text-white"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {alerts.filter(a => !selectedSession || a.sessionId === selectedSession.id).slice(0, 20).map(alert => (
                                            <div
                                                key={alert.id}
                                                className={`p-3 rounded-lg border ${alert.type === 'profit' || alert.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                    alert.type === 'loss' || alert.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                                        alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                                            'bg-blue-500/10 border-blue-500/30'
                                                    } ${alert.acknowledged ? 'opacity-50' : ''}`}
                                                onClick={() => acknowledgeAlert(alert.id)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-sm font-medium">{alert.title}</span>
                                                        <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {alerts.length === 0 && (
                                            <div className="text-center py-8 text-slate-500">
                                                No recent activity
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={`${bgCard} rounded-xl border ${border} p-12 text-center`}>
                                <Activity className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} />
                                <h3 className="text-lg font-semibold mb-2">Select a Session</h3>
                                <p className={textMuted}>Choose a session from the list to view details and controls</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ThemeContext.Provider>
    );
}

// Helper Components
function StatCard({ icon, label, value, color, isDark }: { icon: React.ReactNode; label: string; value: string; color: string; isDark: boolean }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
            <div className={`${color}`}>{icon}</div>
            <div>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{label}</div>
                <div className={`font-mono font-bold ${color}`}>{value}</div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, color, isDark }: { label: string; value: string; color: string; isDark: boolean }) {
    return (
        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'} mb-1`}>{label}</div>
            <div className={`font-mono font-bold ${color}`}>{value}</div>
        </div>
    );
}

function SessionRow({
    session,
    selected,
    checked,
    onSelect,
    onCheck,
    isDark,
    getStatusColor
}: {
    session: ManagedSession;
    selected: boolean;
    checked: boolean;
    onSelect: () => void;
    onCheck: () => void;
    isDark: boolean;
    getStatusColor: (status: SessionStatus) => string;
}) {
    return (
        <div
            className={`p-3 border-b cursor-pointer transition-all ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-200 hover:bg-gray-50'
                } ${selected ? (isDark ? 'bg-slate-700/50' : 'bg-blue-50') : ''}`}
            onClick={onSelect}
        >
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                        e.stopPropagation();
                        onCheck();
                    }}
                    className="rounded border-slate-500"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{session.name}</span>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(session.status).split(' ')[0]}`} />
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'} flex items-center gap-2 mt-0.5`}>
                        <span>{session.symbols[0]}</span>
                        <span>•</span>
                        <span>{session.accountType}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`font-mono font-bold ${session.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {session.pnl >= 0 ? '+' : ''}${session.pnl.toFixed(2)}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {session.trades.length} trades
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
}

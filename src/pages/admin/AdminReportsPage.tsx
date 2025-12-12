/**
 * Admin Reports Page
 * Trading performance reports and analytics
 */

import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign, Activity, Users, BarChart3 } from 'lucide-react';
import { tradingApi } from '../../trading/tradingApi';
import toast from 'react-hot-toast';

interface ReportStats {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    totalLoss: number;
    netPnL: number;
    avgTradeSize: number;
    totalSessions: number;
    activeUsers: number;
}

interface SessionReport {
    id: string;
    name: string;
    status: string;
    mode: string;
    totalTrades: number;
    wins: number;
    losses: number;
    netPnL: number;
    createdAt: string;
}

export default function AdminReportsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ReportStats>({
        totalTrades: 0,
        winRate: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnL: 0,
        avgTradeSize: 0,
        totalSessions: 0,
        activeUsers: 0
    });
    const [sessions, setSessions] = useState<SessionReport[]>([]);
    const [dateRange, setDateRange] = useState('7d');

    useEffect(() => {
        fetchReportData();
    }, [dateRange]);

    const fetchReportData = async () => {
        try {
            setLoading(true);

            // Fetch sessions
            const sessionsResponse = await tradingApi.getSessions();
            const sessionsData = Array.isArray(sessionsResponse)
                ? sessionsResponse
                : (sessionsResponse.data || sessionsResponse.sessions || []);

            // Calculate aggregate stats from sessions
            let totalTrades = 0;
            let totalWins = 0;
            let totalLosses = 0;
            let totalProfit = 0;
            let totalLoss = 0;

            const sessionReports = sessionsData.map((s: any) => {
                const wins = s.winning_trades || 0;
                const losses = s.losing_trades || 0;
                const trades = s.total_trades || (wins + losses);
                const pnl = s.net_pnl || 0;

                totalTrades += trades;
                totalWins += wins;
                totalLosses += losses;
                if (pnl > 0) totalProfit += pnl;
                else totalLoss += Math.abs(pnl);

                return {
                    id: s.id,
                    name: s.session_name || s.name || 'Unnamed Session',
                    status: s.status || 'unknown',
                    mode: s.mode || 'demo',
                    totalTrades: trades,
                    wins,
                    losses,
                    netPnL: pnl,
                    createdAt: s.created_at
                };
            });

            setSessions(sessionReports);
            setStats({
                totalTrades,
                winRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
                totalProfit,
                totalLoss,
                netPnL: totalProfit - totalLoss,
                avgTradeSize: totalTrades > 0 ? (totalProfit + totalLoss) / totalTrades : 0,
                totalSessions: sessionsData.length,
                activeUsers: 0 // Would need separate API call
            });

        } catch (error) {
            console.error('Failed to fetch report data:', error);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        // Generate CSV export
        const headers = ['Session Name', 'Status', 'Mode', 'Total Trades', 'Wins', 'Losses', 'Net P&L', 'Created'];
        const rows = sessions.map(s => [
            s.name,
            s.status,
            s.mode,
            s.totalTrades,
            s.wins,
            s.losses,
            s.netPnL.toFixed(2),
            new Date(s.createdAt).toLocaleDateString()
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <GlassCard className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
                        <p className="text-sm text-slate-400">Trading performance & analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>

                    <GlassButton
                        variant="primary"
                        onClick={exportReport}
                        icon={<Download size={18} />}
                    >
                        Export CSV
                    </GlassButton>
                </div>
            </GlassCard>

            {/* Stats Overview */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <GlassCard className="text-center">
                            <div className="p-2 bg-blue-500/10 rounded-full text-blue-400 w-fit mx-auto mb-3">
                                <Activity size={20} />
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.totalTrades}</div>
                            <div className="text-xs text-slate-500 uppercase">Total Trades</div>
                        </GlassCard>

                        <GlassCard className="text-center">
                            <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400 w-fit mx-auto mb-3">
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-slate-500 uppercase">Win Rate</div>
                        </GlassCard>

                        <GlassCard className="text-center">
                            <div className={`p-2 rounded-full w-fit mx-auto mb-3 ${stats.netPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                <DollarSign size={20} />
                            </div>
                            <div className={`text-2xl font-bold ${stats.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {stats.netPnL >= 0 ? '+' : ''}${stats.netPnL.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">Net P&L</div>
                        </GlassCard>

                        <GlassCard className="text-center">
                            <div className="p-2 bg-purple-500/10 rounded-full text-purple-400 w-fit mx-auto mb-3">
                                <BarChart3 size={20} />
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
                            <div className="text-xs text-slate-500 uppercase">Sessions</div>
                        </GlassCard>
                    </div>

                    {/* Profit/Loss Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GlassCard>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="text-emerald-400" size={20} />
                                <h3 className="text-lg font-bold text-white">Total Profit</h3>
                            </div>
                            <div className="text-3xl font-bold text-emerald-400">+${stats.totalProfit.toFixed(2)}</div>
                        </GlassCard>

                        <GlassCard>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingDown className="text-red-400" size={20} />
                                <h3 className="text-lg font-bold text-white">Total Loss</h3>
                            </div>
                            <div className="text-3xl font-bold text-red-400">-${stats.totalLoss.toFixed(2)}</div>
                        </GlassCard>
                    </div>

                    {/* Sessions Table */}
                    <GlassCard>
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="text-blue-400" size={20} />
                            <h3 className="text-lg font-bold text-white">Session History</h3>
                        </div>

                        {sessions.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <FileText size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No sessions found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Session</th>
                                            <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Mode</th>
                                            <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Trades</th>
                                            <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">W/L</th>
                                            <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">P&L</th>
                                            <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.map((session) => (
                                            <tr key={session.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-3 px-4">
                                                    <span className="text-white font-medium">{session.name}</span>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(session.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${session.mode === 'real'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {session.mode.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-300">{session.totalTrades}</td>
                                                <td className="py-3 px-4">
                                                    <span className="text-emerald-400">{session.wins}</span>
                                                    <span className="text-slate-500"> / </span>
                                                    <span className="text-red-400">{session.losses}</span>
                                                </td>
                                                <td className={`py-3 px-4 font-mono font-bold ${session.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {session.netPnL >= 0 ? '+' : ''}${session.netPnL.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${session.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            session.status === 'completed' ? 'bg-slate-500/20 text-slate-400' :
                                                                'bg-amber-500/20 text-amber-400'
                                                        }`}>
                                                        {session.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </GlassCard>
                </>
            )}
        </div>
    );
}

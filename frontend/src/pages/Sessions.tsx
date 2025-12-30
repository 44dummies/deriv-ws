import { useState } from 'react';
import { Play, Pause, Square, History, Filter, Trash2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';

// Mock Session Data
const mockSessions = [
    { id: 'sess_001', date: '2025-12-28', duration: '4h 12m', profit: 124.50, status: 'COMPLETED', type: 'Conservative' },
    { id: 'sess_002', date: '2025-12-29', duration: '1h 30m', profit: -45.20, status: 'STOPPED', type: 'Aggressive' },
    { id: 'sess_003', date: '2025-12-30', duration: '0h 45m', profit: 12.80, status: 'ACTIVE', type: 'Balanced' },
];

export default function Sessions() {
    const [filter, setFilter] = useState('ALL');
    const { isAdmin } = useAuthStore();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Sessions</h1>
                    <p className="text-gray-400">
                        {isAdmin ? 'Manage and control trading sessions.' : 'View active sessions and history.'}
                    </p>
                </div>
                {isAdmin && (
                    <button className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-105">
                        <Play className="w-5 h-5" />
                        <span className="font-bold">Create New Session</span>
                    </button>
                )}
            </div>

            {/* Active Session Card */}
            <div className="glass-panel p-8 rounded-3xl border-l-4 border-l-success relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-success/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                            </div>
                            <h2 className="text-2xl font-bold">Active Session</h2>
                        </div>
                        <p className="text-sm text-gray-400 font-mono flex items-center gap-2">
                            ID: <span className="text-white">sess_003</span> • Started 45m ago
                        </p>
                    </div>

                    {/* Controls - Only visible to ADMIN */}
                    {isAdmin ? (
                        <div className="flex gap-3">
                            <button className="p-3 bg-surface hover:bg-yellow-500/10 border border-white/5 hover:border-yellow-500/50 rounded-xl text-yellow-500 transition-all" title="Pause Session">
                                <Pause className="w-5 h-5" />
                            </button>
                            <button className="p-3 bg-surface hover:bg-red-500/10 border border-white/5 hover:border-red-500/50 rounded-xl text-red-500 transition-all" title="Terminate Session">
                                <Square className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Waiting for Admin signals
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    <div className="p-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Strategy</div>
                        <div className="font-bold text-lg">Balanced AI</div>
                    </div>
                    <div className="p-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">P&L (Live)</div>
                        <div className="font-bold text-lg text-success">+$12.80</div>
                    </div>
                    <div className="p-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trades</div>
                        <div className="font-bold text-lg">8 / 12</div>
                    </div>
                    <div className="p-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risk Score</div>
                        <div className="font-bold text-lg text-yellow-500">Low (2/10)</div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-lg flex items-center gap-3">
                        <History className="w-5 h-5 text-primary" />
                        Session History
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Filter className="w-4 h-4" />
                        <select
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 focus:border-primary outline-none text-white transition-colors"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="ALL">All Sessions</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="STOPPED">Stopped</option>
                        </select>
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-black/20 text-gray-500 font-mono uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-5 font-medium">Session ID</th>
                            <th className="p-5 font-medium">Date</th>
                            <th className="p-5 font-medium">Type</th>
                            <th className="p-5 font-medium">Duration</th>
                            <th className="p-5 font-medium">Profit/Loss</th>
                            <th className="p-5 font-medium">Status</th>
                            {isAdmin && <th className="p-5 font-medium text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {mockSessions.filter(s => filter === 'ALL' || s.status === filter).map((session) => (
                            <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 font-mono text-gray-300">{session.id}</td>
                                <td className="p-5 text-gray-400">{session.date}</td>
                                <td className="p-5">
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs">
                                        {session.type}
                                    </span>
                                </td>
                                <td className="p-5 text-gray-400">{session.duration}</td>
                                <td className={cn("p-5 font-bold tabular-nums", session.profit >= 0 ? "text-success" : "text-red-500")}>
                                    {session.profit >= 0 ? '+' : ''}${Math.abs(session.profit).toFixed(2)}
                                </td>
                                <td className="p-5">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase",
                                        session.status === 'COMPLETED' ? "bg-success/10 text-success border border-success/20" :
                                            session.status === 'ACTIVE' ? "bg-primary/10 text-primary border border-primary/20 animate-pulse" :
                                                "bg-red-500/10 text-red-500 border border-red-500/20"
                                    )}>
                                        {session.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td className="p-5 text-right">
                                        <button className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

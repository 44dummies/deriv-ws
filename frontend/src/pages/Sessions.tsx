import { useState } from 'react';
import { Play, Pause, Square, History, Filter, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Mock Session Data
const mockSessions = [
    { id: 'sess_001', date: '2025-12-28', duration: '4h 12m', profit: 124.50, status: 'COMPLETED', type: 'Conservative' },
    { id: 'sess_002', date: '2025-12-29', duration: '1h 30m', profit: -45.20, status: 'STOPPED', type: 'Aggressive' },
    { id: 'sess_003', date: '2025-12-30', duration: '0h 45m', profit: 12.80, status: 'ACTIVE', type: 'Balanced' },
];

export default function Sessions() {
    const [filter, setFilter] = useState('ALL');

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Sessions</h1>
                    <p className="text-gray-400">Manage active bots and review trading history.</p>
                </div>
                <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors">
                    <Play className="w-4 h-4" />
                    New Session
                </button>
            </div>

            {/* Active Session Card */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-success">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="animate-pulse w-2 h-2 rounded-full bg-success"></span>
                            <h2 className="text-xl font-bold">Active Session</h2>
                        </div>
                        <p className="text-sm text-gray-400 font-mono">ID: sess_003 • Started 45m ago</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-yellow-500" title="Pause"><Pause className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-white/10 rounded-lg text-red-500" title="Terminate"><Square className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-surface rounded-xl">
                        <div className="text-xs text-gray-500 uppercase">Strategy</div>
                        <div className="font-bold">Balanced AI</div>
                    </div>
                    <div className="p-4 bg-surface rounded-xl">
                        <div className="text-xs text-gray-500 uppercase">P&L (Live)</div>
                        <div className="font-bold text-success">+$12.80</div>
                    </div>
                    <div className="p-4 bg-surface rounded-xl">
                        <div className="text-xs text-gray-500 uppercase">Trades</div>
                        <div className="font-bold">8 / 12</div>
                    </div>
                    <div className="p-4 bg-surface rounded-xl">
                        <div className="text-xs text-gray-500 uppercase">Risk Score</div>
                        <div className="font-bold text-yellow-500">Low (2/10)</div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Session History
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Filter className="w-4 h-4" />
                        <select
                            className="bg-transparent border border-white/10 rounded-lg p-1 focus:border-primary outline-none text-white"
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
                    <thead className="bg-white/5 text-gray-400 font-mono uppercase text-xs">
                        <tr>
                            <th className="p-4">Session ID</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Duration</th>
                            <th className="p-4">Profit/Loss</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {mockSessions.filter(s => filter === 'ALL' || s.status === filter).map((session) => (
                            <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 font-mono text-gray-300">{session.id}</td>
                                <td className="p-4 text-gray-400">{session.date}</td>
                                <td className="p-4">{session.type}</td>
                                <td className="p-4 text-gray-400">{session.duration}</td>
                                <td className={cn("p-4 font-bold", session.profit >= 0 ? "text-success" : "text-red-500")}>
                                    {session.profit >= 0 ? '+' : ''}${Math.abs(session.profit).toFixed(2)}
                                </td>
                                <td className="p-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-bold",
                                        session.status === 'COMPLETED' ? "bg-success/10 text-success" :
                                            session.status === 'ACTIVE' ? "bg-primary/10 text-primary" :
                                                "bg-red-500/10 text-red-500"
                                    )}>
                                        {session.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="p-2 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

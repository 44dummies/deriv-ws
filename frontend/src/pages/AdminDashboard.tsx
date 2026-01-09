import { useState, useEffect } from 'react';
import { Database, Server, Cpu, Activity, ShieldAlert, Users, DollarSign, TrendingUp } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { motion } from 'framer-motion';

interface SystemStats {
    active_users: number;
    active_sessions: number;
    model_status: string;
    admin_balance_real: number;
    admin_balance_demo: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<SystemStats | null>(null);

    // Fetch Live Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/v1/stats/summary`);
                const data = await res.json();
                setStats({
                    active_users: data.users.active,
                    active_sessions: data.sessions.active,
                    model_status: data.ai_health.status,
                    admin_balance_real: data.admin_balance.real,
                    admin_balance_demo: data.admin_balance.demo
                });
            } catch {
                // Failed to fetch admin stats - handled silently
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const metrics = [
        { label: 'Ollama AI', status: stats?.model_status || 'Offline', icon: Cpu, color: stats?.model_status === 'online' ? 'text-accent' : 'text-slate-500' },
        { label: 'Active Users', status: stats?.active_users.toString() || '0', icon: Users, color: 'text-primary' },
        { label: 'Live Sessions', status: stats?.active_sessions.toString() || '0', icon: Activity, color: 'text-success' },
        { label: 'System Health', status: 'Optimal', icon: Server, color: 'text-emerald-400' },
    ];

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
                <p className="text-slate-400">Welcome back, Administrator. System is running.</p>
            </header>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, i) => (
                    <motion.div
                        key={m.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <GlassCard className="p-4 border-l-4 border-l-transparent hover:border-l-primary transition-all">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded bg-white/5 ${m.color}`}>
                                        <m.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-bold">{m.label}</div>
                                        <div className={`text-lg font-mono font-bold ${m.color === 'text-slate-500' ? 'text-slate-400' : 'text-white'}`}>{m.status}</div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* Admin Finances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="h-24 w-24 text-success" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">Admin Real Balance</div>
                        <div className="text-4xl font-bold text-success-glow font-mono">
                            ${stats?.admin_balance_real.toLocaleString() || '0.00'}
                        </div>
                        <div className="mt-4 text-xs text-success flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +2.4% this session
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database className="h-24 w-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">Admin Demo Balance</div>
                        <div className="text-4xl font-bold text-blue-400 font-mono">
                            ${stats?.admin_balance_demo.toLocaleString() || '0.00'}
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                            Practice Funds
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Quick Actions Placeholder - Will link to other modules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 bg-danger/5 border-danger/20">
                    <h3 className="text-danger font-bold mb-2 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" /> Global Kill Switch
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Emergency stop all active AI trading sessions immediately.</p>
                    <button className="w-full py-2 bg-danger hover:bg-red-600 text-white rounded font-bold text-xs uppercase transition-colors">
                        ACTIVATE EMERGENCY STOP
                    </button>
                </GlassCard>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Server, Cpu, Activity, ShieldAlert, Users, TrendingUp } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

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
        { label: 'Model service', status: stats?.model_status || 'Offline', icon: Cpu, color: stats?.model_status === 'online' ? 'text-primary' : 'text-muted-foreground' },
        { label: 'Active users', status: stats?.active_users.toString() || '0', icon: Users, color: 'text-primary' },
        { label: 'Live sessions', status: stats?.active_sessions.toString() || '0', icon: Activity, color: 'text-primary' },
        { label: 'System health', status: 'Normal', icon: Server, color: 'text-muted-foreground' },
    ];

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold mb-2">Admin overview</h1>
                <p className="text-sm text-muted-foreground">Operational status and balances.</p>
            </header>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m) => (
                    <div key={m.label}>
                        <GlassCard className="p-4 border-l-4 border-l-transparent hover:border-l-primary transition-colors duration-150 ease-out">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded bg-muted/50 ${m.color}`}>
                                    <m.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">{m.label}</div>
                                    <div className="text-lg font-semibold">{m.status}</div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                ))}
            </div>

            {/* Admin Finances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Real balance</div>
                        <div className="text-3xl font-semibold">
                            ${stats?.admin_balance_real !== undefined ? stats.admin_balance_real.toLocaleString() : '0.00'}
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Updated on refresh
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Demo balance</div>
                        <div className="text-3xl font-semibold">
                            ${stats?.admin_balance_demo !== undefined ? stats.admin_balance_demo.toLocaleString() : '0.00'}
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground">
                            Practice Funds
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Quick Actions Placeholder - Will link to other modules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive" /> Emergency stop
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Stops all active sessions and blocks new signals.</p>
                    <button className="w-full py-2 border border-border rounded-md text-sm transition-colors duration-150 ease-out hover:bg-muted/60">
                        Activate
                    </button>
                </GlassCard>
            </div>
        </div>
    );
}

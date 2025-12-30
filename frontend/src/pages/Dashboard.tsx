import { useAuthStore } from '../stores/useAuthStore';
import { SessionList } from '../components/sessions/SessionList';
import { LayoutDashboard, LogOut, Wallet, TrendingUp, Activity, User } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { user, signOut } = useAuthStore();

    // Real Deriv Data
    const account = user?.deriv_account;
    const isVirtual = account?.is_virtual === 1 || account?.is_virtual === true;
    const balance = account?.balance ? parseFloat(account.balance.toString()).toLocaleString('en-US', { style: 'currency', currency: account.currency || 'USD' }) : '$0.00';

    const stats = [
        {
            label: 'Total Equity',
            value: balance,
            icon: Wallet,
            color: 'text-primary-glow',
            sub: isVirtual ? 'DEMO ACCOUNT' : 'REAL ACCOUNT'
        },
        {
            label: 'Daily PnL',
            value: '$0.00', // Placeholder until we hook up trade history
            icon: TrendingUp,
            color: 'text-success-glow',
            sub: 'No trades today'
        },
        {
            label: 'Active Sessions',
            value: '0', // Will be updated by session store
            icon: Activity,
            color: 'text-accent-glow',
            sub: 'Waiting for signals'
        },
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-primary/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 bg-mesh-animate opacity-20 pointer-events-none" />
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/70 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                            <LayoutDashboard className="h-6 w-6 text-primary-glow" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white text-glow">
                            TraderMind <span className="text-primary-glow font-light">Pro</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <div className="text-xs text-slate-500 font-mono">ACCOUNT</div>
                            <div className="text-sm text-slate-200 font-medium">{user?.email}</div>
                        </div>

                        <GlassCard
                            hoverEffect
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border-white/5"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-5 w-5 text-slate-400 hover:text-danger-glow transition-colors" />
                        </GlassCard>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-12">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <GlassCard hoverEffect className="relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <stat.icon className="w-24 h-24" />
                                </div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                                        <h3 className={`text-3xl font-bold font-mono ${stat.color} text-glow`}>
                                            {stat.value}
                                        </h3>
                                        {stat.sub && (
                                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600 mt-1">
                                                {stat.sub}
                                            </p>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-xl bg-white/5 ring-1 ring-white/10 ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Feed: Active Sessions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Activity className="w-6 h-6 text-primary" />
                                Live Markets
                            </h2>
                            <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-mono border border-success/20 animate-pulse">
                                SYSTEM ONLINE
                            </span>
                        </div>

                        <div className="min-h-[400px]">
                            {/* Session List Component - Assuming it renders cards, might need styling updates separately */}
                            <SessionList />
                        </div>
                    </div>

                    {/* Side Panel: Profile/Quick Actions */}
                    <div className="space-y-6">
                        <GlassCard className="p-0 overflow-hidden">
                            <div className="p-6 bg-gradient-to-br from-primary/20 to-purple-900/20 border-b border-white/5">
                                <h3 className="text-lg font-bold text-white">Trader Profile</h3>
                                <p className="text-slate-400 text-sm">Level 2 Account</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                        <User className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400">Reputation</div>
                                        <div className="text-white font-mono">98.5%</div>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full w-[70%] bg-gradient-to-r from-primary to-accent" />
                                </div>
                                <div className="text-xs text-center text-slate-500 mt-2">
                                    Risk Limit: $5,000 / day
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </main>
        </div>
    );
}

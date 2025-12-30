import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { SessionList } from '../components/sessions/SessionList';
import { CreateSessionModal } from '../components/admin/CreateSessionModal';
import { useUpdateSessionStatus } from '../hooks/useSessions';
import { LayoutDashboard, LogOut, Plus, Database, Server, Cpu, Activity, ShieldAlert } from 'lucide-react';
import { SessionStatus } from '../types/session';
import { GlassCard } from '../components/ui/GlassCard';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const { user, signOut } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { mutate: updateStatus } = useUpdateSessionStatus();

    const handleAction = (sessionId: string, action: 'resume' | 'pause' | 'stop') => {
        let status: SessionStatus;
        switch (action) {
            case 'resume': status = 'ACTIVE'; break;
            case 'pause': status = 'PAUSED'; break;
            case 'stop': status = 'TERMINATED'; break;
        }
        updateStatus({ id: sessionId, status });
    };

    // Fake System Metrics
    const metrics = [
        { label: 'API Gateway', status: 'Online', latency: '24ms', icon: Server, color: 'text-success-glow' },
        { label: 'Quant Engine', status: 'Processing', latency: '1.2s', icon: Cpu, color: 'text-accent-glow' },
        { label: 'Supabase DB', status: 'Connected', latency: '45ms', icon: Database, color: 'text-primary-glow' },
        { label: 'Risk Guard', status: 'Active', latency: '-', icon: ShieldAlert, color: 'text-danger-glow' },
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-danger/30">
            {/* Grid Background */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-red-900/20 bg-[#030712]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-danger/10 border border-danger/20 animate-pulse-slow">
                            <LayoutDashboard className="h-5 w-5 text-danger-glow" />
                        </div>
                        <span className="font-bold text-lg tracking-wider text-danger-glow uppercase">
                            Administrator <span className="text-slate-500 text-xs normal-case tracking-normal">| Command Center</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-slate-500 uppercase">
                            User: <span className="text-slate-300">{user?.email}</span>
                        </span>
                        <button
                            onClick={() => signOut()}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* System Diagnostics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {metrics.map((m, i) => (
                        <motion.div
                            key={m.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <GlassCard className="p-4 border-l-4 border-l-transparent hover:border-l-primary transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded bg-white/5 ${m.color}`}>
                                            <m.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase font-bold">{m.label}</div>
                                            <div className={`text-sm font-mono ${m.color}`}>{m.status}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-slate-600">{m.latency}</div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                {/* Session Control */}
                <div className="flex items-end justify-between border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Activity className="h-6 w-6 text-danger" />
                            Session Control
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Manage active trading pools and risk parameters</p>
                    </div>
                    <GlassCard
                        hoverEffect
                        className="px-4 py-2 bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20 text-blue-400 cursor-pointer flex items-center gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        <span className="font-bold text-sm">Initialize Session</span>
                    </GlassCard>
                </div>

                <div className="bg-black/20 rounded-xl border border-white/5 p-1">
                    <SessionList isAdmin onAction={handleAction} />
                </div>

                {/* Terminal / Logs Placeholder */}
                <GlassCard className="font-mono text-xs p-4 bg-black/40 border-white/5">
                    <div className="text-slate-500 mb-2 border-b border-white/5 pb-2">SYSTEM LOGS (LIVE STREAM)</div>
                    <div className="space-y-1 h-32 overflow-hidden text-slate-400">
                        <div className="flex gap-2"><span className="text-slate-600">[10:42:01]</span> <span className="text-primary">INFO</span> System initialized successfully.</div>
                        <div className="flex gap-2"><span className="text-slate-600">[10:42:05]</span> <span className="text-success">CONNECT</span> Connected to Deriv WebSocket API (ID: 1089).</div>
                        <div className="flex gap-2"><span className="text-slate-600">[10:42:06]</span> <span className="text-accent">AI-LAYER</span> Model #422 loaded (XGBoost). Confidence threshold: 0.85.</div>
                        <div className="flex gap-2"><span className="text-slate-600">[10:45:12]</span> <span className="text-primary">SESSION</span> New session #sess-001 created by ADMIN.</div>
                    </div>
                </GlassCard>
            </main>

            {isModalOpen && <CreateSessionModal onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

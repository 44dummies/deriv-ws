import { useState } from 'react';
import { SessionList } from '../../components/sessions/SessionList';
import { CreateSessionModal } from '../../components/admin/CreateSessionModal';
import { useUpdateSessionStatus } from '../../hooks/useSessions';
import { Activity, Plus, ShieldAlert } from 'lucide-react';
import { SessionStatus } from '../../types/session';
import { GlassCard } from '../../components/ui/GlassCard';

export default function AdminSessions() {
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

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="h-6 w-6 text-danger" />
                        Session Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Create, pause, or terminate trading pools.</p>
                </div>
                <GlassCard
                    hoverEffect
                    className="px-4 py-2 bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20 text-blue-400 cursor-pointer flex items-center gap-2"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    <span className="font-bold text-sm">New Session</span>
                </GlassCard>
            </div>

            <div className="bg-black/20 rounded-xl border border-white/5 p-1">
                <SessionList isAdmin onAction={handleAction} />
            </div>

            {/* Quick Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3 text-warning" />
                    sessions automatically pause if AI confidence drops below 60%.
                </p>
                <p>
                    Terminating a session will finalize all pending P&L updates.
                </p>
            </div>

            {isModalOpen && <CreateSessionModal onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

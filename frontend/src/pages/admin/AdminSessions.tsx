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
            <div className="flex items-end justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Session Management
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Create, pause, or stop sessions.</p>
                </div>
                <GlassCard
                    hoverEffect
                    className="px-4 py-2 border border-border bg-muted/40 text-foreground cursor-pointer flex items-center gap-2"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium text-sm">New session</span>
                </GlassCard>
            </div>

            <div className="bg-card rounded-lg border border-border p-1">
                <SessionList isAdmin onAction={handleAction} />
            </div>

            {/* Quick Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                    Sessions pause if confidence drops below the threshold.
                </p>
                <p>
                    Terminating a session will finalize all pending P&L updates.
                </p>
            </div>

            {isModalOpen && <CreateSessionModal onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

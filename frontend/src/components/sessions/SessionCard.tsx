import { Session } from '../../types/session';
import { cn } from '../../lib/utils';
import { Calendar, Users, Activity, Play, Pause, Square } from 'lucide-react';

interface SessionCardProps {
    session: Session;
    isAdmin?: boolean;
    onAction?: ((action: 'resume' | 'pause' | 'stop') => void) | undefined;
}

const statusColors = {
    CREATED: 'bg-muted/50 text-muted-foreground border-border',
    PENDING: 'bg-muted/50 text-muted-foreground border-border',
    ACTIVE: 'bg-primary/10 text-primary border-primary/20',
    RUNNING: 'bg-primary/10 text-primary border-primary/20',
    PAUSED: 'bg-muted/50 text-muted-foreground border-border',
    COMPLETED: 'bg-muted/50 text-muted-foreground border-border',
    TERMINATED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function SessionCard({ session, isAdmin, onAction }: SessionCardProps) {
    const startDate = (session as any).startTime || (session as any).created_at || (session as any).started_at;
    const startLabel = startDate ? new Date(startDate).toLocaleDateString() : '—';
    const participants = Array.isArray((session as any).participants)
        ? (session as any).participants
        : Object.keys((session as any).participants || {});
    const pnl = Number((session as any).pnl || 0);

    return (
        <div className="bg-card border border-border rounded-md p-6 hover:border-primary/30 transition-colors duration-150 ease-out group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", statusColors[session.status])}>
                        {session.status}
                    </span>
                    <div className="flex items-center gap-3 mt-3">
                        <h3 className="text-lg font-semibold text-foreground">Session #{session.id.slice(0, 8)}</h3>
                        <a
                            href={`/user/live-session/${session.id}`}
                            className="px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors"
                        >
                            Enter Room
                        </a>
                    </div>
                </div>
                {isAdmin && session.status !== 'TERMINATED' && (
                    <div className="flex gap-2">
                        {session.status === 'ACTIVE' && (
                            <button
                                onClick={() => onAction?.('pause')}
                                className="p-2 hover:bg-muted/50 rounded-md text-muted-foreground transition-colors"
                            >
                                <Pause className="h-4 w-4" />
                            </button>
                        )}
                        {(session.status === 'PAUSED' || session.status === 'CREATED') && (
                            <button
                                onClick={() => onAction?.('resume')}
                                className="p-2 hover:bg-muted/50 rounded-md text-emerald-600 transition-colors"
                            >
                                <Play className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={() => onAction?.('stop')}
                            className="p-2 hover:bg-muted/50 rounded-md text-destructive transition-colors"
                        >
                            <Square className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{startLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{participants.length} Participants</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                    <Activity className="h-4 w-4" />
                    <span className={cn(
                        "font-mono",
                        pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                        PnL: {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

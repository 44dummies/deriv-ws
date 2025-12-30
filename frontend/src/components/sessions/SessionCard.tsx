import { Session } from '../../types/session';
import { cn } from '../../lib/utils';
import { Calendar, Users, Activity, Play, Pause, Square } from 'lucide-react';

interface SessionCardProps {
    session: Session;
    isAdmin?: boolean;
    onAction?: ((action: 'resume' | 'pause' | 'stop') => void) | undefined;
}

const statusColors = {
    CREATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
    PAUSED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    TERMINATED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function SessionCard({ session, isAdmin, onAction }: SessionCardProps) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", statusColors[session.status])}>
                        {session.status}
                    </span>
                    <h3 className="text-lg font-semibold text-white mt-3">Session #{session.id.slice(0, 8)}</h3>
                </div>
                {isAdmin && session.status !== 'TERMINATED' && (
                    <div className="flex gap-2">
                        {session.status === 'ACTIVE' && (
                            <button
                                onClick={() => onAction?.('pause')}
                                className="p-2 hover:bg-white/10 rounded-lg text-yellow-400 transition-colors"
                            >
                                <Pause className="h-4 w-4" />
                            </button>
                        )}
                        {(session.status === 'PAUSED' || session.status === 'CREATED') && (
                            <button
                                onClick={() => onAction?.('resume')}
                                className="p-2 hover:bg-white/10 rounded-lg text-green-400 transition-colors"
                            >
                                <Play className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={() => onAction?.('stop')}
                            className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                        >
                            <Square className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(session.startTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{session.participants.length} Participants</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                    <Activity className="h-4 w-4" />
                    <span className={cn(
                        "font-mono",
                        session.pnl > 0 ? "text-green-400" : session.pnl < 0 ? "text-red-400" : "text-gray-400"
                    )}>
                        PnL: {session.pnl > 0 ? '+' : ''}{session.pnl.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

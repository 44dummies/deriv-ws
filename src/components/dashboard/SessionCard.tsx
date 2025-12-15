import React from 'react';
import { GlassCard } from '../ui/glass/GlassCard';
import { Play, Pause, Square, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { ManagedSession } from '../../types/session';

interface SessionCardProps {
    session: any; // Using any temporarily for rapid protoptyping, ideally ManagedSession
    onJoin?: (id: string) => void;
    onLeave?: (id: string) => void;
    isActive?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onJoin, onLeave, isActive }) => {
    if (!session) return null;

    return (
        <GlassCard className="relative group overflow-hidden" variant={isActive ? 'active' : 'default'}>
            {isActive && (
                <div className="absolute top-0 right-0 p-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-liquid-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-liquid-accent"></span>
                    </span>
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{session.name || 'Unnamed Session'}</h3>
                    <div className="flex items-center gap-2 text-xs text-liquid-text-muted">
                        <Clock size={12} />
                        <span>{session.duration ? `${Math.floor(session.duration / 60)} min` : 'Live'}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                        <span className={session.type === 'Real' ? 'text-liquid-warning' : 'text-liquid-success'}>
                            {session.type || 'Demo'}
                        </span>
                    </div>
                </div>

                <div className={`
                p-2 rounded-xl flex items-center justify-center
                ${session.pnl >= 0 ? 'bg-liquid-success/10 text-liquid-success' : 'bg-liquid-warning/10 text-liquid-warning'}
            `}>
                    {session.pnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-xs text-liquid-text-muted mb-1">P&L</p>
                    <p className={`text-lg font-mono font-bold ${session.pnl >= 0 ? 'text-liquid-success' : 'text-liquid-warning'}`}>
                        {session.pnl >= 0 ? '+' : ''}{session.pnl?.toFixed(2) || '0.00'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-liquid-text-muted mb-1">Trades</p>
                    <p className="text-lg font-mono font-bold text-white">{session.trades?.length || 0}</p>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={() => isActive ? onLeave?.(session.id) : onJoin?.(session.id)}
                className={`
                w-full py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2
                ${isActive
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
                        : 'bg-liquid-accent text-black hover:shadow-[0_0_20px_rgba(0,209,255,0.4)] hover:scale-[1.02]'
                    }
            `}
            >
                {isActive ? (
                    <>
                        <LogOut size={18} /> Leave Session
                    </>
                ) : (
                    <>
                        <Play size={18} /> Join Session
                    </>
                )}
            </button>
        </GlassCard>
    );
};

// Icon helper
const LogOut = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);

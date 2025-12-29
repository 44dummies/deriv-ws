import { useSessions } from '../../hooks/useSessions';
import { SessionCard } from './SessionCard';
import { Loader2 } from 'lucide-react';

interface SessionListProps {
    isAdmin?: boolean;
    onAction?: (sessionId: string, action: 'resume' | 'pause' | 'stop') => void;
}

export function SessionList({ isAdmin, onAction }: SessionListProps) {
    const { data: sessions, isLoading, error } = useSessions();

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-12 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400">Failed to load sessions</p>
            </div>
        );
    }

    if (!sessions?.length) {
        return (
            <div className="text-center p-12 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-gray-400">No active sessions found</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
                <SessionCard
                    key={session.id}
                    session={session}
                    isAdmin={isAdmin ?? false}
                    onAction={onAction ? (action) => onAction(session.id, action) : undefined}
                />
            ))}
        </div>
    );
}

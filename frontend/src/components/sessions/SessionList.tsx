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
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-12 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive">Failed to load sessions</p>
            </div>
        );
    }

    if (!sessions?.length) {
        return (
            <div className="text-center p-12 bg-muted/40 border border-border rounded-md">
                <p className="text-muted-foreground">No active sessions found</p>
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

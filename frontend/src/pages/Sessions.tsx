import { useState } from 'react';
import { Play, Pause, Square, History, Filter, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fetchWithAuth } from '../lib/api';

export default function Sessions() {
    const [filter, setFilter] = useState('ALL');
    const { isAdmin, user } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch Sessions
    const { data: sessionData, isLoading } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            return fetchWithAuth('/sessions');
        },
        refetchInterval: 5000
    });

    const sessions = sessionData?.sessions || [];
    const activeSession = sessions.find((s: any) => s.status === 'ACTIVE' || s.status === 'RUNNING');
    const getParticipantCount = (session: any) => Array.isArray(session?.participants)
        ? session.participants.length
        : Object.keys(session?.participants || {}).length;
    const isParticipant = activeSession
        ? Array.isArray(activeSession.participants)
            ? activeSession.participants.some((p: any) => p.user_id === user?.id)
            : Boolean(activeSession.participants?.[user?.id || ''])
        : false;

    // Mutations
    const mutationFn = async ({ path, method = 'POST', body }: { path: string, method?: string, body?: any }) => {
        return fetchWithAuth(`/sessions/${path}`, {
            method,
            body: body ? JSON.stringify(body) : null
        });
    };

    const createSession = useMutation({
        mutationFn: () => mutationFn({ path: '', body: { config: { risk_profile: 'MEDIUM' } } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
    });

    const controlSession = useMutation({
        mutationFn: ({ id, action }: { id: string, action: 'start' | 'pause' | 'stop' }) =>
            mutationFn({ path: `${id}/${action}` }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
    });

    const joinSession = useMutation({
        mutationFn: (id: string) => mutationFn({ path: `${id}/join` }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
    });

    const deleteSession = useMutation({
        mutationFn: (id: string) => mutationFn({ path: `${id}`, method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
    });

    if (isLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold mb-2">Sessions</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage and control your trading sessions.
                    </p>
                </div>
                <button
                    onClick={() => createSession.mutate()}
                    disabled={createSession.isPending}
                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-2 transition-colors duration-150 ease-out disabled:opacity-60"
                >
                    {createSession.isPending ? <Loader2 className="animate-spin" /> : <Play className="w-5 h-5" />}
                    <span className="font-medium">Create session</span>
                </button>
            </div>

            {/* Active Session Card */}
            {activeSession ? (
                <div className="p-6 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="relative">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                </div>
                                <h2 className="text-lg font-semibold">Active session</h2>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                                ID: <span className="text-foreground">{activeSession.id}</span> •
                                Started {activeSession.started_at ? formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: true }) : 'Just now'}
                            </p>
                        </div>

                        {/* Controls - Show if admin OR if user owns the session */}
                        {(isAdmin || activeSession.admin_id === user?.id) ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'pause' })}
                                    className="p-2 border border-border rounded-md text-foreground hover:bg-muted/60 transition-colors duration-150 ease-out"
                                    title="Pause Session"
                                >
                                    <Pause className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'stop' })}
                                    className="p-2 border border-border rounded-md text-destructive hover:bg-muted/60 transition-colors duration-150 ease-out"
                                    title="Stop Session"
                                >
                                    <Square className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            !isParticipant ? (
                                <button
                                    onClick={() => joinSession.mutate(activeSession.id)}
                                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors duration-150 ease-out"
                                >
                                    Join Session
                                </button>
                            ) : (
                                <div className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm text-foreground flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" />
                                    Active Participant
                                </div>
                            )
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted/40 rounded-md border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Strategy</div>
                            <div className="font-medium text-sm">{activeSession.config_json?.risk_profile || 'Standard'}</div>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-md border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Participants</div>
                            <div className="font-medium text-sm">{getParticipantCount(activeSession)}</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-10 text-center border border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">No active sessions. {isAdmin ? 'Start one now.' : 'Wait for an admin to start one.'}</p>
                </div>
            )}

            {/* History Table */}
            <div className="rounded-lg overflow-hidden border border-border bg-card">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-medium text-sm flex items-center gap-3">
                        <History className="w-5 h-5 text-primary" />
                        Session History
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        <select
                            className="bg-background border border-border rounded-md px-3 py-1.5 focus:border-primary outline-none text-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="ALL">All Sessions</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-5 font-medium">Session ID</th>
                            <th className="p-5 font-medium">Date</th>
                            <th className="p-5 font-medium">Type</th>
                            <th className="p-5 font-medium">Participants</th>
                            <th className="p-5 font-medium">Status</th>
                            {isAdmin && <th className="p-5 font-medium text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sessions.filter((s: any) => filter === 'ALL' || s.status === filter).map((session: any) => (
                            <tr key={session.id} className="hover:bg-muted/40 transition-colors group">
                                <td className="p-5 font-mono text-foreground">{session.id}</td>
                                <td className="p-5 text-muted-foreground">{new Date(session.created_at).toLocaleDateString()}</td>
                                <td className="p-5">
                                    <span className="px-3 py-1 rounded-full bg-muted/50 border border-border text-xs">
                                        {session.config_json?.risk_profile || 'Standard'}
                                    </span>
                                </td>
                                <td className="p-5 text-muted-foreground font-mono">{getParticipantCount(session)}</td>
                                <td className="p-5">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
                                        session.status === 'COMPLETED' ? "bg-muted/40 text-muted-foreground border-border" :
                                            session.status === 'ACTIVE' || session.status === 'RUNNING' ? "bg-primary/10 text-primary border-primary/20" :
                                                "bg-muted/40 text-muted-foreground border-border"
                                    )}>
                                        {session.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td className="p-5 text-right">
                                        <button
                                            onClick={() => deleteSession.mutate(session.id)}
                                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

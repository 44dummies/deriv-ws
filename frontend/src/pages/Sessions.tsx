import { useState } from 'react';
import { Play, Pause, Square, History, Filter, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

// Constants
const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

export default function Sessions() {
    const [filter, setFilter] = useState('ALL');
    const { isAdmin, user } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch Sessions
    const { data: sessionData, isLoading } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v1/sessions`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch sessions');
            return res.json();
        },
        refetchInterval: 5000
    });

    const sessions = sessionData?.sessions || [];
    const activeSession = sessions.find((s: any) => s.status === 'ACTIVE' || s.status === 'RUNNING');

    // Mutations
    const mutationFn = async ({ path, method = 'POST', body }: { path: string, method?: string, body?: any }) => {
        const res = await fetch(`${API_URL}/api/v1/sessions/${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: body ? JSON.stringify(body) : null
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Action failed');
        }
        return res.json();
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
                    <h1 className="text-3xl font-bold mb-2">Sessions</h1>
                    <p className="text-gray-400">
                        Manage and control your trading sessions.
                    </p>
                </div>
                <button
                    onClick={() => createSession.mutate()}
                    disabled={createSession.isPending}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-105 disabled:opacity-50"
                >
                    {createSession.isPending ? <Loader2 className="animate-spin" /> : <Play className="w-5 h-5" />}
                    <span className="font-bold">Create New Session</span>
                </button>
            </div>

            {/* Active Session Card */}
            {activeSession ? (
                <div className="glass-panel p-8 rounded-3xl border-l-4 border-l-success relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-success/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                                </div>
                                <h2 className="text-2xl font-bold">Active Session</h2>
                            </div>
                            <p className="text-sm text-gray-400 font-mono flex items-center gap-2">
                                ID: <span className="text-white">{activeSession.id}</span> •
                                Started {activeSession.started_at ? formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: true }) : 'Just now'}
                            </p>
                        </div>

                        {/* Controls - Show if admin OR if user owns the session */}
                        {(isAdmin || activeSession.admin_id === user?.id) ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'pause' })}
                                    className="p-3 bg-surface hover:bg-yellow-500/10 border border-white/5 hover:border-yellow-500/50 rounded-xl text-yellow-500 transition-all"
                                    title="Pause Session"
                                >
                                    <Pause className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'stop' })}
                                    className="p-3 bg-surface hover:bg-red-500/10 border border-white/5 hover:border-red-500/50 rounded-xl text-red-500 transition-all"
                                    title="Stop Session"
                                >
                                    <Square className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            !activeSession.participants?.[user?.id || ''] ? (
                                <button
                                    onClick={() => joinSession.mutate(activeSession.id)}
                                    className="px-6 py-2 bg-success text-white font-bold rounded-lg hover:bg-success/90 transition-all"
                                >
                                    Join Session
                                </button>
                            ) : (
                                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-success flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" />
                                    Active Participant
                                </div>
                            )
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                        <div className="p-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Strategy</div>
                            <div className="font-bold text-lg">{activeSession.config_json?.risk_profile || 'Standard'} AI</div>
                        </div>
                        <div className="p-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Participants</div>
                            <div className="font-bold text-lg">{Object.keys(activeSession.participants || {}).length}</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                    <p className="text-gray-500">No active sessions. {isAdmin ? 'Start one now!' : 'Wait for an admin to start one.'}</p>
                </div>
            )}

            {/* History Table */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-lg flex items-center gap-3">
                        <History className="w-5 h-5 text-primary" />
                        Session History
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Filter className="w-4 h-4" />
                        <select
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 focus:border-primary outline-none text-white transition-colors"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="ALL">All Sessions</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="STOPPED">Stopped</option>
                        </select>
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-black/20 text-gray-500 font-mono uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-5 font-medium">Session ID</th>
                            <th className="p-5 font-medium">Date</th>
                            <th className="p-5 font-medium">Type</th>
                            <th className="p-5 font-medium">Participants</th>
                            <th className="p-5 font-medium">Status</th>
                            {isAdmin && <th className="p-5 font-medium text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sessions.filter((s: any) => filter === 'ALL' || s.status === filter).map((session: any) => (
                            <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 font-mono text-gray-300">{session.id}</td>
                                <td className="p-5 text-gray-400">{new Date(session.created_at).toLocaleDateString()}</td>
                                <td className="p-5">
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs">
                                        {session.config_json?.risk_profile || 'Standard'}
                                    </span>
                                </td>
                                <td className="p-5 text-gray-400 font-mono">{Object.keys(session.participants || {}).length}</td>
                                <td className="p-5">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase",
                                        session.status === 'COMPLETED' ? "bg-success/10 text-success border border-success/20" :
                                            session.status === 'ACTIVE' || session.status === 'RUNNING' ? "bg-primary/10 text-primary border border-primary/20 animate-pulse" :
                                                "bg-red-500/10 text-red-500 border border-red-500/20"
                                    )}>
                                        {session.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td className="p-5 text-right">
                                        <button
                                            onClick={() => deleteSession.mutate(session.id)}
                                            className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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

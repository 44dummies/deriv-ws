import { useState } from 'react';
import { Play, Pause, Square, History, Filter, Trash2, Loader2, ArrowRight, X, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fetchWithAuth } from '../lib/api';
import { Link } from 'react-router-dom';

const RISK_PROFILES = [
    { id: 'CONSERVATIVE', label: 'Conservative', desc: 'Low risk, high win rate priority' },
    { id: 'MODERATE', label: 'Moderate', desc: 'Balanced risk and reward' },
    { id: 'AGGRESSIVE', label: 'Aggressive', desc: 'Higher stakes, higher potential returns' }
];

export default function Sessions() {
    const [filter, setFilter] = useState('ALL');
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [config, setConfig] = useState({
        risk_profile: 'MODERATE',
        max_stake: 50,
        stop_loss: 100,
        take_profit: 200,
        duration_minutes: 60
    });

    // Fetch Sessions
    const { data: sessionData, isLoading } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            return fetchWithAuth('/sessions');
        },
        refetchInterval: 5000
    });

    const sessions = sessionData?.sessions || [];
    const activeSession = sessions.find((s: any) =>
        (s.status === 'ACTIVE' || s.status === 'RUNNING' || s.status === 'PAUSED') &&
        s.owner_id === user?.id
    );

    // Mutations
    const mutationFn = async ({ path, method = 'POST', body }: { path: string, method?: string, body?: any }) => {
        return fetchWithAuth(`/sessions/${path}`, {
            method,
            body: body ? JSON.stringify(body) : null
        });
    };

    const createSession = useMutation({
        mutationFn: (sessionConfig: any) => mutationFn({ path: '', body: { config: sessionConfig } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            setShowCreateModal(false);
        }
    });

    const controlSession = useMutation({
        mutationFn: ({ id, action }: { id: string, action: 'start' | 'pause' | 'resume' | 'stop' }) =>
            mutationFn({ path: `${id}/${action}` }),
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
        <div className="space-y-8 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold mb-2">Sessions</h1>
                    <p className="text-sm text-muted-foreground">
                        Create and control your trading sessions.
                    </p>
                </div>
                {!activeSession && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={createSession.isPending}
                        className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-2 transition-colors duration-150 ease-out disabled:opacity-60"
                    >
                        {createSession.isPending ? <Loader2 className="animate-spin" /> : <Settings2 className="w-5 h-5" />}
                        <span className="font-medium">Configure Session</span>
                    </button>
                )}
            </div>

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border p-6 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Configure Session</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Risk Profile */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Profile</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {RISK_PROFILES.map(profile => (
                                        <button
                                            key={profile.id}
                                            onClick={() => setConfig({ ...config, risk_profile: profile.id })}
                                            className={cn(
                                                "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                                                config.risk_profile === profile.id
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                    : "border-border hover:bg-muted/50"
                                            )}
                                        >
                                            <span className="font-medium text-sm">{profile.label}</span>
                                            <span className="text-xs text-muted-foreground">{profile.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Max Stake ($)</label>
                                    <input
                                        type="number"
                                        value={config.max_stake}
                                        onChange={e => setConfig({ ...config, max_stake: Number(e.target.value) })}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Take Profit ($)</label>
                                    <input
                                        type="number"
                                        value={config.take_profit}
                                        onChange={e => setConfig({ ...config, take_profit: Number(e.target.value) })}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Stop Loss ($)</label>
                                    <input
                                        type="number"
                                        value={config.stop_loss}
                                        onChange={e => setConfig({ ...config, stop_loss: Number(e.target.value) })}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Duration (min)</label>
                                    <input
                                        type="number"
                                        value={config.duration_minutes}
                                        onChange={e => setConfig({ ...config, duration_minutes: Number(e.target.value) })}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        min="1"
                                        max="1440"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => createSession.mutate(config)}
                                disabled={createSession.isPending}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                {createSession.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                Start Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Session Card */}
            {activeSession ? (
                <div className="p-6 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="relative">
                                    <span className={cn(
                                        "relative inline-flex rounded-full h-2.5 w-2.5",
                                        activeSession.status === 'PAUSED' ? "bg-yellow-500" : "bg-primary"
                                    )}></span>
                                </div>
                                <h2 className="text-lg font-semibold">
                                    {activeSession.status === 'PAUSED' ? 'Paused Session' : 'Active Session'}
                                </h2>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                                ID: <span className="text-foreground">{activeSession.id}</span> •
                                {activeSession.started_at
                                    ? `Started ${formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: true })}`
                                    : 'Not started yet'
                                }
                            </p>
                        </div>

                        {/* Session Controls */}
                        <div className="flex gap-3">
                            {activeSession.status === 'PENDING' && (
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'start' })}
                                    disabled={controlSession.isPending}
                                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors duration-150 ease-out disabled:opacity-60 flex items-center gap-2"
                                >
                                    {controlSession.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    Start
                                </button>
                            )}
                            {activeSession.status === 'PAUSED' && (
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'resume' })}
                                    disabled={controlSession.isPending}
                                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors duration-150 ease-out disabled:opacity-60 flex items-center gap-2"
                                >
                                    {controlSession.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    Resume
                                </button>
                            )}
                            {(activeSession.status === 'RUNNING' || activeSession.status === 'ACTIVE') && (
                                <button
                                    onClick={() => controlSession.mutate({ id: activeSession.id, action: 'pause' })}
                                    disabled={controlSession.isPending}
                                    className="p-2 border border-border rounded-md text-foreground hover:bg-muted/60 transition-colors duration-150 ease-out disabled:opacity-60"
                                    title="Pause Session"
                                >
                                    <Pause className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => controlSession.mutate({ id: activeSession.id, action: 'stop' })}
                                disabled={controlSession.isPending}
                                className="p-2 border border-border rounded-md text-destructive hover:bg-muted/60 transition-colors duration-150 ease-out disabled:opacity-60"
                                title="Stop Session"
                            >
                                <Square className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="p-4 bg-muted/40 rounded-md border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Risk Profile</div>
                            <div className="font-medium text-sm">{activeSession.config_json?.risk_profile || 'MODERATE'}</div>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-md border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                            <div className={cn(
                                "font-medium text-sm",
                                activeSession.status === 'RUNNING' || activeSession.status === 'ACTIVE' ? "text-green-500" :
                                    activeSession.status === 'PAUSED' ? "text-yellow-500" : ""
                            )}>
                                {activeSession.status}
                            </div>
                        </div>
                        <div className="p-4 bg-muted/40 rounded-md border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Trades</div>
                            <Link to="/statistics" className="font-medium text-sm text-primary flex items-center gap-1 hover:underline">
                                View Stats <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-10 text-center border border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">No active session. Configure one to start automated trading.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={createSession.isPending}
                        className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md inline-flex items-center gap-2 transition-colors"
                    >
                        {createSession.isPending ? <Loader2 className="animate-spin" /> : <Settings2 className="w-5 h-5" />}
                        Configure Session
                    </button>
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
                            <th className="p-5 font-medium">Risk Profile</th>
                            <th className="p-5 font-medium">Status</th>
                            <th className="p-5 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sessions.filter((s: any) => filter === 'ALL' || s.status === filter).map((session: any) => (
                            <tr key={session.id} className="hover:bg-muted/40 transition-colors group">
                                <td className="p-5 font-mono text-foreground">{session.id}</td>
                                <td className="p-5 text-muted-foreground">{new Date(session.created_at).toLocaleDateString()}</td>
                                <td className="p-5">
                                    <span className="px-3 py-1 rounded-full bg-muted/50 border border-border text-xs">
                                        {session.config_json?.risk_profile || 'MODERATE'}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
                                        session.status === 'COMPLETED' ? "bg-muted/40 text-muted-foreground border-border" :
                                            session.status === 'RUNNING' || session.status === 'ACTIVE' ? "bg-primary/10 text-primary border-primary/20" :
                                                session.status === 'PAUSED' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                                    "bg-muted/40 text-muted-foreground border-border"
                                    )}>
                                        {session.status}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    {session.status === 'COMPLETED' && (
                                        <button
                                            onClick={() => deleteSession.mutate(session.id)}
                                            disabled={deleteSession.isPending}
                                            className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {sessions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                                    No sessions yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

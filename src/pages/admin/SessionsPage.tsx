/**
 * Sessions Page - Simplified Admin Session Management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventStream } from '../../hooks/useEventStream';
import { useWebSocketEvents } from '../../hooks/useWebSocketEvents';
import { Play, Pause, Plus, Monitor, Wifi, WifiOff, Trash2, StopCircle, Zap, Activity, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { tradingApi } from '../../trading/tradingApi';
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassModal } from '../../components/ui/glass/GlassModal';
import { GlassStatusBadge } from '../../components/ui/glass/GlassStatusBadge';
import toast from 'react-hot-toast';

interface Session {
  id: string;
  name: string;
  status: string;
  mode: 'real' | 'demo';
  markets: string[];
  min_balance: number;
  default_tp: number;
  default_sl: number;
  created_at: string;
  participants_count?: number;
  participants?: { user_id: string; username?: string; email?: string; take_profit?: number; stop_loss?: number; net_pnl?: number; joined_at?: string }[];
}

interface ActivityItem {
  id: number;
  type: 'signal' | 'open' | 'close';
  side?: string;
  market?: string;
  price?: number;
  profit?: number;
  result?: 'won' | 'lost';
  confidence?: number;
  digit?: number;
  timestamp: string;
}

const AVAILABLE_MARKETS = [
  { value: '1HZ10V', label: 'Volatility 10 (1s)' },
  { value: '1HZ25V', label: 'Volatility 25 (1s)' },
  { value: '1HZ50V', label: 'Volatility 50 (1s)' },
  { value: '1HZ75V', label: 'Volatility 75 (1s)' },
  { value: '1HZ100V', label: 'Volatility 100 (1s)' },
  { value: 'R_10', label: 'Volatility 10 Index' },
  { value: 'R_25', label: 'Volatility 25 Index' },
  { value: 'R_50', label: 'Volatility 50 Index' },
  { value: 'R_75', label: 'Volatility 75 Index' },
  { value: 'R_100', label: 'Volatility 100 Index' },
];

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Create session form state - SIMPLIFIED
  const [newSession, setNewSession] = useState({
    mode: 'demo' as 'real' | 'demo',
    market: '1HZ100V',
    min_balance: 5,
    default_tp: 10,
    default_sl: 5
  });

  // Get running session for WebSocket events
  const runningSession = sessions.find(s => s.status === 'running');
  const activeMarket = runningSession?.markets?.[0] || 'R_100';

  // WebSocket events for real-time trade/signal monitoring
  const { latestTrade, latestSignal } = useWebSocketEvents(runningSession?.id || null, [activeMarket]);

  // SSE for real-time updates
  const { isConnected: sseConnected } = useEventStream({
    topics: ['session:events'],
    onEvent: (event) => {
      if (event.type.startsWith('session.')) {
        fetchSessions();
      }
    }
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  // Update activity log when trades arrive
  useEffect(() => {
    if (latestTrade) {
      const item: ActivityItem = {
        id: Date.now(),
        type: (latestTrade.type === 'open' ? 'open' : 'close') as 'open' | 'close',
        side: latestTrade.side || latestTrade.signal,
        market: latestTrade.market,
        price: latestTrade.price,
        profit: latestTrade.profit,
        result: latestTrade.result as 'won' | 'lost' | undefined,
        timestamp: latestTrade.timestamp || new Date().toISOString()
      };
      setActivityLog(prev => [item, ...prev].slice(0, 50));
    }
  }, [latestTrade]);

  // Update activity log when signals arrive
  useEffect(() => {
    if (latestSignal) {
      const item: ActivityItem = {
        id: Date.now(),
        type: 'signal' as const,
        side: latestSignal.side,
        market: latestSignal.market,
        confidence: latestSignal.confidence,
        digit: latestSignal.digit,
        timestamp: new Date().toISOString()
      };
      setActivityLog(prev => [item, ...prev].slice(0, 50));
    }
  }, [latestSignal]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await tradingApi.getSessions();
      const data = Array.isArray(response) ? response : (response.data || response.sessions || []);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load sessions', err);
      if (err.message?.includes('No token') || err.message?.includes('Unauthorized')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setCreating(true);
    try {
      // Auto-generate session name based on mode and market
      const sessionName = `${newSession.mode.toUpperCase()} - ${newSession.market} - ${new Date().toLocaleDateString()}`;

      const result = await tradingApi.createSession({
        name: sessionName,
        mode: newSession.mode,
        markets: [newSession.market],
        min_balance: newSession.min_balance,
        default_tp: newSession.default_tp,
        default_sl: newSession.default_sl,
        session_type: 'day' // Default type
      });

      if (result) {
        toast.success('Session created successfully');
        await fetchSessions();
        setShowCreateModal(false);
        // Reset form
        setNewSession({
          mode: 'demo',
          market: '1HZ100V',
          min_balance: 5,
          default_tp: 10,
          default_sl: 5
        });
      }
    } catch (err: any) {
      console.error('Failed to create session', err);
      toast.error(err.message || 'Failed to create session');
    }
    setCreating(false);
  };

  const handleStartSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await tradingApi.startSession(sessionId);
      toast.success('Session started');
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start session');
    }
    setActionLoading(null);
  };

  const handleStopSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await tradingApi.stopSession(sessionId);
      toast.success('Session stopped');
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop session');
    }
    setActionLoading(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    setActionLoading(sessionId);
    try {
      await tradingApi.deleteSession(sessionId);
      toast.success('Session deleted');
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session');
    }
    setActionLoading(null);
  };

  const handleClearCompleted = async () => {
    const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');
    if (completedSessions.length === 0) {
      toast.error('No completed sessions to clear');
      return;
    }
    if (!window.confirm(`Delete ${completedSessions.length} completed session(s)?`)) return;

    setActionLoading('clear');
    try {
      for (const session of completedSessions) {
        await tradingApi.deleteSession(session.id);
      }
      toast.success(`Cleared ${completedSessions.length} completed sessions`);
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear sessions');
    }
    setActionLoading(null);
  };

  const toggleSessionExpand = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setParticipants([]);
      return;
    }

    setExpandedSession(sessionId);
    setLoadingParticipants(true);
    try {
      const result = await tradingApi.getSessionParticipants(sessionId);
      const participantList = Array.isArray(result) ? result : (result.data || result.participants || []);
      setParticipants(participantList);
    } catch (err: any) {
      console.error('Failed to load participants:', err);
      setParticipants([]);
      toast.error('Failed to load participant details');
    }
    setLoadingParticipants(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
            <Monitor size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sessions</h1>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              Manage trading sessions
              {sseConnected ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs"><Wifi size={12} /> Live</span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-xs"><WifiOff size={12} /> Polling</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {sessions.some(s => s.status === 'completed' || s.status === 'cancelled') && (
            <GlassButton
              variant="ghost"
              onClick={handleClearCompleted}
              disabled={actionLoading === 'clear'}
              icon={<Trash2 size={18} />}
            >
              Clear Completed
            </GlassButton>
          )}
          <GlassButton
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus size={18} />}
          >
            Create Session
          </GlassButton>
        </div>
      </GlassCard>

      {/* Sessions List */}
      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Monitor size={48} className="mx-auto mb-4 opacity-30" />
            <p>No sessions yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Session</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Mode</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Market</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Min Bal</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">TP/SL</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Participants</th>
                  <th className="text-left py-3 px-4 text-xs uppercase text-slate-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs uppercase text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <React.Fragment key={session.id}>
                    <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${expandedSession === session.id ? 'bg-white/5' : ''}`}>
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{session.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${session.mode === 'real'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                          }`}>
                          {session.mode?.toUpperCase() || 'DEMO'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {session.markets?.[0] || '-'}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        ${session.min_balance || 5}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        <span className="text-emerald-400">${session.default_tp || 10}</span>
                        {' / '}
                        <span className="text-red-400">${session.default_sl || 5}</span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleSessionExpand(session.id)}
                          className={`flex items-center gap-2 text-sm font-bold transition-colors ${(session.participants_count || 0) > 0
                              ? 'text-emerald-400 hover:text-emerald-300 cursor-pointer'
                              : 'text-slate-500'
                            }`}
                          disabled={(session.participants_count || 0) === 0}
                        >
                          {expandedSession === session.id ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          <Users size={14} />
                          {session.participants_count || 0} joined
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <GlassStatusBadge status={session.status === 'running' || session.status === 'active' ? 'active' : 'inactive'}>
                          {session.status?.toUpperCase() || 'PENDING'}
                        </GlassStatusBadge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {session.status === 'running' || session.status === 'active' ? (
                            <GlassButton
                              variant="danger"
                              size="sm"
                              onClick={() => handleStopSession(session.id)}
                              disabled={actionLoading === session.id}
                              icon={<StopCircle size={14} />}
                            >
                              Stop
                            </GlassButton>
                          ) : (
                            <GlassButton
                              variant="primary"
                              size="sm"
                              onClick={() => handleStartSession(session.id)}
                              disabled={actionLoading === session.id}
                              icon={<Play size={14} />}
                            >
                              Start
                            </GlassButton>
                          )}
                          <GlassButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                            disabled={actionLoading === session.id || session.status === 'running' || session.status === 'active'}
                            icon={<Trash2 size={14} />}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Participants Row */}
                    {expandedSession === session.id && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={8} className="p-4">
                          <div className="border border-white/10 rounded-xl bg-black/20 p-4">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                              <Users className="text-emerald-400" size={18} />
                              <h4 className="text-white font-bold">Participant Details</h4>
                              <span className="text-xs text-slate-500">({participants.length} users)</span>
                            </div>

                            {loadingParticipants ? (
                              <div className="flex items-center justify-center py-6">
                                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : participants.length === 0 ? (
                              <div className="text-center py-6 text-slate-500">
                                No participants yet
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-slate-500 uppercase border-b border-white/5">
                                      <th className="text-left py-2 px-3">User</th>
                                      <th className="text-left py-2 px-3">TP / SL</th>
                                      <th className="text-left py-2 px-3">Net P&L</th>
                                      <th className="text-left py-2 px-3">Joined</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {participants.map((p, idx) => (
                                      <tr key={p.user_id || idx} className="border-b border-white/5 last:border-0">
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                                              {(p.username || p.email || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                              <div className="text-white font-medium">{p.username || 'Anonymous'}</div>
                                              <div className="text-xs text-slate-500">{p.email || p.user_id?.slice(0, 8)}</div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <span className="text-emerald-400">${p.take_profit || '-'}</span>
                                          {' / '}
                                          <span className="text-red-400">${p.stop_loss || '-'}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                          <span className={`font-mono font-bold ${(p.net_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {(p.net_pnl || 0) >= 0 ? '+' : ''}${(p.net_pnl || 0).toFixed(2)}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-400">
                                          {p.joined_at ? new Date(p.joined_at).toLocaleString() : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Live Feed - Bot Execution Monitor */}
      <GlassCard className="max-h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-400" size={20} />
            <h3 className="text-lg font-bold text-white">Live Feed</h3>
            {runningSession && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                {runningSession.name}
              </span>
            )}
          </div>
          {activityLog.length > 0 && (
            <button
              onClick={() => setActivityLog([])}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {activityLog.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 py-8">
              <Activity size={36} className="mb-3" />
              <p className="text-sm">Waiting for bot activity...</p>
              {!runningSession && (
                <p className="text-xs mt-1">Start a session to see live trades</p>
              )}
            </div>
          ) : (
            activityLog.map((a) => (
              <div
                key={a.id}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${a.type === 'signal'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : a.result === 'won'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : a.result === 'lost'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${a.type === 'signal'
                        ? 'bg-blue-500/20 text-blue-400'
                        : a.result === 'won'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : a.result === 'lost'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}
                    >
                      {a.type === 'signal' ? 'SIGNAL' : 'TRADE'}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {a.side} {a.digit !== undefined && a.digit}
                    </span>
                    {a.market && (
                      <span className="text-xs text-slate-500">{a.market}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {a.profit !== undefined && (
                  <span
                    className={`font-mono font-bold ${a.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                  >
                    {a.profit >= 0 ? '+' : ''}
                    {a.profit.toFixed(2)}
                  </span>
                )}
                {a.confidence !== undefined && (
                  <span className="text-xs font-mono text-blue-300">
                    {(a.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Create Session Modal - SIMPLIFIED */}
      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Session"
      >
        <div className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm text-slate-400 mb-3">Trading Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewSession({ ...newSession, mode: 'demo' })}
                className={`p-4 rounded-xl border-2 transition-all ${newSession.mode === 'demo'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-white/10 bg-transparent text-slate-400 hover:border-white/20'
                  }`}
              >
                <div className="text-lg font-bold">Demo</div>
                <div className="text-xs opacity-70">Practice mode</div>
              </button>
              <button
                type="button"
                onClick={() => setNewSession({ ...newSession, mode: 'real' })}
                className={`p-4 rounded-xl border-2 transition-all ${newSession.mode === 'real'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/10 bg-transparent text-slate-400 hover:border-white/20'
                  }`}
              >
                <div className="text-lg font-bold">Real</div>
                <div className="text-xs opacity-70">Live trading</div>
              </button>
            </div>
          </div>

          {/* Market Selection */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Market</label>
            <select
              value={newSession.market}
              onChange={(e) => setNewSession({ ...newSession, market: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            >
              {AVAILABLE_MARKETS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Min Balance */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Minimum Balance ($)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={newSession.min_balance}
              onChange={(e) => setNewSession({ ...newSession, min_balance: parseFloat(e.target.value) || 5 })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">Users below this balance will be asked to wait for a lower session</p>
          </div>

          {/* TP and SL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Take Profit ($)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={newSession.default_tp}
                onChange={(e) => setNewSession({ ...newSession, default_tp: parseFloat(e.target.value) || 10 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Stop Loss ($)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={newSession.default_sl}
                onChange={(e) => setNewSession({ ...newSession, default_sl: parseFloat(e.target.value) || 5 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleCreateSession}
              disabled={creating}
              isLoading={creating}
            >
              Create Session
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

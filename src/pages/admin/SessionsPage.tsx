/**
 * Sessions Page - Advanced Session Management with Glass UI (Verified)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Play, Pause, Square, Plus, Filter, Search, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Users, Shield, Zap, Bell, CheckCircle,
  Monitor, Wifi, WifiOff, Trash2, StopCircle
} from 'lucide-react';
import { tradingApi } from '../../trading/tradingApi';
import { useWebSocketEvents } from '../../hooks/useWebSocketEvents';
import { useEventStream } from '../../hooks/useEventStream';
import { useSessionTicks } from '../../hooks/useSessionTicks';

// UI Components
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassModal } from '../../components/ui/glass/GlassModal';
import { GlassStatusBadge } from '../../components/ui/glass/GlassStatusBadge';
import { GlassInput } from '../../components/ui/glass/GlassInput';
import { ChartPanel } from '../../components/chart/ChartPanel';
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
  participants?: any[];
  current_pnl?: number; // Added to support pnl tracking
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

  // Selection & Details
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Create session form
  const [newSession, setNewSession] = useState({
    mode: 'demo' as 'real' | 'demo',
    market: '1HZ100V',
    min_balance: 5,
    default_tp: 10,
    default_sl: 5
  });

  // Data Hooks
  const { latestTrade, latestSignal } = useWebSocketEvents(selectedSession?.id || null, selectedSession?.markets || []);
  const { isConnected: sseConnected } = useEventStream({
    topics: ['session:events'],
    onEvent: (event) => {
      if (event.type.startsWith('session.')) {
        fetchSessions();
      }
    }
  });

  // Chart Data
  const { ticks: sessionTicks, loading: loadingTicks } = useSessionTicks(selectedSessionId);
  const activeMarket = selectedSession?.markets[0] || 'R_100';
  const chartInitialTicks = sessionTicks[activeMarket] || [];

  // Real-time chart updates (using WebSocket latestTrade/Signal just for markers, usually ticks come from separate stream but we reuse WS trade tick if available or just rely on regular polling from useSessionTicks)
  // For now, we will just use the tick history + websocket trades as markers.

  // Derived Markers
  const tradeMarkers = useMemo(() => {
    // In a real app we would merge historical trades with live incoming trades
    if (!latestTrade) return [];
    return [{
      time: latestTrade.timestamp ? new Date(latestTrade.timestamp).getTime() / 1000 : Date.now() / 1000,
      type: latestTrade.type,
      price: latestTrade.price || 0
    }];
  }, [latestTrade]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await tradingApi.getSessions();
      const data = Array.isArray(response) ? response : (response.data || response.sessions || []);
      setSessions(Array.isArray(data) ? data : []);

      // Auto-select first running session if none selected
      if (!selectedSessionId && data.length > 0) {
        const running = data.find((s: Session) => s.status === 'running');
        if (running) setSelectedSessionId(running.id);
      }
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
      const sessionName = `${newSession.mode.toUpperCase()} - ${newSession.market} - ${new Date().toLocaleDateString()}`;
      const result = await tradingApi.createSession({
        name: sessionName,
        mode: newSession.mode,
        markets: [newSession.market],
        min_balance: newSession.min_balance,
        default_tp: newSession.default_tp,
        default_sl: newSession.default_sl,
        session_type: 'day'
      });

      if (result) {
        toast.success('Session created successfully');
        await fetchSessions();
        setShowCreateModal(false);
        // Reset
        setNewSession({ mode: 'demo', market: '1HZ100V', min_balance: 5, default_tp: 10, default_sl: 5 });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create session');
    }
    setCreating(false);
  };

  const handleSessionAction = async (id: string, action: 'start' | 'stop' | 'delete') => {
    setActionLoading(id);
    try {
      if (action === 'start') await tradingApi.startSession(id);
      if (action === 'stop') await tradingApi.stopSession(id);
      if (action === 'delete') {
        if (!window.confirm('Delete this session?')) {
          setActionLoading(null);
          return;
        }
        await tradingApi.deleteSession(id);
        if (selectedSessionId === id) setSelectedSessionId(null);
      }
      toast.success(`Session ${action}ed`);
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} session`);
    }
    setActionLoading(null);
  };

  // Stats Calculation
  const stats = useMemo(() => {
    const total = sessions.length;
    const running = sessions.filter(s => s.status === 'running').length;
    const totalPnL = sessions.reduce((acc, s) => acc + (s.current_pnl || 0), 0);
    return { total, running, totalPnL };
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true :
      filterStatus === 'running' ? (s.status === 'running' || s.status === 'active') :
        (s.status === 'completed' || s.status === 'stopped' || s.status === 'cancelled');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={<Users className="text-blue-400" />} label="Total Sessions" value={stats.total.toString()} />
          <StatBox icon={<Activity className="text-emerald-400" />} label="Running" value={stats.running.toString()} />
          <StatBox icon={<DollarSign className={stats.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"} />} label="Total P/L" value={`$${stats.totalPnL.toFixed(2)}`} />
          <StatBox icon={<Wifi className={sseConnected ? "text-emerald-400" : "text-amber-400"} />} label="System Status" value={sseConnected ? "Connected" : "Reconnecting"} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Session List */}
        <div className="lg:col-span-4 space-y-4">
          <GlassCard className="p-4 flex flex-col h-[700px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-white">Sessions</h2>
              <GlassButton size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={14} />}>New</GlassButton>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none"
              >
                <option value="all">All</option>
                <option value="running">Running</option>
                <option value="completed">Ended</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No sessions found</div>
              ) : (
                filteredSessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedSessionId === session.id
                      ? 'bg-gradient-to-r from-liquid-accent/20 to-transparent border-liquid-accent/50'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-white text-sm truncate pr-2">{session.name}</span>
                      <GlassStatusBadge status={session.status === 'running' ? 'active' : 'inactive'} size="sm">
                        {session.status}
                      </GlassStatusBadge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>{session.markets[0]}</span>
                      <span className={session.mode === 'real' ? "text-emerald-400 font-bold" : "text-blue-400"}>
                        {session.mode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Panel: Details & Chart */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSession ? (
            <>
              {/* Main Chart Card */}
              <GlassCard className="p-0 overflow-hidden relative min-h-[400px]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="text-emerald-400" size={20} />
                    <div>
                      <h2 className="font-bold text-white">{selectedSession.name}</h2>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        ID: {selectedSession.id.slice(0, 8)}...
                        <span className="w-1 h-1 bg-slate-500 rounded-full" />
                        Risk: {selectedSession.default_tp}/{selectedSession.default_sl}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedSession.status === 'running' ? (
                      <>
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSessionAction(selectedSession.id, 'stop')}
                          disabled={actionLoading === selectedSession.id}
                          leftIcon={<Pause size={14} />}
                        >
                          Pause
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleSessionAction(selectedSession.id, 'stop')}
                          disabled={actionLoading === selectedSession.id}
                          leftIcon={<StopCircle size={14} />}
                        >
                          Stop
                        </GlassButton>
                      </>
                    ) : (
                      <>
                        <GlassButton
                          size="sm"
                          variant="primary"
                          onClick={() => handleSessionAction(selectedSession.id, 'start')}
                          disabled={actionLoading === selectedSession.id}
                          leftIcon={<Play size={14} />}
                        >
                          Start
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSessionAction(selectedSession.id, 'delete')}
                          disabled={actionLoading === selectedSession.id}
                          leftIcon={<Trash2 size={14} />}
                        >
                          Delete
                        </GlassButton>
                      </>
                    )}
                  </div>
                </div>

                {/* Chart Area */}
                <div className="h-[400px] w-full bg-[#10141e] relative">
                  {loadingTicks ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">Loading Chart Data...</div>
                  ) : (
                    <ChartPanel
                      initialTicks={chartInitialTicks}
                      currentTick={null}
                      tradeMarkers={tradeMarkers}
                      signalMarkers={[]}
                      height={400}
                    />
                  )}
                </div>
              </GlassCard>

              {/* Participants & Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-4 h-[300px] flex flex-col">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={16} className="text-blue-400" /> Participants
                  </h3>
                  <div className="flex-1 overflow-y-auto">
                    {!selectedSession.participants_count ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                        <Users size={32} className="mb-2" />
                        <p className="text-sm">No participants yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Mock/Real participants list here */}
                        <div className="text-center text-slate-400 text-sm mt-10">
                          {selectedSession.participants_count} Participant(s) Joined
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-4 h-[300px] flex flex-col">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" /> Recent Activity
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {latestTrade ? (
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10 mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-emerald-400">TRADE EXECUTION</span>
                          <span className="text-[10px] text-slate-500">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="text-sm text-white">
                          {latestTrade.type.toUpperCase()} on {latestTrade.market} @ {latestTrade.price}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 text-sm mt-10 opacity-60">
                        Waiting for signals...
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-40 min-h-[400px]">
              <Monitor size={64} className="mb-4" />
              <p>Select a session to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <GlassModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Session">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Mode</label>
            <div className="flex gap-2">
              {['demo', 'real'].map(m => (
                <button
                  key={m}
                  onClick={() => setNewSession({ ...newSession, mode: m as 'real' | 'demo' })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${newSession.mode === m
                    ? m === 'real' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <GlassInput
            label="Market"
            value={newSession.market}
            onChange={(e) => setNewSession({ ...newSession, market: e.target.value })}
            list="markets"
          />
          <datalist id="markets">
            {AVAILABLE_MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </datalist>

          <div className="grid grid-cols-3 gap-3">
            <GlassInput
              label="Stake"
              type="number"
              value={newSession.min_balance}
              onChange={e => setNewSession({ ...newSession, min_balance: parseFloat(e.target.value) })}
            />
            <GlassInput
              label="TP ($)"
              type="number"
              value={newSession.default_tp}
              onChange={e => setNewSession({ ...newSession, default_tp: parseFloat(e.target.value) })}
            />
            <GlassInput
              label="SL ($)"
              type="number"
              value={newSession.default_sl}
              onChange={e => setNewSession({ ...newSession, default_sl: parseFloat(e.target.value) })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" onClick={handleCreateSession} isLoading={creating}>Create Session</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

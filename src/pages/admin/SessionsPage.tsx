/**
 * Sessions Page - Command Center View
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Play, Pause, Plus, Search,
  TrendingUp, DollarSign, Users, Shield, Zap,
  Trash2, StopCircle, Terminal, BarChart2, Layers
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
  current_pnl?: number;
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
  const { latestTrade } = useWebSocketEvents(selectedSession?.id || null, selectedSession?.markets || []);
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

  const tradeMarkers = useMemo(() => {
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

  const stats = useMemo(() => {
    const total = sessions.length;
    const running = sessions.filter(s => s.status === 'running').length;
    const totalPnL = sessions.reduce((acc, s) => acc + (s.current_pnl || 0), 0);
    return { total, running, totalPnL };
  }, [sessions]);

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true :
      filterStatus === 'running' ? (s.status === 'running' || s.status === 'active') :
        (s.status === 'completed' || s.status === 'stopped' || s.status === 'cancelled');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Stats Bar */}
      <GlassCard className="p-3 bg-brand-card/50 border-white/5">
        <div className="flex items-center justify-between gap-6 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-4 min-w-[150px]">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Layers className="text-blue-400" size={18} /></div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Total Sessions</div>
              <div className="text-xl font-mono font-bold text-white">{stats.total}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-[150px]">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><Activity className="text-emerald-400" size={18} /></div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Active Running</div>
              <div className="text-xl font-mono font-bold text-white">{stats.running}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-[150px]">
            <div className="p-2 bg-brand-red/10 rounded-lg"><DollarSign className="text-brand-red" size={18} /></div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Global P&L</div>
              <div className={`text-xl font-mono font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-[150px]">
            <div className={`p-2 rounded-lg ${sseConnected ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              <Zap className={sseConnected ? 'text-emerald-400' : 'text-amber-400'} size={18} />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Stream Status</div>
              <div className="text-sm font-bold text-white">{sseConnected ? "CONNECTED" : "RECONNECTING"}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        {/* Left Panel: Session List (3 col) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal size={14} /> Active Sessions
            </h2>
            <GlassButton size="xs" variant="primary" onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={12} />}>NEW</GlassButton>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
            <input
              type="text"
              placeholder="Filter sessions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-brand-card border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`
                        p-3 rounded-lg border cursor-pointer transition-all group relative overflow-hidden
                        ${selectedSessionId === session.id
                    ? 'bg-brand-card border-brand-red/50 shadow-lg shadow-brand-red/5'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                  }
                    `}
              >
                {selectedSessionId === session.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red" />}

                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold truncate pr-2 ${selectedSessionId === session.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {session.name}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${session.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                  <span className="text-brand-red">{session.markets[0]}</span>
                  <span>pnl: ${session.current_pnl?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Command Center (Main Chart) (6 col) */}
        <div className="lg:col-span-6 flex flex-col bg-brand-card rounded-xl border border-white/5 overflow-hidden relative">
          {selectedSession ? (
            <>
              <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-brand-dark/50">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-white text-sm">{selectedSession.name}</h2>
                  <span className="text-xs font-mono text-gray-500">{selectedSession.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession.status === 'running' ? (
                    <>
                      <button onClick={() => handleSessionAction(selectedSession.id, 'stop')} className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1 rounded hover:bg-amber-500/20 transition-colors uppercase font-bold tracking-wider">Pause</button>
                      <button onClick={() => handleSessionAction(selectedSession.id, 'stop')} className="text-xs bg-brand-red/10 text-brand-red px-3 py-1 rounded hover:bg-brand-red/20 transition-colors uppercase font-bold tracking-wider">Stop</button>
                    </>
                  ) : (
                    <button onClick={() => handleSessionAction(selectedSession.id, 'start')} className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded hover:bg-emerald-500/20 transition-colors uppercase font-bold tracking-wider flex items-center gap-1"><Play size={10} /> Start</button>
                  )}
                </div>
              </div>

              <div className="flex-1 relative bg-brand-dark">
                {loadingTicks ? (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono text-xs">LOADING MARKET DATA...</div>
                ) : (
                  <ChartPanel
                    initialTicks={chartInitialTicks}
                    currentTick={null}
                    tradeMarkers={tradeMarkers}
                    signalMarkers={[]}
                    height={500}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <BarChart2 size={48} className="mb-4 opacity-20" />
              <p className="text-xs font-mono uppercase tracking-widest">Select a Session</p>
            </div>
          )}
        </div>

        {/* Right Panel: Risk & Activity (3 col) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {selectedSession && (
            <>
              <GlassCard className="p-4 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={12} /> Risk Parameters
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">TAKE PROFIT</div>
                    <div className="text-xl font-mono font-bold text-emerald-400">${selectedSession.default_tp}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">STOP LOSS</div>
                    <div className="text-xl font-mono font-bold text-brand-red">${selectedSession.default_sl}</div>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">MIN BALANCE</div>
                  <div className="text-lg font-mono text-white">${selectedSession.min_balance}</div>
                </div>
              </GlassCard>

              <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
                <div className="p-3 border-b border-white/5 bg-white/5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Terminal size={12} /> Session Logs
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-2 text-gray-400 bg-black/20">
                  {latestTrade ? (
                    <div className="flex gap-2 text-white">
                      <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                      <span>
                        <span className={latestTrade.type === 'CHECK' ? 'text-blue-400' : 'text-emerald-400'}>{latestTrade.type}</span>
                        {' '}{latestTrade.market} @ {latestTrade.price}
                      </span>
                    </div>
                  ) : (
                    <div className="text-gray-600 italic">System initialized. Waiting for events...</div>
                  )}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <GlassModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="DEPLOY NEW SESSION">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Environment</label>
            <div className="flex gap-2">
              {['demo', 'real'].map(m => (
                <button
                  key={m}
                  onClick={() => setNewSession({ ...newSession, mode: m as 'real' | 'demo' })}
                  className={`flex-1 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${newSession.mode === m
                    ? m === 'real' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <GlassInput
            label="MARKET INDEX"
            value={newSession.market}
            onChange={(e) => setNewSession({ ...newSession, market: e.target.value })}
            list="markets"
          />
          <datalist id="markets">
            {AVAILABLE_MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </datalist>

          <div className="grid grid-cols-3 gap-3">
            <GlassInput
              label="STAKE ($)"
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
            <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>CANCEL</GlassButton>
            <GlassButton variant="primary" onClick={handleCreateSession} isLoading={creating}>DEPLOY SESSION</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

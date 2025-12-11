/**
 * Sessions Page - Liquid Glass Renovation
 * Admin management for trading sessions (No Charts)
 */

import React, { useState, useEffect } from 'react';
import { useSessionTicks } from '../../hooks/useSessionTicks';
import { useWebSocketEvents } from '../../hooks/useWebSocketEvents';
import { useSessionStats } from '../../hooks/useSessionStats';
import { useEventStream } from '../../hooks/useEventStream';
import { Play, Pause, Activity, TrendingUp, DollarSign, Plus, X, Zap, Users, Monitor, Shield, Wifi, WifiOff } from 'lucide-react';
import { tradingApi } from '../../trading/tradingApi';
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassMetricTile } from '../../components/ui/glass/GlassMetricTile';
import { GlassModal } from '../../components/ui/glass/GlassModal';
import { GlassStatusBadge } from '../../components/ui/glass/GlassStatusBadge';

interface Session {
  id: string;
  name: string;
  status: string;
  markets: string[];
  type?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeMarket, setActiveMarket] = useState<string>('R_100');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create session form state
  const [newSession, setNewSession] = useState({
    name: '',
    type: 'day',
    markets: ['R_100'],
    default_stake: 0.35,
    default_tp: 10,
    default_sl: 5,
    min_balance: 5
  });

  // Hooks
  const { latestTick, latestTrade, latestSignal } = useWebSocketEvents(selectedSessionId, [activeMarket]);
  const { stats } = useSessionStats(selectedSessionId);

  // SSE for real-time updates
  const { events: sseEvents, isConnected: sseConnected } = useEventStream({
    topics: selectedSessionId ? ['trade:executed', 'trade:closed', 'session:events'] : [],
    onEvent: (event) => {
      // Add to activity log
      if (event.type === 'trade.executed' || event.type === 'trade.closed') {
        setActivityLog(prev => [{
          id: event.id,
          type: event.type === 'trade.executed' ? 'open' : 'close',
          side: event.payload.direction,
          market: event.payload.symbol,
          price: event.payload.entry || event.payload.exit,
          profit: event.payload.profitLoss,
          result: (event.payload.profitLoss as number) > 0 ? 'won' : (event.payload.profitLoss as number) < 0 ? 'lost' : undefined,
          timestamp: event.timestamp
        }, ...prev].slice(0, 100));
      }
      // Refresh stats on session events
      if (event.type.startsWith('session.')) {
        fetchSessions();
      }
    }
  });

  // Local State for Buffers
  const [activityLog, setActivityLog] = useState<any[]>([]);

  // Fetch Sessions on Mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await tradingApi.getSessions();
      const data = Array.isArray(response) ? response : (response.data || response.sessions || []);

      if (Array.isArray(data)) {
        setSessions(data);
        if (data.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].id);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  // Update Activity Log when events arrive
  useEffect(() => {
    if (latestTrade && latestTrade.market === activeMarket) {
      setActivityLog(prev => [{
        id: Date.now(),
        type: latestTrade.type,
        side: latestTrade.side || latestTrade.signal,
        market: latestTrade.market,
        price: latestTrade.price,
        profit: latestTrade.profit,
        result: latestTrade.result,
        timestamp: latestTrade.timestamp
      }, ...prev].slice(0, 100));
    }
  }, [latestTrade, activeMarket]);

  useEffect(() => {
    if (latestSignal && latestSignal.market === activeMarket) {
      setActivityLog(prev => [{
        id: Date.now(),
        type: 'signal',
        side: latestSignal.side,
        market: latestSignal.market,
        confidence: latestSignal.confidence,
        digit: latestSignal.digit,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 100));
    }
  }, [latestSignal, activeMarket]);

  // Create Session Handler
  const handleCreateSession = async () => {
    if (!newSession.name.trim()) return;
    setCreating(true);
    try {
      const result = await tradingApi.createSession(newSession);
      if (result) {
        await fetchSessions();
        setShowCreateModal(false);
        setNewSession({
          name: '',
          type: 'day',
          markets: ['R_100'],
          default_stake: 0.35,
          default_tp: 10,
          default_sl: 5,
          min_balance: 5
        });
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }
    setCreating(false);
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const availableMarkets = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10'];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <GlassCard className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
            <Monitor size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Session Control</h1>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              Manage live trading environments
              {sseConnected ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs"><Wifi size={12} /> Live</span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-xs"><WifiOff size={12} /> Polling</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GlassButton
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus size={18} />}
          >
            Create Session
          </GlassButton>
        </div>
      </GlassCard>

      {/* Session Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <GlassCard className="h-full flex items-center gap-4">
            <span className="text-slate-400 font-medium whitespace-nowrap">Active Session:</span>
            <select
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              value={selectedSessionId || ''}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                setActivityLog([]);
              }}
            >
              <option value="">Select a Session</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {selectedSession && (
              <GlassStatusBadge status={selectedSession.status === 'running' ? 'active' : 'inactive'}>
                {selectedSession.status.toUpperCase()}
              </GlassStatusBadge>
            )}
          </GlassCard>
        </div>

        <div>
          <GlassCard className="h-full flex items-center gap-4">
            <span className="text-slate-400 font-medium">Market:</span>
            <select
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              value={activeMarket}
              onChange={(e) => setActiveMarket(e.target.value)}
            >
              {availableMarkets.map(m => (
                <option key={m} value={m}>{m.replace('_', ' ')}</option>
              ))}
            </select>
          </GlassCard>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassMetricTile
          label="Total Profit"
          value={parseFloat(stats?.totalProfit || '0').toFixed(2)}
          icon={<DollarSign size={18} />}
          trend={parseFloat(stats?.totalProfit || '0') >= 0 ? 'up' : 'down'}
        />
        <GlassMetricTile
          label="Total Trades"
          value={String(stats?.totalTrades || 0)}
          icon={<Activity size={18} />}
        />
        <GlassMetricTile
          label="Win Rate"
          value={`${stats?.winRate || 0}%`}
          icon={<Zap size={18} />}
          trend="up"
          trendValue="vs prev"
        />
        <GlassMetricTile
          label="Wins / Losses"
          value={`${stats?.wins || 0} / ${stats?.losses || 0}`}
          icon={<Shield size={18} />}
        />
      </div>

      {/* Live Data Grid (No Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Market Pulse Panel */}
        <div className="space-y-6">
          <GlassCard className="border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Activity className="text-blue-400" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-white">Market Pulse</h2>
                  <p className="text-xs text-blue-400 font-mono mt-1">Live Tick Data</p>
                </div>
              </div>
              <span className="text-4xl font-mono font-bold text-white tracking-widest">
                {latestTick?.tick?.toFixed(activeMarket.includes('100') ? 2 : 5) || '---.---'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 uppercase">Last Signal</p>
                <p className={`text-lg font-bold mt-1 ${latestSignal?.side === 'CALL' || latestSignal?.side === 'OVER' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                  {latestSignal ? `${latestSignal.side} ${latestSignal.digit}` : '--'}
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 uppercase">Confidence</p>
                <p className="text-lg font-bold mt-1 text-white">
                  {latestSignal ? `${(latestSignal.confidence * 100).toFixed(0)}%` : '--'}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users size={18} className="text-purple-400" />
              Session Configuration
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400 text-sm">Session Type</span>
                <span className="text-white font-medium capitalize">{selectedSession?.type || 'Standard'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400 text-sm">Active Markets</span>
                <div className="flex gap-1">
                  {selectedSession?.markets?.map(m => (
                    <span key={m} className="text-xs bg-white/10 px-2 py-0.5 rounded text-white">{m.replace('_', ' ')}</span>
                  )) || <span className="text-slate-500">-</span>}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Live Activity Log */}
        <GlassCard className="h-[500px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="text-amber-400" size={20} />
            <h3 className="text-xl font-bold text-white">Live Feed</h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {activityLog.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <Activity size={48} className="mb-4" />
                <p>Waiting for market activity...</p>
              </div>
            ) : (
              activityLog.map((a) => (
                <div key={a.id} className={`p-3 rounded-lg border flex items-center justify-between transition-all ${a.type === 'signal' ? 'bg-blue-500/10 border-blue-500/20' :
                  a.result === 'won' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    a.result === 'lost' ? 'bg-red-500/10 border-red-500/20' :
                      'bg-white/5 border-white/10'
                  }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${a.type === 'signal' ? 'bg-blue-500/20 text-blue-400' :
                        a.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                          a.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-300'
                        }`}>
                        {a.type === 'signal' ? 'SIGNAL' : 'TRADE'}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {a.side} {a.digit !== undefined && a.digit}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {a.profit !== undefined && (
                    <span className={`font-mono font-bold ${a.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.profit >= 0 ? '+' : ''}{a.profit.toFixed(2)}
                    </span>
                  )}
                  {a.confidence && (
                    <span className="text-xs font-mono text-blue-300">{(a.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Create Session Modal */}
      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Session"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Session Name</label>
            <input
              type="text"
              value={newSession.name}
              onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
              placeholder="e.g., Morning Alpha"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Session Type</label>
              <select
                value={newSession.type}
                onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="day">Day Session</option>
                <option value="one-time">One-Time</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Default Stake ($)</label>
              <input
                type="number"
                step="0.01"
                value={newSession.default_stake}
                onChange={(e) => setNewSession({ ...newSession, default_stake: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">TP ($)</label>
              <input
                type="number"
                value={newSession.default_tp}
                onChange={(e) => setNewSession({ ...newSession, default_tp: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">SL ($)</label>
              <input
                type="number"
                value={newSession.default_sl}
                onChange={(e) => setNewSession({ ...newSession, default_sl: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Min Bal ($)</label>
              <input
                type="number"
                value={newSession.min_balance}
                onChange={(e) => setNewSession({ ...newSession, min_balance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Markets</label>
            <div className="flex flex-wrap gap-2">
              {availableMarkets.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const markets = newSession.markets.includes(m)
                      ? newSession.markets.filter(x => x !== m)
                      : [...newSession.markets, m];
                    setNewSession({ ...newSession, markets });
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${newSession.markets.includes(m)
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-transparent text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleCreateSession}
              disabled={creating || !newSession.name.trim()}
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

import React, { useState, useEffect } from 'react';
import { ChartPanel } from '../../components/chart/ChartPanel';
import { useSessionTicks } from '../../hooks/useSessionTicks';
import { useWebSocketEvents } from '../../hooks/useWebSocketEvents';
import { useSessionStats } from '../../hooks/useSessionStats';
import { Play, Pause, Activity, TrendingUp, DollarSign, Plus, X, Zap, Users } from 'lucide-react';
import { tradingApi } from '../../trading/tradingApi';

interface Session {
  id: string;
  name: string;
  status: string;
  markets: string[];
  type?: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
  const { ticks, loading: ticksLoading } = useSessionTicks(selectedSessionId);
  const { latestTick, latestTrade, latestSignal } = useWebSocketEvents(selectedSessionId, [activeMarket]);
  const { stats } = useSessionStats(selectedSessionId);

  // Local State for Buffers
  const [tradeMarkers, setTradeMarkers] = useState<any[]>([]);
  const [signalMarkers, setSignalMarkers] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  // Consolidate initial ticks for the chart
  const initialChartData = ticks[activeMarket] || [];

  // Fetch Sessions on Mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await tradingApi.getSessions();
      // Handle potential response formats (array or object wrapper)
      const data = Array.isArray(response) ? response : (response.data || response.sessions || []);

      if (Array.isArray(data)) {
        setSessions(data);
        if (data.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].id);
      } else {
        console.error('Unexpected sessions format:', response);
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
      // Optional: Handle 401 specifically if needed, e.g. redirect to login
    }
  };

  // Update Markers and Activity Log when events arrive
  useEffect(() => {
    if (latestTrade && latestTrade.market === activeMarket) {
      if (latestTrade.type === 'open') {
        setTradeMarkers(prev => [...prev, {
          time: Math.floor(new Date(latestTrade.timestamp).getTime() / 1000),
          type: latestTrade.side || latestTrade.signal || 'CALL',
          price: latestTrade.price || 0
        }].slice(-50));
      }

      // Add to activity log
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
      setSignalMarkers(prev => [...prev, {
        time: Math.floor(new Date().getTime() / 1000),
        type: latestSignal.side
      }].slice(-50));

      // Add signal to activity log
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
    <div className="p-4 md:p-6 space-y-6 bg-slate-900 min-h-screen text-slate-100">

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex items-center space-x-4">
          <Activity className="text-emerald-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Live Trading Sessions
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Create Session Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>

          {/* Session Selector */}
          <select
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            value={selectedSessionId || ''}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setTradeMarkers([]);
              setSignalMarkers([]);
              setActivityLog([]);
            }}
          >
            <option value="">Select Session</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>

          {/* Market Selector */}
          <select
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            value={activeMarket}
            onChange={(e) => setActiveMarket(e.target.value)}
          >
            {availableMarkets.map(m => (
              <option key={m} value={m}>{m.replace('_', ' ')}</option>
            ))}
          </select>

          {/* Status Badge */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-900 rounded-lg border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${selectedSession?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-mono uppercase">{selectedSession?.status || 'NO SESSION'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Chart Area */}
        <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="font-semibold text-slate-300 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              {activeMarket.replace('_', ' ')} Live Chart
            </h2>
            <div className="flex items-center gap-4">
              {latestTick && (
                <span className="font-mono text-emerald-400 text-lg">
                  {latestTick.tick.toFixed(activeMarket.includes('100') ? 2 : 5)}
                </span>
              )}
              {latestSignal && (
                <span className={`px-2 py-1 rounded text-xs font-bold ${latestSignal.side === 'CALL' || latestSignal.side === 'OVER' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                  }`}>
                  {latestSignal.side} {latestSignal.digit} @ {(latestSignal.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <div className="relative h-[450px] w-full bg-[#10141e]">
            {!selectedSessionId ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <Zap className="w-12 h-12 mb-4 opacity-50" />
                <p>Select or create a session to see live trading</p>
              </div>
            ) : ticksLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3"></div>
                Loading chart data...
              </div>
            ) : (
              <ChartPanel
                initialTicks={initialChartData}
                currentTick={latestTick}
                tradeMarkers={tradeMarkers}
                signalMarkers={signalMarkers}
                height={450}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stats Panel */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Session Stats
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-sm text-slate-400">P/L</span>
                <span className={`font-mono font-bold ${parseFloat(stats?.totalProfit || '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {parseFloat(stats?.totalProfit || '0') >= 0 ? '+' : ''}${stats?.totalProfit || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-sm text-slate-400">Trades</span>
                <span className="font-mono font-bold text-white">{stats?.totalTrades || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-sm text-slate-400">Win Rate</span>
                <span className="font-mono font-bold text-blue-400">{stats?.winRate || '0'}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-sm text-slate-400">Wins/Losses</span>
                <span className="font-mono font-bold">
                  <span className="text-emerald-400">{stats?.wins || 0}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-rose-400">{stats?.losses || 0}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Live Activity
            </h3>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {activityLog.map((a) => (
                <div key={a.id} className={`p-3 rounded-lg border ${a.type === 'signal' ? 'bg-blue-900/20 border-blue-500/30' :
                  a.type === 'open' ? 'bg-purple-900/20 border-purple-500/30' :
                    a.result === 'won' ? 'bg-emerald-900/20 border-emerald-500/30' :
                      'bg-rose-900/20 border-rose-500/30'
                  }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold uppercase ${a.type === 'signal' ? 'text-blue-400' :
                      a.type === 'open' ? 'text-purple-400' :
                        a.result === 'won' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                      {a.type === 'signal' ? `📡 Signal: ${a.side}` :
                        a.type === 'open' ? `🚀 Trade: ${a.side}` :
                          `${a.result === 'won' ? '✅' : '❌'} ${a.result?.toUpperCase()}`}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {a.type === 'signal' && a.confidence && (
                    <div className="text-xs text-slate-400">
                      Digit {a.digit} • {(a.confidence * 100).toFixed(0)}% confidence
                    </div>
                  )}
                  {a.profit !== undefined && (
                    <div className={`text-xs font-mono ${a.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {a.profit >= 0 ? '+' : ''}${a.profit?.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
              {activityLog.length === 0 && (
                <div className="text-center text-xs text-slate-600 py-8 italic">
                  Waiting for trading activity...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Create Trading Session
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Session Name</label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  placeholder="e.g., Morning Session"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Session Type</label>
                  <select
                    value={newSession.type}
                    onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Take Profit ($)</label>
                  <input
                    type="number"
                    value={newSession.default_tp}
                    onChange={(e) => setNewSession({ ...newSession, default_tp: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Stop Loss ($)</label>
                  <input
                    type="number"
                    value={newSession.default_sl}
                    onChange={(e) => setNewSession({ ...newSession, default_sl: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Min Balance ($)</label>
                  <input
                    type="number"
                    value={newSession.min_balance}
                    onChange={(e) => setNewSession({ ...newSession, min_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newSession.markets.includes(m)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
                        }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={creating || !newSession.name.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

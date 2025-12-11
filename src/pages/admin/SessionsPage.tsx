import React, { useState, useEffect } from 'react';
import { ChartPanel } from '../../components/chart/ChartPanel';
import { useSessionTicks } from '../../hooks/useSessionTicks';
import { useWebSocketEvents } from '../../hooks/useWebSocketEvents';
import { useSessionStats } from '../../hooks/useSessionStats';
import { Play, Pause, Activity, TrendingUp, DollarSign } from 'lucide-react';

interface Session {
  id: string;
  name: string;
  status: string;
  markets: string[];
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeMarket, setActiveMarket] = useState<string>('R_100');

  // Hooks
  const { ticks, loading: ticksLoading } = useSessionTicks(selectedSessionId);
  const { latestTick, latestTrade, latestSignal } = useWebSocketEvents(selectedSessionId, [activeMarket]);
  const { stats } = useSessionStats(selectedSessionId);

  // Local State for Buffers
  const [tradeMarkers, setTradeMarkers] = useState<any[]>([]);
  const [signalMarkers, setSignalMarkers] = useState<any[]>([]);

  // Consolidate initial ticks for the chart
  const initialChartData = ticks[activeMarket] || [];

  // Fetch Sessions on Mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trading/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSessions(data.data);
          if (data.data.length > 0) setSelectedSessionId(data.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load sessions', err);
      }
    };
    fetchSessions();
  }, []);

  // Update Markers when events arrive
  useEffect(() => {
    if (latestTrade && latestTrade.market === activeMarket && latestTrade.type === 'open') {
      setTradeMarkers(prev => [...prev, {
        time: Math.floor(new Date(latestTrade.timestamp).getTime() / 1000),
        type: latestTrade.side || latestTrade.signal || 'CALL', // 'buy', 'sell', 'CALL', 'PUT'
        price: latestTrade.price || 0
      }].slice(-50)); // Keep last 50
    }
  }, [latestTrade, activeMarket]);

  useEffect(() => {
    if (latestSignal && latestSignal.market === activeMarket) {
      setSignalMarkers(prev => [...prev, {
        time: Math.floor(new Date().getTime() / 1000), // Signals might not have timestamp
        type: latestSignal.side // 'CALL', 'PUT'
      }].slice(-50));
    }
  }, [latestSignal, activeMarket]);


  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen text-slate-100">

      {/* Header & Controls */}
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex items-center space-x-4">
          <Activity className="text-emerald-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Live Trading Session
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <select
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            value={selectedSessionId || ''}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setTradeMarkers([]);
              setSignalMarkers([]);
            }}
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900 rounded-lg border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${selectedSession?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-mono uppercase">{selectedSession?.status || 'OFFLINE'}</span>
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
              {activeMarket} Chart
            </h2>
            {latestTick && (
              <span className="font-mono text-emerald-400 text-lg">
                {latestTick.tick.toFixed(activeMarket.includes('100') ? 2 : 5)}
              </span>
            )}
          </div>

          <div className="relative h-[500px] w-full bg-[#10141e]">
            {ticksLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                Loading historical data...
              </div>
            ) : (
              <ChartPanel
                initialTicks={initialChartData}
                currentTick={latestTick}
                tradeMarkers={tradeMarkers}
                signalMarkers={signalMarkers}
                height={500}
              />
            )}

            {/* Overlay Stats (Deriv Style) */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/10">
              <div className="text-xs text-slate-400 uppercase mb-1">Last Signal</div>
              <div className={`text-sm font-bold ${latestSignal?.side === 'CALL' ? 'text-blue-400' : 'text-orange-400'}`}>
                {latestSignal ? `${latestSignal.side} (${(latestSignal.confidence * 100).toFixed(0)}%)` : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Session Stats</h3>

            <div className="space-y-4">
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

            <div className="mt-6 pt-6 border-t border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Recent Activity</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {tradeMarkers.slice().reverse().map((t, i) => (
                  <div key={i} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded border border-slate-700/50">
                    <span className={t.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                      {t.type.toUpperCase()}
                    </span>
                    <span className="text-slate-400">
                      {new Date(t.time * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {tradeMarkers.length === 0 && (
                  <div className="text-center text-xs text-slate-600 py-4 italic">No trades yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

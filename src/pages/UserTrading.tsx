/**
 * User Trading Dashboard - Liquid Glass Renovation
 * Simple, high-contrast, text-based interface for users.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Play, Shield, Activity, BarChart2 } from 'lucide-react';
import { tradingApi } from '../trading/tradingApi';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useWebSocketEvents } from '../hooks/useWebSocketEvents';

// Glass UI
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { GlassCard } from '../components/ui/glass/GlassCard';
import { GlassButton } from '../components/ui/glass/GlassButton';
import { GlassStatusBadge } from '../components/ui/glass/GlassStatusBadge';
import { GlassMetricTile } from '../components/ui/glass/GlassMetricTile';
import { GlassTable } from '../components/ui/glass/GlassTable';


const UserTrading = () => {


  const { sessions } = useSessionManagement();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [sessionStatus, setSessionStatus] = useState('waiting');
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  // Real-time hooks
  const { latestTrade } = useWebSocketEvents(activeSession?.id, ['R_100', 'R_75', 'R_50', 'R_25', 'R_10']);

  useEffect(() => {
    loadUserData();
    loadAvailableSessions();
    loadActiveSession();
  }, []);

  // Update trade history from real-time events
  useEffect(() => {
    if (activeSession && latestTrade) {
      // Determine display values based on trade event
      const isWin = latestTrade.result === 'won';
      const isLoss = latestTrade.result === 'lost';
      const side = latestTrade.side || latestTrade.signal || 'CALL';

      const newTrade = {
        id: Date.now(),
        type: side.toUpperCase(),
        symbol: latestTrade.market,
        price: latestTrade.price,
        profit: latestTrade.profit,
        status: isWin ? 'WIN' : isLoss ? 'LOSS' : 'OPEN',
        time: new Date().toISOString()
      };

      setTradeHistory(prev => [newTrade, ...prev].slice(0, 50));
    }
  }, [latestTrade, activeSession]);

  // Sync with real-time session updates
  useEffect(() => {
    if (activeSession && sessions.length > 0) {
      const updated = sessions.find(s => s.id === activeSession.id);
      if (updated) {
        setActiveSession(prev => ({ ...prev, ...updated }));
        setSessionStatus(updated.status === 'running' ? 'active' : updated.status);
      }
    }
  }, [sessions, activeSession?.id]);

  const loadUserData = async () => {
    try {
      const derivId = sessionStorage.getItem('derivId');
      const balance = sessionStorage.getItem('balance');
      const currency = sessionStorage.getItem('currency');

      let currentInfo = {
        derivId,
        id: null,
        balance: parseFloat(balance || '0') || 0,
        currency: currency || 'USD'
      };

      const response = await tradingApi.getAccounts();
      if (response && response.data && response.data.length > 0) {
        const activeAccount = response.data.find((acc: any) => acc.is_active) || response.data[0];
        if (activeAccount) {
          currentInfo.id = activeAccount.id;
          currentInfo.derivId = activeAccount.deriv_account_id;
          currentInfo.balance = activeAccount.balance;
          currentInfo.currency = activeAccount.currency;
        }
      }
      setUserInfo(currentInfo);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadAvailableSessions = async () => {
    try {
      const response = await tradingApi.getSessions();
      const sessionList = Array.isArray(response) ? response : (response.data || response.sessions || []);
      setAvailableSessions(Array.isArray(sessionList) ? sessionList : []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadActiveSession = async () => {
    try {
      const session = await tradingApi.getMyActiveSession();
      if (session) {
        setActiveSession(session);
        setTakeProfit(session.user_tp || '');
        setStopLoss(session.user_sl || '');
        setSessionStatus(session.status);
        // Trade history will populate via websocket events
      }
    } catch (error) {
      console.error('Failed to load active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSession = async (sessionId) => {
    if (!takeProfit || !stopLoss) {
      alert('Please set your Take Profit and Stop Loss first');
      return;
    }
    try {
      await tradingApi.acceptSession({
        sessionId,
        accountId: userInfo?.id,
        takeProfit: parseFloat(takeProfit),
        stopLoss: parseFloat(stopLoss)
      });
      alert('Session accepted successfully!');
      loadActiveSession();
      loadAvailableSessions();
    } catch (error) {
      console.error('Failed to accept session:', error);
      alert('Failed to accept session.');
    }
  };

  const handleUpdateTPSL = async () => {
    if (!activeSession) return;
    try {
      await tradingApi.updateUserTPSL({
        sessionId: activeSession.id,
        takeProfit: parseFloat(takeProfit),
        stopLoss: parseFloat(stopLoss)
      });
      alert('TP/SL updated successfully!');
    } catch (error) {
      console.error('Failed to update TP/SL:', error);
      alert('Failed to update TP/SL');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-white">Loading...</div>;
  }

  return (
    <DashboardLayout isAdmin={false}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassMetricTile
            label="Account Balance"
            value={`${userInfo?.currency} ${userInfo?.balance?.toFixed(2)}`}
            icon={<DollarSign size={20} />}
          />

          <GlassCard className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Session Status</p>
              <GlassStatusBadge status={sessionStatus === 'active' || sessionStatus === 'running' ? 'active' : 'inactive'}>
                {sessionStatus.toUpperCase()}
              </GlassStatusBadge>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 border border-blue-500/20">
              <Shield size={24} />
            </div>
          </GlassCard>

          {/* System Health Monitor */}
          {activeSession?.health && (
            <GlassCard className={`flex items-center justify-between border-l-4 ${activeSession.health.status === 'active' ? 'border-l-emerald-500' : 'border-l-orange-500'
              }`}>
              <div>
                <p className="text-slate-400 text-sm mb-1">System Health</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeSession.health.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                  <h2 className="text-lg font-bold text-white tracking-wide">{activeSession.health.status.toUpperCase()}</h2>
                </div>
              </div>
              <div className={`p-3 rounded-full border ${activeSession.health.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                <Activity size={24} />
              </div>
            </GlassCard>
          )}
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left Column: Risk Management */}
          <div className="space-y-8">
            <GlassCard>
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                <Shield className="text-blue-400" />
                <h3 className="text-xl font-bold text-white">Risk Management</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">Take Profit Target</label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                    <input
                      type="number"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono focus:border-emerald-500/50 focus:outline-none transition-all shadow-inner"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">Stop Loss Limit</label>
                  <div className="relative">
                    <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                    <input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono focus:border-red-500/50 focus:outline-none transition-all shadow-inner"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {activeSession && (
                  <GlassButton onClick={handleUpdateTPSL} className="w-full mt-4" variant="primary">
                    Update Risk Limits
                  </GlassButton>
                )}
              </div>
            </GlassCard>

            {/* Trade History - Text Based */}
            {activeSession && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                  <Activity className="text-purple-400" />
                  <h3 className="text-xl font-bold text-white">Recent Trades</h3>
                </div>
                <GlassTable
                  data={tradeHistory}
                  keyExtractor={(bs) => bs.id}
                  columns={[
                    { header: 'Time', accessor: (row) => new Date(row.time).toLocaleTimeString(), className: 'text-slate-500' },
                    { header: 'Type', accessor: (row) => <span className={row.type === 'CALL' ? 'text-emerald-400' : 'text-red-400'}>{row.type}</span> },
                    { header: 'Stake', accessor: (row) => `$${row.price.toFixed(2)}` },
                    {
                      header: 'Result', accessor: (row) => (
                        <span className={row.profit >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {row.profit >= 0 ? '+' : ''}{row.profit.toFixed(2)}
                        </span>
                      )
                    }
                  ]}
                  emptyMessage="No trades in this session yet"
                />
              </GlassCard>
            )}
          </div>

          {/* Right Column: Active/Available Sessions */}
          <div className="space-y-6">
            {!activeSession ? (
              <GlassCard>
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                  <Play className="text-emerald-400" />
                  <h3 className="text-xl font-bold text-white">Available Sessions</h3>
                </div>

                {availableSessions.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <AlertCircle className="mx-auto text-slate-500 mb-2" />
                    <p className="text-slate-400">No sessions available right now.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableSessions.map(session => (
                      <div key={session.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div>
                            <h4 className="font-bold text-white text-lg tracking-wide">{session.session_name}</h4>
                            <p className="text-sm text-slate-400 mt-1">{session.strategy_name}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-blue-500/20">
                            {session.session_type}
                          </span>
                        </div>
                        <GlassButton
                          onClick={() => handleAcceptSession(session.id)}
                          className="w-full relative z-10"
                          disabled={!takeProfit || !stopLoss}
                        >
                          Join Session
                        </GlassButton>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            ) : (
              <GlassCard className="border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                      <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Active Session</h3>
                      <p className="text-xs text-emerald-400/80 font-mono tracking-wider">LIVE DATA FEED</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-300 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    {activeSession.session_name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <GlassMetricTile
                    label="Total Trades"
                    value={activeSession.total_trades || 0}
                    icon={<BarChart2 size={16} />}
                    className="bg-black/20"
                  />
                  <GlassMetricTile
                    label="Win Rate"
                    value={`${activeSession.total_trades > 0
                      ? ((activeSession.winning_trades / activeSession.total_trades) * 100).toFixed(0)
                      : 0}%`}
                    icon={<TrendingUp size={16} />}
                    className="bg-black/20"
                    trend={(activeSession.winning_trades / (activeSession.total_trades || 1)) > 0.5 ? 'up' : 'down'}
                  />

                  <div className="col-span-2">
                    <GlassMetricTile
                      label="Net Profit"
                      value={`${userInfo?.currency} ${activeSession.net_pnl?.toFixed(2) || '0.00'}`}
                      icon={<DollarSign size={16} />}
                      trend={activeSession.net_pnl >= 0 ? 'up' : 'down'}
                      className="bg-gradient-to-br from-white/5 to-white/[0.02]"
                    />
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserTrading;

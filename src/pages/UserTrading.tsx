import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Play, Shield, Activity, BarChart2, Zap, Clock, Target, Radio } from 'lucide-react';
import { tradingApi } from '../trading/tradingApi';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useWebSocketEvents } from '../hooks/useWebSocketEvents';
import { useAuth } from '../contexts/AuthContext';
import { GlassToggle } from '../components/ui/glass/GlassToggle';

// Glass UI
// import { DashboardLayout } from '../components/layout/DashboardLayout';
import { GlassCard } from '../components/ui/glass/GlassCard';
import { GlassButton } from '../components/ui/glass/GlassButton';
import { GlassStatusBadge } from '../components/ui/glass/GlassStatusBadge';
import { GlassMetricTile } from '../components/ui/glass/GlassMetricTile';
import { GlassTable } from '../components/ui/glass/GlassTable';
import LiveSessionFeed from '../components/trading/LiveSessionFeed';
import { realtimeSocket } from '../services/realtimeSocket';

// Active trade state for Deriv-style visualization
interface ActiveTrade {
  id: string;
  contractId?: string;
  side: string;
  digit: number;
  stake: number;
  market: string;
  status: 'pending' | 'open' | 'won' | 'lost';
  entryPrice?: number;
  currentPrice?: number;
  potentialPayout?: number;
  ticksElapsed: number;
  totalTicks: number;
  startTime: Date;
  profit?: number;
}

const UserTrading = () => {


  const { user } = useAuth();
  const { sessions } = useSessionManagement();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [tradingMode, setTradingMode] = useState<'real' | 'demo'>('real');
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [sessionStatus, setSessionStatus] = useState('waiting');
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showLiveFeed, setShowLiveFeed] = useState(false);

  // Real-time hooks
  const { latestTick, latestTrade, latestSignal } = useWebSocketEvents(activeSession?.id, ['R_100', 'R_75', 'R_50', 'R_25', 'R_10']);

  useEffect(() => {
    loadUserData();
    loadAvailableSessions();
    loadActiveSession();
  }, []);

  // Track active trade from signals
  useEffect(() => {
    if (activeSession && latestSignal) {
      // New signal received - show pending trade
      setActiveTrade({
        id: `signal-${Date.now()}`,
        side: latestSignal.side || 'OVER',
        digit: latestSignal.digit || 0,
        stake: 0.35,
        market: latestSignal.market || 'R_100',
        status: 'pending',
        ticksElapsed: 0,
        totalTicks: 5,
        startTime: new Date()
      });
    }
  }, [latestSignal, activeSession]);

  // Update trade history and active trade from real-time events
  useEffect(() => {
    if (activeSession && latestTrade) {
      // Determine display values based on trade event
      const isWin = latestTrade.result === 'won';
      const isLoss = latestTrade.result === 'lost';
      const isOpen = latestTrade.type === 'open';
      const side = latestTrade.side || latestTrade.signal || 'CALL';

      // Update active trade visualization
      if (isOpen) {
        setActiveTrade(prev => ({
          ...prev,
          id: latestTrade.contractId || prev?.id || `trade-${Date.now()}`,
          contractId: latestTrade.contractId,
          status: 'open',
          entryPrice: latestTrade.price,
          potentialPayout: latestTrade.payout,
          stake: latestTrade.stake || 0.35,
          side,
          market: latestTrade.market || prev?.market || 'R_100',
          digit: latestTrade.digit || prev?.digit || 0,
          ticksElapsed: 1,
          totalTicks: 5,
          startTime: prev?.startTime || new Date()
        } as ActiveTrade));
      } else if (isWin || isLoss) {
        // Trade completed - update and animate
        setActiveTrade(prev => prev ? {
          ...prev,
          status: isWin ? 'won' : 'lost',
          profit: latestTrade.profit,
          ticksElapsed: 5,
          currentPrice: latestTrade.exitPrice
        } : null);

        // Clear active trade after animation delay
        setTimeout(() => setActiveTrade(null), 3000);

        // Add to history
        const newTrade = {
          id: Date.now(),
          type: side.toUpperCase(),
          symbol: latestTrade.market,
          price: latestTrade.price,
          profit: latestTrade.profit,
          status: isWin ? 'WIN' : 'LOSS',
          time: new Date().toISOString()
        };
        setTradeHistory(prev => [newTrade, ...prev].slice(0, 50));
      }

      // Add to activity log
      setActivityLog(prev => [{
        id: Date.now(),
        type: isOpen ? 'trade_open' : 'trade_close',
        side: side,
        market: latestTrade.market,
        profit: latestTrade.profit,
        result: latestTrade.result,
        timestamp: latestTrade.timestamp || new Date().toISOString()
      }, ...prev].slice(0, 50));
    }
  }, [latestTrade, activeSession]);

  // Add signals to activity log
  useEffect(() => {
    if (activeSession && latestSignal) {
      setActivityLog(prev => [{
        id: Date.now(),
        type: 'signal',
        side: latestSignal.side,
        digit: latestSignal.digit,
        market: latestSignal.market,
        confidence: latestSignal.confidence,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50));
    }
  }, [latestSignal, activeSession]);

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
      const response = await tradingApi.getAccounts();
      if (response && response.data) {
        setAllAccounts(response.data);

        let initialAccount;
        const persistedId = sessionStorage.getItem('activeAccountId');
        if (persistedId) {
          initialAccount = response.data.find((acc: any) => acc.id === persistedId);
        }

        if (!initialAccount) {
          // Default to Real account or first available
          const realAccount = response.data.find((acc: any) => acc.account_type === 'real');
          const demoAccount = response.data.find((acc: any) => acc.account_type === 'demo');
          initialAccount = realAccount || demoAccount || response.data[0];
        }

        if (initialAccount) {
          updateUserInfo(initialAccount);
          setTradingMode(initialAccount.account_type === 'demo' ? 'demo' : 'real');
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const updateUserInfo = (account: any) => {
    setUserInfo({
      id: account.id,
      derivId: account.deriv_account_id,
      balance: parseFloat(account.balance),
      currency: account.currency
    });
  };

  const toggleTradingMode = (mode: 'real' | 'demo') => {
    setTradingMode(mode);
    const targetAccount = allAccounts.find(acc => acc.account_type === mode);
    if (targetAccount) {
      updateUserInfo(targetAccount);
      sessionStorage.setItem('activeAccountId', targetAccount.id); // Persist for reloading
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
        setShowLiveFeed(true);  // Show live feed when user has active session
        // Trade history will populate via websocket events
      }
    } catch (error) {
      console.error('Failed to load active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSession = async (sessionId: string, sessionDefaults?: { default_tp: number; default_sl: number }) => {
    if (!takeProfit || !stopLoss) {
      alert('Please set your Take Profit and Stop Loss first');
      return;
    }

    const userTP = parseFloat(takeProfit);
    const userSL = parseFloat(stopLoss);

    // Validate TP/SL against session defaults
    if (sessionDefaults) {
      const maxTP = sessionDefaults.default_tp || 100;
      const maxSL = sessionDefaults.default_sl || 50;

      if (userTP > maxTP) {
        alert(`Take Profit cannot exceed session limit of $${maxTP}`);
        return;
      }
      if (userSL > maxSL) {
        alert(`Stop Loss cannot exceed session limit of $${maxSL}`);
        return;
      }
    }

    try {
      await tradingApi.acceptSession({
        sessionId,
        accountId: userInfo?.id,
        takeProfit: userTP,
        stopLoss: userSL
      });
      // Show live feed and reload
      setShowLiveFeed(true);
      setActivityLog(prev => [{
        id: Date.now(),
        type: 'session_joined',
        message: 'Successfully joined trading session',
        timestamp: new Date().toISOString()
      }, ...prev]);
      await loadActiveSession();
      await loadAvailableSessions();
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

  const handleLeaveSession = async () => {
    if (!activeSession) return;
    if (!confirm('Are you sure you want to leave this session?')) return;

    try {
      await tradingApi.leaveSession(activeSession.id);
      setActiveSession(null);
      setShowLiveFeed(false);
      setActivityLog([]);
      setTradeHistory([]);
      await loadAvailableSessions();
      alert('Successfully left the session');
    } catch (error) {
      console.error('Failed to leave session:', error);
      alert('Failed to leave session');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-white">Loading...</div>;
  }

  // Get the current market for the session
  const sessionMarket = activeSession?.volatility_index || activeSession?.markets?.[0] || 'R_100';

  // FULL-SCREEN LIVE FEED VIEW - When user has active session
  if (activeSession && showLiveFeed) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Session Header */}
        <GlassCard className="border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{activeSession.session_name || activeSession.name || 'Trading Session'}</h2>
                <p className="text-sm text-emerald-400 font-mono">LIVE SESSION ACTIVE</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500">Your TP / SL</div>
                <div className="text-sm">
                  <span className="text-emerald-400 font-bold">${activeSession.user_tp || takeProfit || '-'}</span>
                  <span className="text-slate-500"> / </span>
                  <span className="text-red-400 font-bold">${activeSession.user_sl || stopLoss || '-'}</span>
                </div>
              </div>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={handleLeaveSession}
              >
                Leave Session
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Session Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard className="text-center">
            <div className="text-3xl font-bold text-white font-mono">{activeSession.total_trades || 0}</div>
            <div className="text-xs text-slate-500 uppercase">Total Trades</div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="text-3xl font-bold text-emerald-400 font-mono">{activeSession.wins || 0}</div>
            <div className="text-xs text-slate-500 uppercase">Wins</div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="text-3xl font-bold text-red-400 font-mono">{activeSession.losses || 0}</div>
            <div className="text-xs text-slate-500 uppercase">Losses</div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className={`text-3xl font-bold font-mono ${(activeSession.net_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(activeSession.net_pnl || 0) >= 0 ? '+' : ''}${(activeSession.net_pnl || 0).toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 uppercase">Net P&L</div>
          </GlassCard>
        </div>

        {/* Active Trade Progress */}
        {activeTrade && (
          <GlassCard className={`border-2 ${activeTrade.status === 'won' ? 'border-emerald-500 bg-emerald-500/10' :
            activeTrade.status === 'lost' ? 'border-red-500 bg-red-500/10' :
              'border-blue-500 bg-blue-500/5 animate-pulse'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className={activeTrade.status === 'open' ? 'text-blue-400 animate-pulse' : 'text-slate-400'} size={24} />
                <div>
                  <div className="text-lg font-bold text-white">{activeTrade.side} {activeTrade.digit}</div>
                  <div className="text-xs text-slate-500">{activeTrade.market}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono ${activeTrade.status === 'won' ? 'text-emerald-400' :
                  activeTrade.status === 'lost' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                  {activeTrade.status === 'won' ? '+' : activeTrade.status === 'lost' ? '-' : ''}
                  ${activeTrade.profit?.toFixed(2) || activeTrade.stake?.toFixed(2) || '0.35'}
                </div>
                <div className="text-xs text-slate-500">{activeTrade.status.toUpperCase()}</div>
              </div>
            </div>
            {activeTrade.status === 'open' && (
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((activeTrade.ticksElapsed || 0) / (activeTrade.totalTicks || 5)) * 100}%` }}
                />
              </div>
            )}
          </GlassCard>
        )}

        {/* Enhanced Live Session Feed Component */}
        <LiveSessionFeed
          sessionId={activeSession.id}
          sessionName={activeSession.session_name || activeSession.name || 'Trading Session'}
          market={sessionMarket}
          latestTick={latestTick}
          latestSignal={latestSignal}
          latestTrade={latestTrade}
          isConnected={realtimeSocket.isConnected()}
          activityLog={activityLog}
          onClearLog={() => setActivityLog([])}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">

      {/* Live Trade Progress - Deriv Bot Style */}
      {activeTrade && (
        <GlassCard className={`relative overflow-hidden border-2 transition-all duration-500 ${activeTrade.status === 'won' ? 'border-emerald-500 bg-emerald-500/10' :
          activeTrade.status === 'lost' ? 'border-red-500 bg-red-500/10' :
            activeTrade.status === 'open' ? 'border-blue-500 bg-blue-500/5' :
              'border-amber-500/50 bg-amber-500/5'
          }`}>
          {/* Animated background */}
          <div className={`absolute inset-0 opacity-20 ${activeTrade.status === 'pending' ? 'animate-pulse bg-gradient-to-r from-amber-500/20 to-transparent' :
            activeTrade.status === 'open' ? 'animate-pulse bg-gradient-to-r from-blue-500/20 to-transparent' :
              ''
            }`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${activeTrade.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                  activeTrade.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                    activeTrade.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                  }`}>
                  {activeTrade.status === 'pending' ? <Clock size={24} className="animate-spin" /> :
                    activeTrade.status === 'open' ? <Zap size={24} className="animate-pulse" /> :
                      activeTrade.status === 'won' ? <CheckCircle size={24} /> :
                        <XCircle size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">
                      {activeTrade.status === 'pending' ? 'Processing Signal...' :
                        activeTrade.status === 'open' ? 'Trade Active' :
                          activeTrade.status === 'won' ? 'Trade Won!' : 'Trade Lost'}
                    </span>
                    {activeTrade.contractId && (
                      <span className="text-xs font-mono text-slate-500">#{activeTrade.contractId.slice(-8)}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Target size={14} />
                    <span>{activeTrade.side} {activeTrade.digit}</span>
                    <span className="text-slate-600">•</span>
                    <span>{activeTrade.market}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Stake</div>
                <div className="text-lg font-mono text-white">${activeTrade.stake.toFixed(2)}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{activeTrade.ticksElapsed}/{activeTrade.totalTicks} ticks</span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${activeTrade.status === 'won' ? 'bg-emerald-500' :
                    activeTrade.status === 'lost' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                  style={{ width: `${(activeTrade.ticksElapsed / activeTrade.totalTicks) * 100}%` }}
                />
              </div>
            </div>

            {/* Result Display */}
            {(activeTrade.status === 'won' || activeTrade.status === 'lost') && activeTrade.profit !== undefined && (
              <div className={`text-center py-3 rounded-lg ${activeTrade.status === 'won' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                <span className={`text-2xl font-bold font-mono ${activeTrade.status === 'won' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                  {activeTrade.profit >= 0 ? '+' : ''}${activeTrade.profit.toFixed(2)}
                </span>
              </div>
            )}

            {activeTrade.status === 'open' && activeTrade.potentialPayout && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Potential Payout:</span>
                <span className="text-emerald-400 font-mono">${activeTrade.potentialPayout.toFixed(2)}</span>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Live Session Feed - Shows after accepting session */}
      {activeSession && (showLiveFeed || activityLog.length > 0) && (
        <GlassCard className="border-l-4 border-l-emerald-500 max-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-full">
                <Radio className="text-emerald-400 animate-pulse" size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Live Session Feed
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded animate-pulse">
                    {sessionStatus.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Real-time trade execution updates</p>
              </div>
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

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {activityLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 opacity-50">
                <Activity size={32} className="mb-2" />
                <p className="text-sm">Waiting for trading activity...</p>
                <p className="text-xs mt-1">Trades and signals will appear here</p>
              </div>
            ) : (
              activityLog.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all ${item.type === 'signal'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : item.type === 'session_joined'
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : item.result === 'won'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : item.result === 'lost'
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${item.type === 'signal'
                          ? 'bg-blue-500/20 text-blue-400'
                          : item.type === 'session_joined'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.result === 'won'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.result === 'lost'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-slate-500/20 text-slate-300'
                          }`}
                      >
                        {item.type === 'signal' ? 'SIGNAL' : item.type === 'session_joined' ? 'JOINED' : 'TRADE'}
                      </span>
                      {item.side && (
                        <span className="text-sm font-medium text-white">
                          {item.side} {item.digit !== undefined && item.digit}
                        </span>
                      )}
                      {item.message && (
                        <span className="text-sm text-emerald-400">{item.message}</span>
                      )}
                      {item.market && (
                        <span className="text-xs text-slate-500">{item.market}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {item.profit !== undefined && (
                    <span className={`font-mono font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}
                    </span>
                  )}
                  {item.confidence !== undefined && (
                    <span className="text-xs font-mono text-blue-300">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </GlassCard>
      )}

      {/* Top Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassMetricTile
          label="Account Balance"
          value={`${userInfo?.currency} ${userInfo?.balance?.toFixed(2)}`}
          icon={<DollarSign size={20} />}
        />

        {/* Admin Trading Mode Toggle */}
        {user?.is_admin && (
          <GlassCard className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Trading Mode</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${tradingMode === 'real' ? 'text-emerald-400' : 'text-slate-500'}`}>REAL</span>
                <GlassToggle
                  checked={tradingMode === 'demo'}
                  onChange={() => toggleTradingMode(tradingMode === 'real' ? 'demo' : 'real')}
                />
                <span className={`text-sm font-bold ${tradingMode === 'demo' ? 'text-blue-400' : 'text-slate-500'}`}>DEMO</span>
              </div>
            </div>
          </GlassCard>
        )}

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
                  {availableSessions.map(session => {
                    const winRate = session.total_trades > 0
                      ? ((session.winning_trades / session.total_trades) * 100).toFixed(0)
                      : 0;
                    const marketName = session.volatility_index || session.markets?.[0] || 'R_100';
                    const sessionType = session.session_type || 'day';
                    const isRecovery = sessionType === 'recovery';
                    const isRunning = session.status === 'running';

                    return (
                      <div
                        key={session.id}
                        className={`bg-white/5 border rounded-2xl p-5 hover:bg-white/10 transition-all group relative overflow-hidden ${isRecovery
                          ? 'border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                          : 'border-white/10'
                          }`}
                      >
                        {/* Background gradient based on session type */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${isRecovery
                          ? 'bg-gradient-to-r from-purple-500/10 to-transparent'
                          : 'bg-gradient-to-r from-emerald-500/5 to-transparent'
                          }`} />

                        {/* Header: Session Name + Type Badge */}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg tracking-wide">
                              {session.session_name || session.name || 'Trading Session'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">{marketName}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-xs text-slate-500">
                                {session.mode === 'real' ? '🟢 Real' : '🔵 Demo'}
                              </span>
                            </div>
                            {/* Session Description */}
                            {session.description && (
                              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{session.description}</p>
                            )}
                          </div>

                          {/* Session Type Badge */}
                          <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border ${isRecovery
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : sessionType === 'one_time'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            }`}>
                            {isRecovery ? '♻️ Recovery' : sessionType === 'one_time' ? '⚡ One-Time' : '📅 Day'}
                          </span>
                        </div>

                        {/* Stats Grid - Show for running sessions */}
                        {isRunning && (
                          <div className="grid grid-cols-3 gap-3 mb-4 relative z-10">
                            <div className="bg-black/20 rounded-lg p-2 text-center">
                              <div className="text-lg font-bold text-white">{session.total_trades || 0}</div>
                              <div className="text-[10px] text-slate-500 uppercase">Trades</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-2 text-center">
                              <div className={`text-lg font-bold ${Number(winRate) >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {winRate}%
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase">Win Rate</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-2 text-center">
                              <div className={`text-lg font-bold font-mono ${(session.net_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {(session.net_pnl || 0) >= 0 ? '+' : ''}${(session.net_pnl || 0).toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase">P&L</div>
                            </div>
                          </div>
                        )}

                        {/* Requirements Row - Always visible */}
                        <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
                          <div className="bg-black/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 mb-1">Min Balance</div>
                            <div className="text-white font-bold text-sm">
                              ${session.minimum_balance || session.min_balance || 5}
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 mb-1">Default TP</div>
                            <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1">
                              <TrendingUp size={12} />
                              ${session.profit_threshold || session.default_tp || 10}
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 mb-1">Default SL</div>
                            <div className="text-red-400 font-bold text-sm flex items-center justify-center gap-1">
                              <TrendingDown size={12} />
                              ${session.loss_threshold || session.default_sl || 5}
                            </div>
                          </div>
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center justify-between text-xs mb-4 relative z-10">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            <span className={`font-bold ${isRunning ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {session.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                          {session.participant_count !== undefined && (
                            <span className="text-slate-500">
                              👥 {session.participant_count || 0} participants
                            </span>
                          )}
                        </div>

                        {/* Recovery Session Notice */}
                        {isRecovery && (
                          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 relative z-10">
                            <strong>Recovery Session:</strong> This session is designed to help recover losses from previous sessions with adjusted risk parameters.
                          </div>
                        )}

                        {/* Join Button */}
                        <GlassButton
                          onClick={() => handleAcceptSession(session.id, {
                            default_tp: session.profit_threshold || session.default_tp || 10,
                            default_sl: session.loss_threshold || session.default_sl || 5
                          })}
                          className="w-full relative z-10"
                          disabled={!takeProfit || !stopLoss}
                          variant={isRecovery ? 'secondary' : 'primary'}
                        >
                          <CheckCircle size={16} className="mr-2" />
                          {!takeProfit || !stopLoss
                            ? 'Set TP/SL First'
                            : isRunning
                              ? '✓ Accept Trading Session'
                              : '✓ Accept Trading Session'}
                        </GlassButton>

                        {(!takeProfit || !stopLoss) && (
                          <p className="text-[10px] text-amber-400 text-center mt-2 relative z-10">
                            ⚠️ Set your Take Profit and Stop Loss on the left before joining
                          </p>
                        )}
                      </div>
                    );
                  })}
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
                  {activeSession.session_name || activeSession.name || 'Trading Session'}
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
  );
};

export default UserTrading;

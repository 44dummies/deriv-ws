import { CONFIG, MARKETS } from '../config/constants';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Play, Shield, Activity, Zap, Clock, Target, Radio } from 'lucide-react';
import { tradingApi } from '../trading/tradingApi';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useWebSocketEvents } from '../hooks/useWebSocketEvents';
import { useAuth } from '../contexts/AuthContext';
import { GlassToggle } from '../components/ui/glass/GlassToggle';

// Glass UI
import { GlassCard } from '../components/ui/glass/GlassCard';
import { GlassButton } from '../components/ui/glass/GlassButton';
import { GlassStatusBadge } from '../components/ui/glass/GlassStatusBadge';
import { GlassMetricTile } from '../components/ui/glass/GlassMetricTile';
import { GlassTable } from '../components/ui/glass/GlassTable';
import LiveSessionFeed from '../components/trading/LiveSessionFeed';
import { TradingLoader } from '../components/ui/TradingLoader';
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

  // Real-time hooks
  const { latestTick, latestTrade, latestSignal } = useWebSocketEvents(activeSession?.id, CONFIG.TRADING.MARKET_TIERS as unknown as string[]);

  useEffect(() => {
    loadUserData();
    loadAvailableSessions();
    loadActiveSession();
  }, []);

  // Track active trade from signals
  useEffect(() => {
    if (activeSession && latestSignal) {
      setActiveTrade({
        id: `signal-${Date.now()}`,
        side: latestSignal.side || 'OVER',
        digit: latestSignal.digit || 0,
        stake: CONFIG.TRADING.DEFAULT_STAKE,
        market: latestSignal.market || CONFIG.TRADING.DEFAULT_MARKET,
        status: 'pending',
        ticksElapsed: 0,
        totalTicks: CONFIG.TRADING.DEFAULT_DURATION,
        startTime: new Date()
      });
    }
  }, [latestSignal, activeSession]);

  // Update trade history and active trade from real-time events
  useEffect(() => {
    if (activeSession && latestTrade) {
      const isWin = latestTrade.result === 'won';
      const isLoss = latestTrade.result === 'lost';
      const isOpen = latestTrade.type === 'open';
      const side = latestTrade.side || latestTrade.signal || 'CALL';

      if (isOpen) {
        setActiveTrade(prev => ({
          ...prev,
          id: latestTrade.contractId || prev?.id || `trade-${Date.now()}`,
          contractId: latestTrade.contractId,
          status: 'open',
          entryPrice: latestTrade.price,
          potentialPayout: latestTrade.payout,
          stake: latestTrade.stake || CONFIG.TRADING.DEFAULT_STAKE,
          side,
          market: latestTrade.market || prev?.market || CONFIG.TRADING.DEFAULT_MARKET,
          digit: latestTrade.digit || prev?.digit || 0,
          ticksElapsed: 1,
          totalTicks: CONFIG.TRADING.DEFAULT_DURATION,
          startTime: prev?.startTime || new Date()
        } as ActiveTrade));
      } else if (isWin || isLoss) {
        setActiveTrade(prev => prev ? {
          ...prev,
          status: isWin ? 'won' : 'lost',
          profit: latestTrade.profit,
          ticksElapsed: 5,
          currentPrice: latestTrade.exitPrice
        } : null);

        setTimeout(() => setActiveTrade(null), 3000);

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

  // Sync with real-time session updates
  useEffect(() => {
    const handleSessionUpdate = (data: any) => {
      const session = data.session || data;
      // If we don't have an active session, take this one if it's running
      // If we do have one, update it if IDs match
      if (!activeSession && session.status === 'running') {
        setActiveSession(session);
        setSessionStatus('active');
      } else if (activeSession && session.id === activeSession.id) {
        setActiveSession((prev: any) => ({ ...prev, ...session }));
        setSessionStatus(session.status === 'running' ? 'active' : session.status);
      }
    };

    realtimeSocket.on('session_update', handleSessionUpdate);
    realtimeSocket.on('session_status', handleSessionUpdate);
    realtimeSocket.on('session_started', handleSessionUpdate);

    return () => {
      realtimeSocket.off('session_update', handleSessionUpdate);
      realtimeSocket.off('session_status', handleSessionUpdate);
      realtimeSocket.off('session_started', handleSessionUpdate);
    };
  }, [activeSession]);

  const loadUserData = async () => {
    try {
      const response = await tradingApi.getAccounts();
      if (response && response.data) {
        setAllAccounts(response.data);
        const initialAccount = response.data.find((acc: any) => acc.account_type === 'real') || response.data[0];
        if (initialAccount) {
          setUserInfo({
            id: initialAccount.id,
            derivId: initialAccount.deriv_account_id,
            balance: parseFloat(initialAccount.balance),
            currency: initialAccount.currency
          });
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
      sessionStorage.setItem('activeAccountId', targetAccount.id);
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
      setLoading(true);
      const session = await tradingApi.getMyActiveSession();
      if (session) {
        setActiveSession(session);
        setTakeProfit(session.user_tp || '');
        setStopLoss(session.user_sl || '');
        setSessionStatus(session.status);
      }
    } catch (error) {
      console.error('Failed to load active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSession = async (sessionId: string) => {
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
    return <div className="h-[60vh] flex items-center justify-center"><TradingLoader /></div>;
  }

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <GlassCard className="max-w-md p-8 border-dashed border-white/10">
          <h2 className="text-xl font-bold text-white mb-2">No Active Session</h2>
          <p className="text-gray-400 mb-6">Join a trading session from the dashboard to start trading.</p>
          <GlassButton variant="primary" onClick={() => navigate('/user/dashboard')}>
            Go to Dashboard
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">

      {/* LEFT COLUMN: Main Trading Deck (70% on large screens) */}
      <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
        {/* 1. Header & Active Status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {activeSession.name}
              <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide border ${sessionStatus === 'active'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                {sessionStatus}
              </span>
            </h1>
            <div className="text-xs text-brand-gray-400 font-mono mt-1">
              MARKET: <span className="text-white">{activeSession.volatility_index || 'R_100'}</span> • ID: {activeSession.id.slice(0, 8)}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <GlassMetricTile
              icon={<DollarSign size={16} />}
              label="BALANCE"
              value={userInfo ? `$${userInfo.balance.toFixed(2)}` : '---'}
              className="py-2 px-4 min-w-[140px]"
            />
          </div>
        </div>

        {/* 2. Live Signal / Active Trade - Hero Section */}
        {activeTrade ? (
          <GlassCard className={`relative overflow-hidden border-2 transition-all duration-300 ${activeTrade.status === 'pending' ? 'border-amber-500/50 bg-amber-500/5' :
            activeTrade.status === 'open' ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_50px_rgba(59,130,246,0.1)]' :
              activeTrade.status === 'won' ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.15)]' :
                'border-brand-red/50 bg-brand-red/10'
            }`}>
            {/* Active Trade Visualization */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${activeTrade.status === 'open' ? 'bg-blue-500 text-white animate-pulse' :
                  activeTrade.status === 'won' ? 'bg-emerald-500 text-white' :
                    activeTrade.status === 'lost' ? 'bg-brand-red text-white' :
                      'bg-amber-500 text-black'
                  }`}>
                  {activeTrade.digit}
                </div>
                <div>
                  <div className="text-sm text-gray-400 font-mono tracking-wider uppercase mb-1">
                    {activeTrade.status === 'pending' ? 'SIGNAL RECEIVED' : activeTrade.status}
                  </div>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    {activeTrade.side}
                  </div>
                </div>
              </div>

              {/* Payout / Result */}
              <div className="text-right">
                <div className="text-sm text-gray-400 font-mono tracking-wider uppercase mb-1">STAKE: ${activeTrade.stake.toFixed(2)}</div>
                <div className={`text-4xl font-mono font-bold ${activeTrade.status === 'won' ? 'text-emerald-400' :
                  activeTrade.status === 'lost' ? 'text-brand-red' : 'text-white'
                  }`}>
                  {activeTrade.status === 'won' ? '+' : activeTrade.status === 'lost' ? '-' : ''}
                  ${activeTrade.profit ? Math.abs(activeTrade.profit).toFixed(2) : activeTrade.potentialPayout?.toFixed(2) || '...'}
                </div>
              </div>
            </div>

            {/* Progress Bar for Open Trades */}
            {activeTrade.status === 'open' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-linear"
                  style={{ width: `${(activeTrade.ticksElapsed / activeTrade.totalTicks) * 100}%` }}
                />
              </div>
            )}
          </GlassCard>
        ) : (
          <GlassCard className="flex items-center justify-center p-12 border-dashed border-white/10 opacity-60">
            <div className="text-center">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500">Waiting for Signal...</h3>
              <p className="text-sm text-gray-600">AI analysis in progress</p>
            </div>
          </GlassCard>
        )}

        {/* 3. Live Feed Log */}
        <div className="flex-1 min-h-0">
          <LiveSessionFeed
            sessionId={activeSession.id}
            sessionName={activeSession.name}
            market={activeSession.volatility_index}
            latestTick={latestTick}
            latestSignal={latestSignal}
            latestTrade={latestTrade}
            isConnected={realtimeSocket.isConnected()}
            activityLog={activityLog}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Control Panel (30% on large screens) */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2">

        {/* Risk Panel */}
        <GlassCard className="border-t-4 border-t-brand-red/50">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-brand-red" size={20} />
            <h3 className="text-lg font-bold text-white">Risk Management</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>TAKE PROFIT</span>
                <span>TARGET</span>
              </div>
              <div className="relative group">
                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-[#0E0E0E] border border-white/10 rounded-xl px-4 py-3 font-mono text-lg text-emerald-400 focus:border-emerald-500/50 outline-none transition-all"
                  placeholder="0.00"
                />
                <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/20 group-focus-within:text-emerald-500 transition-colors" size={20} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>STOP LOSS</span>
                <span>LIMIT</span>
              </div>
              <div className="relative group">
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-[#0E0E0E] border border-white/10 rounded-xl px-4 py-3 font-mono text-lg text-brand-red focus:border-brand-red/50 outline-none transition-all"
                  placeholder="0.00"
                />
                <TrendingDown className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-red/20 group-focus-within:text-brand-red transition-colors" size={20} />
              </div>
            </div>

            <GlassButton variant="primary" size="md" className="w-full" onClick={handleUpdateTPSL}>
              Update Limits
            </GlassButton>
          </div>
        </GlassCard>

        {/* Session Stats */}
        <GlassCard>
          <h3 className="text-lg font-bold text-white mb-4">Session Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm text-gray-400">Total Trades</span>
              <span className="text-lg font-mono font-bold text-white">{activeSession.total_trades || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-sm text-emerald-400/80">Wins</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{activeSession.wins || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-brand-red/5 border border-brand-red/10">
              <span className="text-sm text-brand-red/80">Losses</span>
              <span className="text-lg font-mono font-bold text-brand-red">{activeSession.losses || 0}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
              <span className="text-sm font-bold text-gray-400">NET P&L</span>
              <span className={`text-2xl font-mono font-bold ${(activeSession.net_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                {(activeSession.net_pnl || 0) >= 0 ? '+' : ''}${(activeSession.net_pnl || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <div className="mt-auto">
          <button
            onClick={handleLeaveSession}
            className="w-full py-4 text-xs font-bold text-brand-red/60 hover:text-brand-red hover:bg-brand-red/5 rounded-xl transition-all uppercase tracking-widest border border-transparent hover:border-brand-red/20"
          >
            Exit Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserTrading;

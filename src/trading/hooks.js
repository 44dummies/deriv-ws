/**
 * Trading Hooks - React hooks for trading functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { accountManager, subscribeTicks } from './derivWebSocket';
import { analyzeForSignal } from './strategyEngine';
import * as api from './tradingApi';

/**
 * Hook for managing trading accounts
 */
export function useTradingAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getAccounts();
      setAccounts(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  
  const addAccount = async (token) => {
    const result = await api.addAccount(token);
    await fetchAccounts();
    return result;
  };
  
  const removeAccount = async (accountId) => {
    await api.deleteAccount(accountId);
    await fetchAccounts();
  };
  
  return { accounts, loading, error, refresh: fetchAccounts, addAccount, removeAccount };
}

/**
 * Hook for managing trading sessions
 */
export function useTradingSessions(options = {}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getSessions(options);
      setSessions(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.status, options.type, options.limit]);
  
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  
  const createSession = async (data) => {
    const result = await api.createSession(data);
    await fetchSessions();
    return result;
  };
  
  const deleteSession = async (sessionId) => {
    await api.deleteSession(sessionId);
    await fetchSessions();
  };
  
  return { sessions, loading, error, refresh: fetchSessions, createSession, deleteSession };
}

/**
 * Hook for a single session with real-time updates
 */
export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const [sessionResult, tradesResult, statsResult] = await Promise.all([
        api.getSession(sessionId),
        api.getSessionTrades(sessionId, { limit: 50 }),
        api.getTradeStats(sessionId)
      ]);
      
      setSession(sessionResult.data);
      setTrades(tradesResult.data || []);
      setStats(statsResult.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);
  
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);
  
  const start = async () => {
    const result = await api.startSession(sessionId);
    setSession(result.data);
    return result;
  };
  
  const stop = async () => {
    const result = await api.stopSession(sessionId);
    setSession(result.data);
    return result;
  };
  
  const pause = async () => {
    const result = await api.pauseSession(sessionId);
    setSession(result.data);
    return result;
  };
  
  const resume = async () => {
    const result = await api.resumeSession(sessionId);
    setSession(result.data);
    return result;
  };
  
  return { session, trades, stats, loading, error, refresh: fetchSession, start, stop, pause, resume };
}

/**
 * Hook for tick streaming and analysis
 */
export function useTickStream(accountId, token, symbol, strategy = null) {
  const [ticks, setTicks] = useState([]);
  const [signal, setSignal] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  
  useEffect(() => {
    if (!accountId || !token || !symbol) return;
    
    const ws = accountManager.connect(accountId, token, {
      onAuthorized: () => {
        setConnected(true);
        subscribeTicks(ws, symbol);
      },
      onTick: (tick) => {
        setTicks(prev => {
          const updated = [...prev, { epoch: tick.epoch, quote: tick.quote, symbol: tick.symbol }];
          if (updated.length > 100) updated.shift();
          
          // Run analysis
          if (updated.length >= 20) {
            const analysis = analyzeForSignal(updated, strategy);
            setSignal(analysis);
          }
          
          return updated;
        });
      },
      onError: (err) => {
        console.error('Tick stream error:', err);
      },
      onClose: () => {
        setConnected(false);
      }
    });
    
    wsRef.current = ws;
    
    return () => {
      accountManager.disconnect(accountId);
    };
  }, [accountId, token, symbol, strategy]);
  
  return { ticks, signal, connected };
}

/**
 * Hook for bot status
 */
export function useTradingBot() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchStatus = useCallback(async () => {
    try {
      const result = await api.getBotStatus();
      setStatus(result.data);
    } catch (err) {
      console.error('Failed to get bot status:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);
  
  const start = async () => {
    await api.startBot();
    await fetchStatus();
  };
  
  const stop = async () => {
    await api.stopBot();
    await fetchStatus();
  };
  
  return { status, loading, refresh: fetchStatus, start, stop };
}

/**
 * Hook for activity logs
 */
export function useActivityLogs(options = {}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getActivityLogs(options);
      setLogs(result.data || []);
    } catch (err) {
      console.error('Failed to get logs:', err);
    } finally {
      setLoading(false);
    }
  }, [options.type, options.limit]);
  
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  
  return { logs, loading, refresh: fetchLogs };
}

/**
 * User Trading Dashboard
 * Dashboard for users to view and participate in trading sessions
 */

import React, { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, DollarSign, Clock,
  CheckCircle, XCircle, Bell, Play, Pause,
  BarChart2, RefreshCw, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  useTradingSessions,
  useTradingAccounts,
  useTickStream,
  useTradingBot
} from '../../trading/hooks';
import { tradingApi } from '../../trading/tradingApi';
import { VOLATILITY_INDICES, STRATEGY_NAMES } from '../../trading/constants';
import './UserTradingDashboard.css';

const UserTradingDashboard = ({ user }) => {
  // State
  const [selectedSession, setSelectedSession] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);

  // Hooks
  const {
    sessions,
    loading: sessionsLoading,
    refresh: refreshSessions
  } = useTradingSessions();

  const {
    accounts
  } = useTradingAccounts();

  const {
    status: botStatus
  } = useTradingBot();

  // Get active session for tick stream
  const activeSession = sessions?.find(s => s.status === 'active');

  // Note: useTickStream requires accountId and token which are not available in this component
  // For now, we provide empty values which will prevent the hook from connecting
  const {
    ticks,
    signal,
    connected: isConnected
  } = useTickStream(null, null, activeSession?.volatility_index || null);

  // Get last tick from ticks array
  const lastTick = ticks && ticks.length > 0 ? ticks[ticks.length - 1] : null;

  // Load pending invitations
  useEffect(() => {
    const loadInvitations = async () => {
      // This would need an endpoint to get pending invitations for the user
      // For now, we'll leave it empty
    };
    loadInvitations();
  }, []);

  // Load trades for selected session
  useEffect(() => {
    const loadTrades = async () => {
      if (!selectedSession) {
        setTrades([]);
        return;
      }

      setTradesLoading(true);
      try {
        const data = await tradingApi.getTrades(selectedSession.id, {});
        setTrades(data);
      } catch (error) {
        console.error('Failed to load trades:', error);
      } finally {
        setTradesLoading(false);
      }
    };
    loadTrades();
  }, [selectedSession]);

  // Handlers
  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      // Get first account ID for accepting the invitation
      const accountId = accounts?.[0]?.id || '';
      await tradingApi.acceptInvitation(invitationId, accountId);
      setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
      refreshSessions();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      // Get first account ID for declining the invitation
      const accountId = accounts?.[0]?.id || '';
      await tradingApi.declineInvitation(invitationId, accountId);
      setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getWinRate = (session) => {
    const total = (session.winning_trades || 0) + (session.losing_trades || 0);
    if (total === 0) return 0;
    return ((session.winning_trades || 0) / total * 100).toFixed(1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play size={14} className="status-icon active" />;
      case 'paused': return <Pause size={14} className="status-icon paused" />;
      case 'completed': return <CheckCircle size={14} className="status-icon completed" />;
      case 'cancelled': return <XCircle size={14} className="status-icon cancelled" />;
      default: return <Clock size={14} className="status-icon pending" />;
    }
  };

  // Render session row
  const renderSessionRow = (session) => {
    const isExpanded = expandedSession === session.id;
    const isActive = session.status === 'active';

    return (
      <div key={session.id} className={`session-row ${isActive ? 'active' : ''}`}>
        <div
          className="session-summary"
          onClick={() => {
            setExpandedSession(isExpanded ? null : session.id);
            setSelectedSession(session);
          }}
        >
          <div className="session-main">
            {getStatusIcon(session.status)}
            <span className="session-name">{session.session_name}</span>
            <span className="session-strategy">{STRATEGY_NAMES[session.strategy_name] || session.strategy_name}</span>
          </div>

          <div className="session-metrics">
            <div className="metric">
              <Activity size={14} />
              <span>{session.total_trades || 0}</span>
            </div>
            <div className="metric win">
              <TrendingUp size={14} />
              <span>{getWinRate(session)}%</span>
            </div>
            <div className={`metric ${(session.net_pnl || 0) >= 0 ? 'profit' : 'loss'}`}>
              <DollarSign size={14} />
              <span>{formatCurrency(session.net_pnl)}</span>
            </div>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {isExpanded && (
          <div className="session-details">
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Index</span>
                <span className="value">{VOLATILITY_INDICES[session.volatility_index] || session.volatility_index}</span>
              </div>
              <div className="detail-item">
                <span className="label">Contract</span>
                <span className="value">{session.contract_type}</span>
              </div>
              <div className="detail-item">
                <span className="label">Stake</span>
                <span className="value">{formatCurrency(session.initial_stake)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Mode</span>
                <span className="value">{session.staking_mode}</span>
              </div>
              <div className="detail-item">
                <span className="label">Wins</span>
                <span className="value win">{session.winning_trades || 0}</span>
              </div>
              <div className="detail-item">
                <span className="label">Losses</span>
                <span className="value loss">{session.losing_trades || 0}</span>
              </div>
              <div className="detail-item">
                <span className="label">Started</span>
                <span className="value">{formatTime(session.started_at)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Profit Target</span>
                <span className="value">{formatCurrency(session.profit_threshold)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render trade row
  const renderTradeRow = (trade) => (
    <tr key={trade.id} className={`trade-row ${trade.result}`}>
      <td>{formatTime(trade.created_at)}</td>
      <td>{trade.contract_type}</td>
      <td className="stake">{formatCurrency(trade.stake)}</td>
      <td className="prediction">{trade.prediction}</td>
      <td className="entry">{trade.entry_digit}</td>
      <td className="exit">{trade.exit_digit}</td>
      <td className={`result ${trade.result}`}>
        {trade.result === 'win' ? (
          <CheckCircle size={14} />
        ) : (
          <XCircle size={14} />
        )}
        {trade.result}
      </td>
      <td className={`profit ${(trade.profit || 0) >= 0 ? 'positive' : 'negative'}`}>
        {formatCurrency(trade.profit)}
      </td>
    </tr>
  );

  return (
    <div className="user-trading-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-info">
          <h1>Trading Dashboard</h1>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <button onClick={refreshSessions} className="btn-refresh">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Live Ticker */}
      {activeSession && lastTick && (
        <div className="live-ticker">
          <div className="ticker-label">
            <Activity size={16} className="pulse" />
            <span>LIVE</span>
          </div>
          <div className="ticker-info">
            <span className="ticker-index">{VOLATILITY_INDICES[activeSession.volatility_index]}</span>
            <span className="ticker-price">{lastTick.quote?.toFixed(4)}</span>
            <span className="ticker-digit">Digit: {lastTick.quote?.toFixed(2).slice(-1)}</span>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="invitations-section">
          <h2>
            <Bell size={18} />
            Pending Invitations
          </h2>
          <div className="invitations-list">
            {pendingInvitations.map(invitation => (
              <div key={invitation.id} className="invitation-card">
                <div className="invitation-info">
                  <h3>{invitation.session?.session_name}</h3>
                  <p>Strategy: {invitation.session?.strategy_name}</p>
                </div>
                <div className="invitation-actions">
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    className="btn-accept"
                  >
                    <CheckCircle size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className="btn-decline"
                  >
                    <XCircle size={16} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon sessions">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{sessions.length}</span>
            <span className="stat-label">Total Sessions</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <Play size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{sessions.filter(s => s.status === 'active').length}</span>
            <span className="stat-label">Active Sessions</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon accounts">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{accounts.length}</span>
            <span className="stat-label">Connected Accounts</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bot">
            <BarChart2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{botStatus?.isRunning ? 'Running' : 'Idle'}</span>
            <span className="stat-label">Bot Status</span>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="sessions-section">
        <h2>Your Sessions</h2>
        {sessionsLoading ? (
          <div className="loading">Loading sessions...</div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} />
            <p>No sessions available</p>
            <span>You'll see sessions here when an admin invites you</span>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map(renderSessionRow)}
          </div>
        )}
      </div>

      {/* Trades Table */}
      {selectedSession && (
        <div className="trades-section">
          <h2>
            <Eye size={18} />
            Trade History - {selectedSession.session_name}
          </h2>
          {tradesLoading ? (
            <div className="loading">Loading trades...</div>
          ) : trades.length === 0 ? (
            <div className="empty-trades">No trades recorded yet</div>
          ) : (
            <div className="trades-table-container">
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Contract</th>
                    <th>Stake</th>
                    <th>Prediction</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Result</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(renderTradeRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent Ticks (if connected) */}
      {isConnected && ticks && ticks.length > 0 && (
        <div className="ticks-section">
          <h2>Recent Ticks</h2>
          <div className="ticks-list">
            {ticks.slice(-10).reverse().map((tick, idx) => (
              <div key={idx} className="tick-item">
                <span className="tick-time">{formatTime(tick.epoch * 1000)}</span>
                <span className="tick-quote">{tick.quote?.toFixed(4)}</span>
                <span className="tick-digit">{tick.quote?.toFixed(2).slice(-1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTradingDashboard;

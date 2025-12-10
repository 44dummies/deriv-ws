/**
 * User Trading Dashboard - Simple Interface for Regular Users
 * Users can only:
 * - Input TP/SL
 * - Accept trading sessions
 * - View their status
 * - See notifications
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { tradingApi } from '../trading/tradingApi';
import { NotificationBell } from '../components/trading';
import './UserTrading.css';

const UserTrading = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [sessionStatus, setSessionStatus] = useState('waiting'); // waiting, active, tp_hit, sl_hit, removed

  useEffect(() => {
    loadUserData();
    loadAvailableSessions();
    loadActiveSession();
  }, []);

  const loadUserData = async () => {
    try {
      // Load from session storage for immediate display
      const derivId = sessionStorage.getItem('derivId');
      const balance = sessionStorage.getItem('balance');
      const currency = sessionStorage.getItem('currency');

      let currentInfo = {
        derivId,
        id: null, // Internal UUID
        balance: parseFloat(balance) || 0,
        currency: currency || 'USD'
      };

      // Fetch actual account data from backend to get internal UUID
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
      const sessions = await tradingApi.getSessions();
      setAvailableSessions(sessions || []);
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

    if (!userInfo?.id) {
      alert('Account information not loaded. Please refresh.');
      return;
    }

    try {
      await tradingApi.acceptSession({
        sessionId,
        accountId: userInfo.id,
        takeProfit: parseFloat(takeProfit),
        stopLoss: parseFloat(stopLoss)
      });

      alert('Session accepted successfully!');
      loadActiveSession();
      loadAvailableSessions();
    } catch (error) {
      console.error('Failed to accept session:', error);
      alert('Failed to accept session. Please try again.');
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

  const getStatusBadge = () => {
    const badges = {
      waiting: { text: 'Waiting for Session', color: 'gray', icon: AlertCircle },
      active: { text: 'Active Trading', color: 'green', icon: CheckCircle },
      tp_hit: { text: 'Take Profit Hit! 🎉', color: 'blue', icon: TrendingUp },
      sl_hit: { text: 'Stop Loss Hit', color: 'red', icon: TrendingDown },
      removed: { text: 'Removed from Session', color: 'orange', icon: XCircle }
    };

    const status = badges[sessionStatus] || badges.waiting;
    const Icon = status.icon;

    return (
      <div className={`status-badge status-${status.color}`}>
        <Icon size={20} />
        <span>{status.text}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="user-trading-loading">
        <div className="loading-spinner"></div>
        <p>Loading your trading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="user-trading-page">
      {/* Header */}
      <div className="user-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              ← Back
            </button>
            <h1>My Trading</h1>
          </div>
          <div className="header-right">
            <NotificationBell />
            <div className="balance-display">
              <DollarSign size={20} />
              <span>{userInfo?.currency} {userInfo?.balance?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="user-content">
        {/* Status Card */}
        <div className="status-card">
          <h2>Your Status</h2>
          {getStatusBadge()}
          {activeSession && (
            <div className="session-info">
              <p><strong>Session:</strong> {activeSession.session_name}</p>
              <p><strong>Strategy:</strong> {activeSession.strategy_name}</p>
            </div>
          )}
        </div>

        {/* TP/SL Inputs */}
        <div className="tpsl-card">
          <h2>Set Your Limits</h2>
          <div className="input-group">
            <label>
              <TrendingUp size={18} className="text-green-500" />
              Take Profit (TP)
            </label>
            <input
              type="number"
              step="0.01"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Enter TP amount"
              disabled={!activeSession && availableSessions.length === 0}
            />
          </div>
          <div className="input-group">
            <label>
              <TrendingDown size={18} className="text-red-500" />
              Stop Loss (SL)
            </label>
            <input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Enter SL amount"
              disabled={!activeSession && availableSessions.length === 0}
            />
          </div>
          {activeSession && (
            <button onClick={handleUpdateTPSL} className="btn-primary">
              Update TP/SL
            </button>
          )}
        </div>

        {/* Available Sessions or Active Session */}
        {!activeSession ? (
          <div className="sessions-card">
            <h2>Available Sessions</h2>
            {availableSessions.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={48} />
                <p>No trading sessions available</p>
                <small>Wait for admin to create a session</small>
              </div>
            ) : (
              <div className="sessions-list">
                {availableSessions.map(session => (
                  <div key={session.id} className="session-item">
                    <div className="session-details">
                      <h3>{session.session_name}</h3>
                      <p>Strategy: {session.strategy_name}</p>
                      <p>Type: {session.session_type}</p>
                    </div>
                    <button
                      onClick={() => handleAcceptSession(session.id)}
                      className="btn-accept"
                      disabled={!takeProfit || !stopLoss}
                    >
                      Accept Session
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="active-session-card">
            <h2>Your Active Session</h2>
            <div className="session-stats">
              <div className="stat-item">
                <span className="stat-label">Total Trades</span>
                <span className="stat-value">{activeSession.total_trades || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Wins</span>
                <span className="stat-value text-green">{activeSession.winning_trades || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Losses</span>
                <span className="stat-value text-red">{activeSession.losing_trades || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">P&L</span>
                <span className={`stat-value ${activeSession.net_pnl >= 0 ? 'text-green' : 'text-red'}`}>
                  {userInfo?.currency} {activeSession.net_pnl?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTrading;

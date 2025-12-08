/**
 * Admin Control Panel
 * Dashboard for managing trading sessions, accounts, and strategies
 */

import React, { useState, useEffect } from 'react';
import {
  Play, Pause, Square, Plus, Users, TrendingUp, TrendingDown,
  Activity, DollarSign, XCircle,
  RefreshCw, Trash2, UserPlus, BarChart2, Zap
} from 'lucide-react';
import {
  useTradingSessions,
  useTradingAccounts,
  useTradingBot
} from '../../trading/hooks';
import { tradingApi } from '../../trading/tradingApi';
import {
  STRATEGY_NAMES,
  VOLATILITY_INDICES,
  CONTRACT_TYPES,
  SESSION_TYPE,
  STAKING_MODE
} from '../../trading/constants';
import './AdminControlPanel.css';

const AdminControlPanel = ({ user = null }: { user?: any }) => {
  // State
  const [activeTab, setActiveTab] = useState('sessions');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [accountFormData, setAccountFormData] = useState({
    derivToken: '',
    accountId: ''
  });
  const [formData, setFormData] = useState<{
    sessionName: string;
    sessionType: string;
    strategyName: string;
    volatilityIndex: string;
    contractType: string;
    stakingMode: string;
    initialStake: number;
    maxStake: number;
    martingaleMultiplier: number;
    profitThreshold: number;
    lossThreshold: number;
    maxTrades: number;
    durationMinutes: number;
  }>({
    sessionName: '',
    sessionType: SESSION_TYPE.DAY,
    strategyName: 'DFPM',
    volatilityIndex: 'R_100',
    contractType: 'DIGITEVEN',
    stakingMode: STAKING_MODE.FIXED,
    initialStake: 1,
    maxStake: 100,
    martingaleMultiplier: 2,
    profitThreshold: 50,
    lossThreshold: 25,
    maxTrades: 100,
    durationMinutes: 60
  });
  const [inviteUserId, setInviteUserId] = useState('');

  // Hooks
  const {
    sessions,
    loading: sessionsLoading,
    refresh: refreshSessions,
    createSession,
    deleteSession
  } = useTradingSessions();

  const {
    accounts,
    loading: accountsLoading,
    refresh: refreshAccounts
  } = useTradingAccounts();

  const {
    status: botStatus
  } = useTradingBot();

  // Session control methods (using tradingApi directly)
  const startSession = async (sessionId: string) => {
    await tradingApi.startSession(sessionId);
    refreshSessions();
  };

  const stopSession = async (sessionId: string) => {
    await tradingApi.stopSession(sessionId);
    refreshSessions();
  };

  const pauseSession = async (sessionId: string) => {
    await tradingApi.pauseSession(sessionId);
    refreshSessions();
  };

  const resumeSession = async (sessionId: string) => {
    await tradingApi.resumeSession(sessionId);
    refreshSessions();
  };

  // Handlers
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await createSession({
        session_name: formData.sessionName,
        session_type: formData.sessionType,
        strategy_name: formData.strategyName,
        volatility_index: formData.volatilityIndex,
        contract_type: formData.contractType,
        staking_mode: formData.stakingMode,
        initial_stake: formData.initialStake,
        max_stake: formData.maxStake,
        martingale_multiplier: formData.martingaleMultiplier,
        profit_threshold: formData.profitThreshold,
        loss_threshold: formData.lossThreshold,
        max_trades: formData.maxTrades,
        duration_minutes: formData.durationMinutes
      });
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!selectedSession || !inviteUserId) return;

    try {
      await tradingApi.inviteAccounts(selectedSession.id, [inviteUserId]);
      setShowInviteModal(false);
      setInviteUserId('');
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accountFormData.derivToken) {
      alert('Please enter your Deriv API token');
      return;
    }

    try {
      await tradingApi.addAccount({
        derivToken: accountFormData.derivToken,
        accountId: accountFormData.accountId || undefined
      });
      setShowAddAccountModal(false);
      setAccountFormData({ derivToken: '', accountId: '' });
      refreshAccounts();
    } catch (error) {
      console.error('Failed to add account:', error);
      alert('Failed to connect account. Please check your API token.');
    }
  };

  const resetForm = () => {
    setFormData({
      sessionName: '',
      sessionType: SESSION_TYPE.DAY,
      strategyName: 'DFPM',
      volatilityIndex: 'R_100',
      contractType: 'DIGITEVEN',
      stakingMode: STAKING_MODE.FIXED,
      initialStake: 1,
      maxStake: 100,
      martingaleMultiplier: 2,
      profitThreshold: 50,
      lossThreshold: 25,
      maxTrades: 100,
      durationMinutes: 60
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#fbbf24',
      active: '#22c55e',
      paused: '#f97316',
      completed: '#3b82f6',
      cancelled: '#6b7280',
      failed: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Render session card
  const renderSessionCard = (session) => (
    <div key={session.id} className="session-card">
      <div className="session-header">
        <div className="session-info">
          <h3>{session.session_name}</h3>
          <span
            className="session-status"
            style={{ backgroundColor: getStatusColor(session.status) }}
          >
            {session.status}
          </span>
        </div>
        <div className="session-actions">
          {session.status === 'pending' && (
            <button onClick={() => startSession(session.id)} className="btn-icon start">
              <Play size={16} />
            </button>
          )}
          {session.status === 'active' && (
            <>
              <button onClick={() => pauseSession(session.id)} className="btn-icon pause">
                <Pause size={16} />
              </button>
              <button onClick={() => stopSession(session.id)} className="btn-icon stop">
                <Square size={16} />
              </button>
            </>
          )}
          {session.status === 'paused' && (
            <button onClick={() => resumeSession(session.id)} className="btn-icon resume">
              <Play size={16} />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedSession(session);
              setShowInviteModal(true);
            }}
            className="btn-icon invite"
          >
            <UserPlus size={16} />
          </button>
          <button
            onClick={() => deleteSession(session.id)}
            className="btn-icon delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="session-details">
        <div className="detail-row">
          <span className="label">Strategy:</span>
          <span className="value">{session.strategy_name}</span>
        </div>
        <div className="detail-row">
          <span className="label">Index:</span>
          <span className="value">{session.volatility_index}</span>
        </div>
        <div className="detail-row">
          <span className="label">Contract:</span>
          <span className="value">{session.contract_type}</span>
        </div>
        <div className="detail-row">
          <span className="label">Stake:</span>
          <span className="value">{formatCurrency(session.initial_stake)} ({session.staking_mode})</span>
        </div>
      </div>

      <div className="session-stats">
        <div className="stat">
          <Activity size={14} />
          <span>{session.total_trades || 0} trades</span>
        </div>
        <div className="stat win">
          <TrendingUp size={14} />
          <span>{session.winning_trades || 0} W</span>
        </div>
        <div className="stat loss">
          <TrendingDown size={14} />
          <span>{session.losing_trades || 0} L</span>
        </div>
        <div className={`stat ${(session.net_pnl || 0) >= 0 ? 'profit' : 'loss'}`}>
          <DollarSign size={14} />
          <span>{formatCurrency(session.net_pnl)}</span>
        </div>
      </div>
    </div>
  );

  // Render account card
  const renderAccountCard = (account) => (
    <div key={account.id} className="account-card">
      <div className="account-header">
        <div className="account-info">
          <h4>{account.deriv_account_id}</h4>
          <span className={`account-type ${account.is_virtual ? 'virtual' : 'real'}`}>
            {account.is_virtual ? 'Demo' : 'Real'}
          </span>
        </div>
        <span className={`account-status ${account.is_active ? 'active' : 'inactive'}`}>
          {account.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="account-balance">
        <DollarSign size={20} />
        <span>{formatCurrency(account.balance)}</span>
        <span className="currency">{account.currency}</span>
      </div>
    </div>
  );

  return (
    <div className="admin-control-panel">
      {/* Header */}
      <div className="panel-header">
        <h1>Trading Control Panel</h1>
        <div className="header-actions">
          <button onClick={() => { refreshSessions(); refreshAccounts(); }} className="btn-refresh">
            <RefreshCw size={18} />
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={18} />
            New Session
          </button>
        </div>
      </div>

      {/* Bot Status */}
      <div className="bot-status-bar">
        <div className="stat-card">
          <Zap size={20} className={botStatus?.isRunning ? 'active' : ''} />
          <span>Bot Status: {botStatus?.isRunning ? 'Running' : 'Stopped'}</span>
        </div>
        {botStatus?.sessionId && (
          <span>Active Session: {botStatus.sessionId}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Activity size={18} />
          Sessions
        </button>
        <button
          className={`tab ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <Users size={18} />
          Accounts
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={18} />
          Analytics
        </button>
      </div>

      {/* Content */}
      <div className="panel-content">
        {activeTab === 'sessions' && (
          <div className="sessions-grid">
            {sessionsLoading ? (
              <div className="loading">Loading sessions...</div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="empty-state">
                <Activity size={48} />
                <p>No trading sessions yet</p>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create Your First Session
                </button>
              </div>
            ) : (
              sessions.map(renderSessionCard)
            )}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="accounts-section">
            <div className="section-header">
              <h3>Connected Accounts</h3>
              <button onClick={() => setShowAddAccountModal(true)} className="btn-primary">
                <Plus size={16} />
                Add Account
              </button>
            </div>
            <div className="accounts-grid">
              {accountsLoading ? (
                <div className="loading">Loading accounts...</div>
              ) : !accounts || accounts.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <p>No trading accounts connected</p>
                  <button onClick={() => setShowAddAccountModal(true)} className="btn-secondary">
                    <Plus size={16} />
                    Connect Your First Account
                  </button>
                </div>
              ) : (
                accounts.map(renderAccountCard)
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-placeholder">
            <BarChart2 size={64} />
            <p>Analytics coming soon</p>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Trading Session</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="modal-form">
              <div className="form-group">
                <label>Session Name</label>
                <input
                  type="text"
                  value={formData.sessionName}
                  onChange={e => setFormData({ ...formData, sessionName: e.target.value })}
                  placeholder="e.g., Morning Session"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Session Type</label>
                  <select
                    value={formData.sessionType}
                    onChange={e => setFormData({ ...formData, sessionType: e.target.value })}
                  >
                    {Object.values(SESSION_TYPE).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Strategy</label>
                  <select
                    value={formData.strategyName}
                    onChange={e => setFormData({ ...formData, strategyName: e.target.value })}
                  >
                    {Object.keys(STRATEGY_NAMES).map(key => (
                      <option key={key} value={key}>{STRATEGY_NAMES[key]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Volatility Index</label>
                  <select
                    value={formData.volatilityIndex}
                    onChange={e => setFormData({ ...formData, volatilityIndex: e.target.value })}
                  >
                    {Object.keys(VOLATILITY_INDICES).map(key => (
                      <option key={key} value={key}>{VOLATILITY_INDICES[key]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contract Type</label>
                  <select
                    value={formData.contractType}
                    onChange={e => setFormData({ ...formData, contractType: e.target.value })}
                  >
                    {Object.keys(CONTRACT_TYPES).map(key => (
                      <option key={key} value={key}>{CONTRACT_TYPES[key]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Staking Mode</label>
                  <select
                    value={formData.stakingMode}
                    onChange={e => setFormData({ ...formData, stakingMode: e.target.value })}
                  >
                    {Object.values(STAKING_MODE).map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Stake ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.35"
                    value={formData.initialStake}
                    onChange={e => setFormData({ ...formData, initialStake: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {formData.stakingMode === STAKING_MODE.MARTINGALE && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Max Stake ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maxStake}
                      onChange={e => setFormData({ ...formData, maxStake: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      max="5"
                      value={formData.martingaleMultiplier}
                      onChange={e => setFormData({ ...formData, martingaleMultiplier: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Profit Target ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.profitThreshold}
                    onChange={e => setFormData({ ...formData, profitThreshold: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Loss Limit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.lossThreshold}
                    onChange={e => setFormData({ ...formData, lossThreshold: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Trades</label>
                  <input
                    type="number"
                    value={formData.maxTrades}
                    onChange={e => setFormData({ ...formData, maxTrades: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite User to Session</h2>
              <button onClick={() => setShowInviteModal(false)} className="close-btn">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="modal-form">
              <p className="modal-description">
                Inviting to: <strong>{selectedSession.session_name}</strong>
              </p>
              <div className="form-group">
                <label>User ID</label>
                <input
                  type="text"
                  value={inviteUserId}
                  onChange={e => setInviteUserId(e.target.value)}
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <UserPlus size={16} />
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Connect Deriv Account</h2>
              <button onClick={() => setShowAddAccountModal(false)} className="close-btn">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleAddAccount}>
              <div className="form-group">
                <label>Deriv API Token *</label>
                <input
                  type="password"
                  value={accountFormData.derivToken}
                  onChange={(e) => setAccountFormData({ ...accountFormData, derivToken: e.target.value })}
                  placeholder="Enter your Deriv API token"
                  required
                />
                <small className="help-text">
                  Get your API token from <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer">Deriv API Settings</a>
                </small>
              </div>
              <div className="form-group">
                <label>Account ID (Optional)</label>
                <input
                  type="text"
                  value={accountFormData.accountId}
                  onChange={(e) => setAccountFormData({ ...accountFormData, accountId: e.target.value })}
                  placeholder="e.g., CR12345 (leave empty to auto-detect)"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddAccountModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Plus size={16} />
                  Connect Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminControlPanel;

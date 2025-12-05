/**
 * Admin Control Panel - Trading System Administration
 * 
 * Full control over sessions, accounts, and system operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  VOLATILITY_INDICES,
  CONTRACT_TYPES,
  SESSION_DEFAULTS,
} from '../../trading/types.js';
import { tradingBot } from '../../trading/botEngine.js';
import { sessionManager } from '../../trading/sessionManager.js';

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    padding: '24px',
    backgroundColor: 'var(--theme-background)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px 24px',
    backgroundColor: 'var(--theme-surface)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--theme-text)',
    margin: 0,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: 'var(--theme-surface)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--theme-text)',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--theme-primary)',
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--theme-text-secondary)',
    marginTop: '4px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: 'var(--theme-primary)',
    color: 'white',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  buttonSuccess: {
    backgroundColor: '#22c55e',
    color: 'white',
  },
  buttonSecondary: {
    backgroundColor: 'var(--theme-surface)',
    color: 'var(--theme-text)',
    border: '1px solid var(--theme-border)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid var(--theme-border)',
    color: 'var(--theme-text-secondary)',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid var(--theme-border)',
    color: 'var(--theme-text)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--theme-border)',
    backgroundColor: 'var(--theme-background)',
    color: 'var(--theme-text)',
    fontSize: '14px',
    marginBottom: '12px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--theme-border)',
    backgroundColor: 'var(--theme-background)',
    color: 'var(--theme-text)',
    fontSize: '14px',
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--theme-text)',
    marginBottom: '6px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--theme-surface)',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid var(--theme-border)',
    paddingBottom: '12px',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: 'var(--theme-text-secondary)',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: 'var(--theme-primary)',
    color: 'white',
  },
};

// ============================================
// ADMIN CONTROL PANEL COMPONENT
// ============================================

const AdminControlPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [botState, setBotState] = useState(tradingBot.getState());
  const [sessions, setSessions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Refresh state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setBotState(tradingBot.getState());
      setSessions(sessionManager.getActiveSessions());
      setAccounts(tradingBot.getAccountManager().getAllAccounts());
    }, 1000);
    
    // Subscribe to bot events for logs
    const unsubscribe = tradingBot.subscribe((event) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [`[${timestamp}] ${event.type}`, ...prev.slice(0, 99)]);
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);
  
  const handleStartBot = async () => {
    try {
      await tradingBot.start();
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  };
  
  const handleStopBot = async () => {
    await tradingBot.stop();
  };
  
  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return '#22c55e';
      case 'paused': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 Trading Bot Admin</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              ...styles.statusBadge,
              backgroundColor: `${getStatusColor(botState.systemStatus)}20`,
              color: getStatusColor(botState.systemStatus),
            }}
          >
            <div style={{ ...styles.statusDot, backgroundColor: getStatusColor(botState.systemStatus) }} />
            {botState.systemStatus.toUpperCase()}
          </div>
          {botState.isRunning ? (
            <button
              style={{ ...styles.button, ...styles.buttonDanger }}
              onClick={handleStopBot}
            >
              Stop Bot
            </button>
          ) : (
            <button
              style={{ ...styles.button, ...styles.buttonSuccess }}
              onClick={handleStartBot}
            >
              Start Bot
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'sessions', 'accounts', 'logs'].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>⏱️ Uptime</div>
              <div style={styles.statValue}>{formatUptime(botState.uptime)}</div>
              <div style={styles.statLabel}>Since {new Date(botState.startTime).toLocaleString()}</div>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardTitle}>📈 Total Trades</div>
              <div style={styles.statValue}>{botState.totalTrades}</div>
              <div style={styles.statLabel}>Across all sessions</div>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardTitle}>💰 Total Profit</div>
              <div style={{ ...styles.statValue, color: botState.totalProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                ${botState.totalProfit.toFixed(2)}
              </div>
              <div style={styles.statLabel}>Net P&L</div>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardTitle}>👥 Active Accounts</div>
              <div style={styles.statValue}>{accounts.filter(a => a.isInSession).length}</div>
              <div style={styles.statLabel}>of {accounts.length} total</div>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardTitle}>🎯 Active Sessions</div>
              <div style={styles.statValue}>{sessions.filter(s => s.status === 'active').length}</div>
              <div style={styles.statLabel}>Running now</div>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardTitle}>📊 Streaming Symbols</div>
              <div style={styles.statValue}>{botState.activeSymbols.length}</div>
              <div style={styles.statLabel}>{botState.activeSymbols.join(', ') || 'None'}</div>
            </div>
          </div>
          
          {botState.lastError && (
            <div style={{ ...styles.card, borderLeft: '4px solid #ef4444', marginBottom: '20px' }}>
              <div style={styles.cardTitle}>⚠️ Last Error</div>
              <div style={{ color: '#ef4444' }}>{botState.lastError}</div>
            </div>
          )}
        </>
      )}
      
      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={styles.cardTitle}>📋 Trading Sessions</div>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={() => setShowCreateSession(true)}
            >
              + Create Session
            </button>
          </div>
          
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-secondary)' }}>
              No active sessions. Create one to start trading.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Symbol</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Participants</th>
                  <th style={styles.th}>Trades</th>
                  <th style={styles.th}>Profit</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>👤 Trading Accounts</div>
          
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-secondary)' }}>
              No accounts registered.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Account</th>
                  <th style={styles.th}>Balance</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Session</th>
                  <th style={styles.th}>Current P&L</th>
                  <th style={styles.th}>TP / SL</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={styles.cardTitle}>📜 Activity Log</div>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={() => setLogs([])}
            >
              Clear Logs
            </button>
          </div>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--theme-text-secondary)', padding: '20px', textAlign: 'center' }}>
                No activity yet.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Create Session Modal */}
      {showCreateSession && (
        <CreateSessionModal onClose={() => setShowCreateSession(false)} />
      )}
    </div>
  );
};

// ============================================
// SESSION ROW COMPONENT
// ============================================

const SessionRow = ({ session }) => {
  const handlePause = () => sessionManager.pauseSession(session.id);
  const handleResume = () => sessionManager.resumeSession(session.id);
  const handleStop = () => sessionManager.stopSession(session.id);
  const handleStart = () => sessionManager.startSession(session.id);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'paused': return '#f59e0b';
      case 'pending': return '#3b82f6';
      case 'recovery': return '#8b5cf6';
      default: return '#6b7280';
    }
  };
  
  return (
    <tr>
      <td style={styles.td}>{session.name}</td>
      <td style={styles.td}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: 'var(--theme-primary)20',
          color: 'var(--theme-primary)',
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {session.type.toUpperCase()}
        </span>
      </td>
      <td style={styles.td}>{session.symbol}</td>
      <td style={styles.td}>
        <span style={{ color: getStatusColor(session.status), fontWeight: '600' }}>
          {session.status.toUpperCase()}
        </span>
        {session.manualOverrideActive && (
          <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '12px' }}>
            ⚠️ OVERRIDE: {session.forcedDirection}
          </span>
        )}
      </td>
      <td style={styles.td}>{session.participantIds.length}</td>
      <td style={styles.td}>{session.totalTrades} ({session.winCount}W/{session.lossCount}L)</td>
      <td style={{ ...styles.td, color: session.totalProfit >= 0 ? '#22c55e' : '#ef4444' }}>
        ${session.totalProfit.toFixed(2)}
      </td>
      <td style={styles.td}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {session.status === 'pending' && (
            <button
              style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 12px' }}
              onClick={handleStart}
            >
              Start
            </button>
          )}
          {session.status === 'active' && (
            <button
              style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 12px' }}
              onClick={handlePause}
            >
              Pause
            </button>
          )}
          {session.status === 'paused' && (
            <button
              style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 12px' }}
              onClick={handleResume}
            >
              Resume
            </button>
          )}
          <button
            style={{ ...styles.button, ...styles.buttonDanger, padding: '6px 12px' }}
            onClick={handleStop}
          >
            Stop
          </button>
        </div>
      </td>
    </tr>
  );
};

// ============================================
// ACCOUNT ROW COMPONENT
// ============================================

const AccountRow = ({ account }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'tp_reached': return '#22c55e';
      case 'sl_reached': return '#ef4444';
      case 'waiting': return '#3b82f6';
      case 'paused': return '#f59e0b';
      default: return '#6b7280';
    }
  };
  
  return (
    <tr>
      <td style={styles.td}>
        <div>
          <div style={{ fontWeight: '600' }}>{account.loginId}</div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            {account.isVirtual ? 'Demo' : 'Real'} • {account.currency}
          </div>
        </div>
      </td>
      <td style={styles.td}>${account.balance.toFixed(2)}</td>
      <td style={styles.td}>
        <span style={{ color: getStatusColor(account.status), fontWeight: '600' }}>
          {account.status.toUpperCase()}
        </span>
      </td>
      <td style={styles.td}>{account.sessionId || '-'}</td>
      <td style={{ ...styles.td, color: account.currentProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
        ${account.currentProfit.toFixed(2)}
      </td>
      <td style={styles.td}>
        <span style={{ color: '#22c55e' }}>${account.takeProfit}</span>
        {' / '}
        <span style={{ color: '#ef4444' }}>${account.stopLoss}</span>
      </td>
      <td style={styles.td}>
        {account.isInSession && (
          <button
            style={{ ...styles.button, ...styles.buttonDanger, padding: '6px 12px' }}
            onClick={() => {
              if (account.sessionId) {
                sessionManager.leaveSession(account.sessionId, account.id);
              }
            }}
          >
            Leave Session
          </button>
        )}
      </td>
    </tr>
  );
};

// ============================================
// CREATE SESSION MODAL
// ============================================

const CreateSessionModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    type: 'day',
    name: '',
    symbol: 'R_100',
    contractType: 'DIGITEVEN',
    stakingMode: 'fixed',
    baseStake: 1,
    martingaleMultiplier: 2,
    maxMartingaleSteps: 5,
    minimumBalance: 100,
    inviteAccountIds: [],
  });
  
  const accounts = tradingBot.getAccountManager().getAllAccounts();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      sessionManager.createSession(formData, 'admin');
      onClose();
    } catch (error) {
      alert(error.message);
    }
  };
  
  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px', color: 'var(--theme-text)' }}>Create Trading Session</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Session Name</label>
            <input
              style={styles.input}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Session"
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Session Type</label>
            <select
              style={styles.select}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="day">Day Session (24h)</option>
              <option value="one_time">One-Time Session</option>
              <option value="recovery">Recovery Session</option>
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Symbol</label>
            <select
              style={styles.select}
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            >
              {VOLATILITY_INDICES.map((idx) => (
                <option key={idx.symbol} value={idx.symbol}>{idx.name}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Contract Type</label>
            <select
              style={styles.select}
              value={formData.contractType}
              onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
            >
              {Object.entries(CONTRACT_TYPES).map(([type, info]) => (
                <option key={type} value={type}>{info.name}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Staking Mode</label>
            <select
              style={styles.select}
              value={formData.stakingMode}
              onChange={(e) => setFormData({ ...formData, stakingMode: e.target.value })}
            >
              <option value="fixed">Fixed Stake</option>
              <option value="martingale">Martingale</option>
              <option value="compounding">Compounding (1% of balance)</option>
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Base Stake ($)</label>
            <input
              style={styles.input}
              type="number"
              min="0.35"
              step="0.01"
              value={formData.baseStake}
              onChange={(e) => setFormData({ ...formData, baseStake: parseFloat(e.target.value) })}
            />
          </div>
          
          {formData.stakingMode === 'martingale' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Martingale Multiplier</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1.5"
                  step="0.1"
                  value={formData.martingaleMultiplier}
                  onChange={(e) => setFormData({ ...formData, martingaleMultiplier: parseFloat(e.target.value) })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Max Martingale Steps</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxMartingaleSteps}
                  onChange={(e) => setFormData({ ...formData, maxMartingaleSteps: parseInt(e.target.value) })}
                />
              </div>
            </>
          )}
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Minimum Balance Required ($)</label>
            <input
              style={styles.input}
              type="number"
              min="10"
              value={formData.minimumBalance}
              onChange={(e) => setFormData({ ...formData, minimumBalance: parseFloat(e.target.value) })}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Invite Accounts</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--theme-border)', borderRadius: '8px', padding: '8px' }}>
              {accounts.map((account) => (
                <label key={account.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.inviteAccountIds?.includes(account.id)}
                    onChange={(e) => {
                      const ids = formData.inviteAccountIds || [];
                      if (e.target.checked) {
                        setFormData({ ...formData, inviteAccountIds: [...ids, account.id] });
                      } else {
                        setFormData({ ...formData, inviteAccountIds: ids.filter(id => id !== account.id) });
                      }
                    }}
                  />
                  {account.loginId} ({account.currency} ${account.balance.toFixed(2)})
                </label>
              ))}
              {accounts.length === 0 && (
                <div style={{ color: 'var(--theme-text-secondary)', padding: '20px', textAlign: 'center' }}>
                  No accounts available
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" style={{ ...styles.button, ...styles.buttonSecondary }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }}>
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminControlPanel;

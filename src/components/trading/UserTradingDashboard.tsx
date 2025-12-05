/**
 * User Trading Dashboard - Account Management & Session Participation
 * 
 * Individual user view for managing their accounts and sessions
 */

import React, { useState, useEffect } from 'react';
import {
  TradingAccount,
  TradingSession,
  SessionInvitation,
  TradeExecution,
  DigitStats,
} from '../../trading/types';
import { tradingBot } from '../../trading/botEngine';
import { sessionManager } from '../../trading/sessionManager';
import { calculateDigitStats } from '../../trading/strategyEngine';

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'var(--theme-background)',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--theme-text)',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--theme-text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: 'var(--theme-surface)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--theme-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  accountCard: {
    backgroundColor: 'var(--theme-surface)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '12px',
    border: '1px solid var(--theme-border)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  accountCardActive: {
    borderColor: 'var(--theme-primary)',
    boxShadow: '0 0 0 2px var(--theme-primary)20',
  },
  balanceDisplay: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--theme-text)',
    marginBottom: '4px',
  },
  profitDisplay: {
    fontSize: '18px',
    fontWeight: '600',
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
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: 'var(--theme-text)',
    border: '1px solid var(--theme-border)',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  buttonSmall: {
    padding: '6px 12px',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--theme-border)',
    backgroundColor: 'var(--theme-background)',
    color: 'var(--theme-text)',
    fontSize: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--theme-text-secondary)',
    marginBottom: '4px',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--theme-border)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  invitationCard: {
    backgroundColor: 'var(--theme-primary)10',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid var(--theme-primary)30',
  },
  tradeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid var(--theme-border)',
  },
  digitBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    height: '60px',
    marginTop: '12px',
  },
  digitColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  },
};

// ============================================
// USER TRADING DASHBOARD COMPONENT
// ============================================

const UserTradingDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [invitations, setInvitations] = useState<SessionInvitation[]>([]);
  const [activeSessions, setActiveSessions] = useState<TradingSession[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeExecution[]>([]);
  const [digitStats, setDigitStats] = useState<DigitStats | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  
  useEffect(() => {
    // Initial load
    updateData();
    
    // Refresh data periodically
    const interval = setInterval(updateData, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const updateData = () => {
    const accountManager = tradingBot.getAccountManager();
    const executor = tradingBot.getTradeExecutor();
    
    setAccounts(accountManager.getAllAccounts());
    setActiveSessions(sessionManager.getActiveSessions());
    setRecentTrades(executor.getRecentTrades(10));
    
    // Get invitations for first account (simplified)
    if (accounts.length > 0) {
      const invites = sessionManager.getPendingInvitations(accounts[0].id);
      setInvitations(invites);
    }
    
    // Get digit stats from tick buffer
    const tickBuffers = tradingBot.getTickBuffers();
    const symbols = tickBuffers.getAllSymbols();
    if (symbols.length > 0) {
      const ticks = tickBuffers.getTicks(symbols[0]);
      if (ticks.length >= 50) {
        setDigitStats(calculateDigitStats(ticks));
      }
    }
  };
  
  const getTotalBalance = () => accounts.reduce((sum, a) => sum + a.balance, 0);
  const getTotalProfit = () => accounts.reduce((sum, a) => sum + a.currentProfit, 0);
  const getActiveCount = () => accounts.filter(a => a.isInSession).length;
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Trading Dashboard</h1>
        <p style={styles.subtitle}>Manage your accounts and participate in trading sessions</p>
      </div>
      
      {/* Quick Stats */}
      <div style={styles.grid}>
        <QuickStatCard
          icon="💰"
          label="Total Balance"
          value={`$${getTotalBalance().toFixed(2)}`}
          color="var(--theme-primary)"
        />
        <QuickStatCard
          icon="📈"
          label="Today's P&L"
          value={`$${getTotalProfit().toFixed(2)}`}
          color={getTotalProfit() >= 0 ? '#22c55e' : '#ef4444'}
        />
        <QuickStatCard
          icon="🎯"
          label="Active Accounts"
          value={`${getActiveCount()} / ${accounts.length}`}
          color="var(--theme-primary)"
        />
        <QuickStatCard
          icon="📊"
          label="Total Trades"
          value={`${recentTrades.length}`}
          color="var(--theme-primary)"
        />
      </div>
      
      {/* Session Invitations */}
      {invitations.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '24px', borderLeft: '4px solid var(--theme-primary)' }}>
          <div style={styles.cardTitle}>📬 Session Invitations</div>
          {invitations.map((invite) => (
            <InvitationCard key={`${invite.sessionId}-${invite.accountId}`} invitation={invite} />
          ))}
        </div>
      )}
      
      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column - Accounts */}
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>👤 Your Accounts</div>
            </div>
            
            {accounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-secondary)' }}>
                No accounts connected. Connect your Deriv account to start trading.
              </div>
            ) : (
              accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isSelected={selectedAccount === account.id}
                  onSelect={() => setSelectedAccount(account.id)}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Right Column - Activity & Stats */}
        <div>
          {/* Digit Analysis */}
          {digitStats && (
            <div style={{ ...styles.card, marginBottom: '20px' }}>
              <div style={styles.cardTitle}>🔢 Digit Analysis</div>
              <DigitChart stats={digitStats} />
            </div>
          )}
          
          {/* Recent Trades */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>📜 Recent Trades</div>
            {recentTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--theme-text-secondary)' }}>
                No trades yet
              </div>
            ) : (
              recentTrades.slice(0, 5).map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div style={{ ...styles.card, marginTop: '24px' }}>
          <div style={styles.cardTitle}>🎯 Active Sessions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} userAccounts={accounts} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// QUICK STAT CARD
// ============================================

const QuickStatCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div style={styles.card}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '28px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color }}>{value}</div>
      </div>
    </div>
  </div>
);

// ============================================
// ACCOUNT CARD
// ============================================

const AccountCard: React.FC<{
  account: TradingAccount;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ account, isSelected, onSelect }) => {
  const [tpInput, setTpInput] = useState(account.takeProfit.toString());
  const [slInput, setSlInput] = useState(account.stopLoss.toString());
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'tp_reached': return '#22c55e';
      case 'sl_reached': return '#ef4444';
      case 'waiting': return '#3b82f6';
      default: return '#6b7280';
    }
  };
  
  // Calculate progress to TP/SL
  const tpProgress = Math.min(100, Math.max(0, (account.currentProfit / account.takeProfit) * 100));
  const slProgress = Math.min(100, Math.max(0, (Math.abs(account.currentProfit) / account.stopLoss) * 100));
  const isProfit = account.currentProfit >= 0;
  
  return (
    <div
      style={{
        ...styles.accountCard,
        ...(account.isInSession ? styles.accountCardActive : {}),
        cursor: 'pointer',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>
            {account.loginId}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            {account.isVirtual ? 'Demo' : 'Real'} • {account.currency}
          </div>
        </div>
        <span
          style={{
            ...styles.badge,
            backgroundColor: `${getStatusColor(account.status)}20`,
            color: getStatusColor(account.status),
          }}
        >
          {account.status}
        </span>
      </div>
      
      <div style={styles.balanceDisplay}>
        ${account.balance.toFixed(2)}
      </div>
      
      <div style={{ ...styles.profitDisplay, color: isProfit ? '#22c55e' : '#ef4444' }}>
        {isProfit ? '+' : ''}${account.currentProfit.toFixed(2)}
      </div>
      
      {account.isInSession && (
        <>
          {/* TP Progress */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={styles.label}>Take Profit Progress</span>
              <span style={{ fontSize: '12px', color: '#22c55e' }}>${account.takeProfit}</span>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${isProfit ? tpProgress : 0}%`,
                  backgroundColor: '#22c55e',
                }}
              />
            </div>
          </div>
          
          {/* SL Progress */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={styles.label}>Stop Loss Risk</span>
              <span style={{ fontSize: '12px', color: '#ef4444' }}>${account.stopLoss}</span>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${!isProfit ? slProgress : 0}%`,
                  backgroundColor: '#ef4444',
                }}
              />
            </div>
          </div>
        </>
      )}
      
      {isSelected && !account.isInSession && (
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={styles.label}>Take Profit ($)</label>
            <input
              style={styles.input}
              type="number"
              value={tpInput}
              onChange={(e) => setTpInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label style={styles.label}>Stop Loss ($)</label>
            <input
              style={styles.input}
              type="number"
              value={slInput}
              onChange={(e) => setSlInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// INVITATION CARD
// ============================================

const InvitationCard: React.FC<{ invitation: SessionInvitation }> = ({ invitation }) => {
  const session = sessionManager.getSession(invitation.sessionId);
  const [tp, setTp] = useState('50');
  const [sl, setSl] = useState('25');
  
  if (!session) return null;
  
  const handleAccept = () => {
    sessionManager.acceptSession(
      invitation.sessionId,
      invitation.accountId,
      parseFloat(tp),
      parseFloat(sl)
    );
  };
  
  const handleDecline = () => {
    sessionManager.declineSession(invitation.sessionId, invitation.accountId);
  };
  
  const timeLeft = Math.max(0, Math.floor((invitation.expiresAt - Date.now()) / 1000));
  
  return (
    <div style={styles.invitationCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--theme-text)' }}>
            {session.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>
            {session.symbol} • {session.contractType} • {session.stakingMode} stake
          </div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Expires in {timeLeft}s
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
        <div>
          <label style={styles.label}>Your Take Profit ($)</label>
          <input
            style={styles.input}
            type="number"
            value={tp}
            onChange={(e) => setTp(e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>Your Stop Loss ($)</label>
          <input
            style={styles.input}
            type="number"
            value={sl}
            onChange={(e) => setSl(e.target.value)}
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          style={{ ...styles.button, ...styles.buttonPrimary, flex: 1 }}
          onClick={handleAccept}
        >
          ✓ Accept & Join
        </button>
        <button
          style={{ ...styles.button, ...styles.buttonSecondary }}
          onClick={handleDecline}
        >
          ✗ Decline
        </button>
      </div>
    </div>
  );
};

// ============================================
// SESSION CARD
// ============================================

const SessionCard: React.FC<{
  session: TradingSession;
  userAccounts: TradingAccount[];
}> = ({ session, userAccounts }) => {
  const userAccountsInSession = userAccounts.filter(a => session.participantIds.includes(a.id));
  const winRate = session.totalTrades > 0 ? ((session.winCount / session.totalTrades) * 100).toFixed(1) : '0';
  
  return (
    <div style={{ ...styles.card, backgroundColor: 'var(--theme-background)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: '600', color: 'var(--theme-text)' }}>{session.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            {session.symbol} • {session.type.toUpperCase()}
          </div>
        </div>
        <span
          style={{
            ...styles.badge,
            backgroundColor: session.status === 'active' ? '#22c55e20' : '#6b728020',
            color: session.status === 'active' ? '#22c55e' : '#6b7280',
          }}
        >
          {session.status}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Trades</div>
          <div style={{ fontWeight: '600', color: 'var(--theme-text)' }}>{session.totalTrades}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Win Rate</div>
          <div style={{ fontWeight: '600', color: 'var(--theme-text)' }}>{winRate}%</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Profit</div>
          <div style={{ fontWeight: '600', color: session.totalProfit >= 0 ? '#22c55e' : '#ef4444' }}>
            ${session.totalProfit.toFixed(2)}
          </div>
        </div>
      </div>
      
      {userAccountsInSession.length > 0 && (
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Your accounts: {userAccountsInSession.map(a => a.loginId).join(', ')}
        </div>
      )}
    </div>
  );
};

// ============================================
// TRADE ROW
// ============================================

const TradeRow: React.FC<{ trade: TradeExecution }> = ({ trade }) => {
  const isWin = trade.outcome === 'win';
  
  return (
    <div style={styles.tradeRow}>
      <div>
        <div style={{ fontWeight: '500', color: 'var(--theme-text)' }}>
          {trade.contractType} @ ${trade.stake.toFixed(2)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          {new Date(trade.createdAt).toLocaleTimeString()}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: '600', color: isWin ? '#22c55e' : '#ef4444' }}>
          {isWin ? '+' : ''}${trade.profit.toFixed(2)}
        </div>
        <span
          style={{
            ...styles.badge,
            backgroundColor: isWin ? '#22c55e20' : '#ef444420',
            color: isWin ? '#22c55e' : '#ef4444',
          }}
        >
          {trade.outcome}
        </span>
      </div>
    </div>
  );
};

// ============================================
// DIGIT CHART
// ============================================

const DigitChart: React.FC<{ stats: DigitStats }> = ({ stats }) => {
  const maxCount = Math.max(...Object.values(stats.counts));
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Even: {stats.evenCount} ({((stats.evenCount / (stats.evenCount + stats.oddCount)) * 100).toFixed(1)}%)
        </span>
        <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Odd: {stats.oddCount} ({((stats.oddCount / (stats.evenCount + stats.oddCount)) * 100).toFixed(1)}%)
        </span>
      </div>
      
      <div style={styles.digitBar}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const count = stats.counts[digit];
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isEven = digit % 2 === 0;
          
          return (
            <div key={digit} style={styles.digitColumn}>
              <div
                style={{
                  width: '100%',
                  height: `${height}%`,
                  minHeight: '4px',
                  backgroundColor: isEven ? 'var(--theme-primary)' : '#8b5cf6',
                  borderRadius: '2px 2px 0 0',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>
                {digit}
              </span>
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
        Last digits: {stats.lastNDigits.slice(-10).join(' → ')}
      </div>
    </div>
  );
};

export default UserTradingDashboard;

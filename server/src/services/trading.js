/**
 * Trading Service - Backend service for multi-account automated trading
 */

const { supabase } = require('../db/supabase');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

// ==================== Constants ====================
const SESSION_TYPE = {
  DAY: 'day',
  ONE_TIME: 'one_time',
  RECOVERY: 'recovery',
};

const SESSION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  TP_REACHED: 'tp_reached',
  SL_REACHED: 'sl_reached',
  ERROR: 'error',
};

const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  DISABLED: 'disabled',
};

const CONTRACT_TYPES = {
  DIGITEVEN: 'DIGITEVEN',
  DIGITODD: 'DIGITODD',
  DIGITOVER: 'DIGITOVER',
  DIGITUNDER: 'DIGITUNDER',
  DIGITMATCH: 'DIGITMATCH',
  DIGITDIFF: 'DIGITDIFF',
  CALL: 'CALL',
  PUT: 'PUT',
};

const STRATEGY_NAMES = {
  DFPM: 'Digit Frequency Pattern Matching',
  VCS: 'Volatility Cluster Strategy',
  DER: 'Digit Entropy and Randomness',
  TPC: 'Temporal Pattern Cycle',
  DTP: 'Digit Transition Probability',
  DPB: 'Digit Pair Breakout',
  MTD: 'Mean Time Between Digits',
  RDS: 'Regime Detection Strategy',
};

const VOLATILITY_INDICES = [
  'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
  '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
];

const STAKING_MODE = {
  FIXED: 'fixed',
  MARTINGALE: 'martingale',
  COMPOUNDING: 'compounding',
};

// ==================== Trading Account Operations ====================

/**
 * Get all trading accounts for an admin
 */
async function getAdminAccounts(adminId) {
  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get accounts invited to a session
 */
async function getSessionAccounts(sessionId) {
  const { data, error } = await supabase
    .from('session_invitations')
    .select(`
      *,
      trading_accounts (*)
    `)
    .eq('session_id', sessionId);

  if (error) throw error;
  return data || [];
}

/**
 * Add a trading account
 */
async function addTradingAccount(adminId, accountData) {
  const { data, error } = await supabase
    .from('trading_accounts')
    .insert({
      id: uuidv4(),
      admin_id: adminId,
      account_id: accountData.accountId,
      deriv_token: accountData.derivToken,
      account_type: accountData.accountType || 'real',
      currency: accountData.currency || 'USD',
      balance: accountData.balance || 0,
      status: ACCOUNT_STATUS.ACTIVE,
      last_connected: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update trading account
 */
async function updateTradingAccount(accountId, updates) {
  const { data, error } = await supabase
    .from('trading_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete trading account
 */
async function deleteTradingAccount(accountId) {
  const { error } = await supabase
    .from('trading_accounts')
    .delete()
    .eq('id', accountId);

  if (error) throw error;
  return { success: true };
}

/**
 * Verify Deriv token by connecting to WebSocket
 */
async function verifyDerivToken(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    let timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ authorize: token }));
    });

    ws.on('message', (data) => {
      clearTimeout(timeout);
      const response = JSON.parse(data.toString());
      ws.close();

      if (response.error) {
        reject(new Error(response.error.message));
      } else if (response.authorize) {
        resolve({
          accountId: response.authorize.loginid,
          balance: response.authorize.balance,
          currency: response.authorize.currency,
          email: response.authorize.email,
          fullName: response.authorize.fullname,
          isVirtual: response.authorize.is_virtual === 1,
        });
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ==================== Trading Session Operations ====================

/**
 * Create a new trading session
 */
async function createSession(adminId, sessionData) {
  const sessionId = uuidv4();
  
  const { data, error } = await supabase
    .from('trading_sessions')
    .insert({
      id: sessionId,
      admin_id: adminId,
      name: sessionData.name || `Session ${new Date().toLocaleDateString()}`,
      type: sessionData.type || SESSION_TYPE.DAY,
      status: SESSION_STATUS.PENDING,
      volatility_index: sessionData.volatilityIndex || 'R_100',
      contract_type: sessionData.contractType || CONTRACT_TYPES.DIGITEVEN,
      strategy: sessionData.strategy || 'DFPM',
      staking_mode: sessionData.stakingMode || STAKING_MODE.FIXED,
      base_stake: sessionData.baseStake || 1.0,
      target_profit: sessionData.targetProfit || 10.0,
      stop_loss: sessionData.stopLoss || 5.0,
      current_pnl: 0,
      trade_count: 0,
      win_count: 0,
      loss_count: 0,
      settings: sessionData.settings || {},
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get session by ID
 */
async function getSession(sessionId) {
  const { data, error } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all sessions for admin
 */
async function getAdminSessions(adminId, options = {}) {
  let query = supabase
    .from('trading_sessions')
    .select('*')
    .eq('admin_id', adminId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.type) {
    query = query.eq('type', options.type);
  }

  query = query.order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Update session
 */
async function updateSession(sessionId, updates) {
  const { data, error } = await supabase
    .from('trading_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete session
 */
async function deleteSession(sessionId) {
  // First delete related invitations and trades
  await supabase.from('session_invitations').delete().eq('session_id', sessionId);
  await supabase.from('trades').delete().eq('session_id', sessionId);

  const { error } = await supabase
    .from('trading_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
  return { success: true };
}

// ==================== Session Invitation Operations ====================

/**
 * Create session invitation
 */
async function createInvitation(sessionId, accountId, adminId) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const { data, error } = await supabase
    .from('session_invitations')
    .insert({
      id: uuidv4(),
      session_id: sessionId,
      account_id: accountId,
      admin_id: adminId,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get pending invitations for an account
 */
async function getAccountInvitations(accountId) {
  const { data, error } = await supabase
    .from('session_invitations')
    .select(`
      *,
      trading_sessions (*)
    `)
    .eq('account_id', accountId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return data || [];
}

/**
 * Accept invitation
 */
async function acceptInvitation(invitationId, accountId) {
  const { data: invitation, error: fetchError } = await supabase
    .from('session_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('account_id', accountId)
    .single();

  if (fetchError) throw fetchError;

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation has expired');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation already processed');
  }

  const { data, error } = await supabase
    .from('session_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Decline invitation
 */
async function declineInvitation(invitationId, accountId) {
  const { data, error } = await supabase
    .from('session_invitations')
    .update({
      status: 'declined',
    })
    .eq('id', invitationId)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== Trade Operations ====================

/**
 * Record a trade
 */
async function recordTrade(tradeData) {
  const { data, error } = await supabase
    .from('trades')
    .insert({
      id: uuidv4(),
      session_id: tradeData.sessionId,
      account_id: tradeData.accountId,
      contract_id: tradeData.contractId,
      contract_type: tradeData.contractType,
      volatility_index: tradeData.volatilityIndex,
      strategy: tradeData.strategy,
      stake: tradeData.stake,
      payout: tradeData.payout || null,
      profit: tradeData.profit || null,
      entry_tick: tradeData.entryTick,
      exit_tick: tradeData.exitTick || null,
      prediction: tradeData.prediction,
      result: tradeData.result || 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Update session stats
  await updateSessionStats(tradeData.sessionId, tradeData);

  return data;
}

/**
 * Update trade result
 */
async function updateTradeResult(tradeId, result, profit, exitTick) {
  const { data, error } = await supabase
    .from('trades')
    .update({
      result,
      profit,
      exit_tick: exitTick,
      payout: result === 'won' ? profit : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tradeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get trades for a session
 */
async function getSessionTrades(sessionId, options = {}) {
  let query = supabase
    .from('trades')
    .select('*')
    .eq('session_id', sessionId);

  if (options.accountId) {
    query = query.eq('account_id', options.accountId);
  }

  query = query.order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get trade statistics
 */
async function getTradeStats(sessionId, accountId = null) {
  let query = supabase
    .from('trades')
    .select('*')
    .eq('session_id', sessionId);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data: trades, error } = await query;
  if (error) throw error;

  const completedTrades = trades.filter(t => t.result !== 'pending');
  const wins = completedTrades.filter(t => t.result === 'won');
  const losses = completedTrades.filter(t => t.result === 'lost');

  return {
    totalTrades: trades.length,
    completedTrades: completedTrades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: completedTrades.length > 0 ? (wins.length / completedTrades.length) * 100 : 0,
    totalProfit: completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0),
    totalStake: completedTrades.reduce((sum, t) => sum + (t.stake || 0), 0),
  };
}

/**
 * Update session statistics after a trade
 */
async function updateSessionStats(sessionId, tradeData) {
  const { data: session, error: fetchError } = await supabase
    .from('trading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;

  const updates = {
    trade_count: (session.trade_count || 0) + 1,
  };

  if (tradeData.result === 'won') {
    updates.win_count = (session.win_count || 0) + 1;
    updates.current_pnl = (session.current_pnl || 0) + (tradeData.profit || 0);
  } else if (tradeData.result === 'lost') {
    updates.loss_count = (session.loss_count || 0) + 1;
    updates.current_pnl = (session.current_pnl || 0) - (tradeData.stake || 0);
  }

  // Check TP/SL conditions
  if (updates.current_pnl >= session.target_profit) {
    updates.status = SESSION_STATUS.TP_REACHED;
    updates.ended_at = new Date().toISOString();
  } else if (Math.abs(updates.current_pnl) >= session.stop_loss && updates.current_pnl < 0) {
    updates.status = SESSION_STATUS.SL_REACHED;
    updates.ended_at = new Date().toISOString();
  }

  await updateSession(sessionId, updates);
}

// ==================== Recovery State Operations ====================

/**
 * Save recovery state for a session
 */
async function saveRecoveryState(sessionId, recoveryData) {
  const { data, error } = await supabase
    .from('recovery_states')
    .upsert({
      session_id: sessionId,
      martingale_step: recoveryData.martingaleStep || 0,
      consecutive_losses: recoveryData.consecutiveLosses || 0,
      last_trade_result: recoveryData.lastTradeResult,
      accumulated_loss: recoveryData.accumulatedLoss || 0,
      recovery_target: recoveryData.recoveryTarget || 0,
      state_data: recoveryData.stateData || {},
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recovery state for a session
 */
async function getRecoveryState(sessionId) {
  const { data, error } = await supabase
    .from('recovery_states')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ==================== Activity Log Operations ====================

/**
 * Log activity
 */
async function logActivity(type, message, metadata = {}) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      id: uuidv4(),
      type,
      message,
      metadata,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log activity:', error);
  }
  return data;
}

/**
 * Get activity logs
 */
async function getActivityLogs(options = {}) {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ==================== Bot Control Operations ====================

// In-memory bot state (in production, use Redis or similar)
const botState = {
  isRunning: false,
  activeSessions: new Map(),
  connections: new Map(),
};

/**
 * Start the trading bot
 */
async function startBot() {
  if (botState.isRunning) {
    return { success: false, message: 'Bot is already running' };
  }

  botState.isRunning = true;
  await logActivity('bot_start', 'Trading bot started');
  
  return { success: true, message: 'Bot started successfully' };
}

/**
 * Stop the trading bot
 */
async function stopBot() {
  if (!botState.isRunning) {
    return { success: false, message: 'Bot is not running' };
  }

  // Close all WebSocket connections
  for (const [accountId, ws] of botState.connections) {
    try {
      ws.close();
    } catch (err) {
      console.error(`Error closing connection for ${accountId}:`, err);
    }
  }
  botState.connections.clear();
  botState.activeSessions.clear();
  botState.isRunning = false;

  await logActivity('bot_stop', 'Trading bot stopped');
  
  return { success: true, message: 'Bot stopped successfully' };
}

/**
 * Get bot status
 */
function getBotStatus() {
  return {
    isRunning: botState.isRunning,
    activeSessionCount: botState.activeSessions.size,
    connectionCount: botState.connections.size,
    uptime: botState.startTime ? Date.now() - botState.startTime : 0,
  };
}

// ==================== Exports ====================

module.exports = {
  // Constants
  SESSION_TYPE,
  SESSION_STATUS,
  ACCOUNT_STATUS,
  CONTRACT_TYPES,
  STRATEGY_NAMES,
  VOLATILITY_INDICES,
  STAKING_MODE,
  
  // Account operations
  getAdminAccounts,
  getSessionAccounts,
  addTradingAccount,
  updateTradingAccount,
  deleteTradingAccount,
  verifyDerivToken,
  
  // Session operations
  createSession,
  getSession,
  getAdminSessions,
  updateSession,
  deleteSession,
  
  // Invitation operations
  createInvitation,
  getAccountInvitations,
  acceptInvitation,
  declineInvitation,
  
  // Trade operations
  recordTrade,
  updateTradeResult,
  getSessionTrades,
  getTradeStats,
  
  // Recovery operations
  saveRecoveryState,
  getRecoveryState,
  
  // Activity operations
  logActivity,
  getActivityLogs,
  
  // Bot control
  startBot,
  stopBot,
  getBotStatus,
  
  // State
  botState,
};

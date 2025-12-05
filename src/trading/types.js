/**
 * Deriv WebSocket Multi-Account Automated Trading System
 * Type Definitions and Constants
 */

// ============================================
// ACCOUNT STATUS CONSTANTS
// ============================================

export const ACCOUNT_STATUS = {
  IDLE: 'idle',
  WAITING: 'waiting',
  ACTIVE: 'active',
  TP_REACHED: 'tp_reached',
  SL_REACHED: 'sl_reached',
  PAUSED: 'paused',
  ERROR: 'error',
};

// ============================================
// SESSION STATUS CONSTANTS
// ============================================

export const SESSION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  RECOVERY: 'recovery',
};

export const SESSION_TYPES = {
  DAY: 'day',
  ONE_TIME: 'one_time',
  RECOVERY: 'recovery',
};

// ============================================
// CONTRACT TYPES
// ============================================

export const CONTRACT_TYPES = {
  DIGITEVEN: { name: 'Digit Even', category: 'digit' },
  DIGITODD: { name: 'Digit Odd', category: 'digit' },
  DIGITOVER: { name: 'Digit Over', category: 'digit' },
  DIGITUNDER: { name: 'Digit Under', category: 'digit' },
  DIGITMATCH: { name: 'Digit Match', category: 'digit' },
  DIGITDIFF: { name: 'Digit Differs', category: 'digit' },
  CALL: { name: 'Rise/Higher', category: 'up_down' },
  PUT: { name: 'Fall/Lower', category: 'up_down' },
};

// ============================================
// STRATEGY NAMES
// ============================================

export const STRATEGY_NAMES = {
  DFPM: 'DFPM',  // Digit Frequency Pattern Matcher
  VCS: 'VCS',   // Velocity-Crossover Strategy
  DER: 'DER',   // Digit Even/Odd Ratio
  TPC: 'TPC',   // Trend Prediction by Clustering
  DTP: 'DTP',   // Digit Transition Probability
  DPB: 'DPB',   // Digit Pattern Breakout
  MTD: 'MTD',   // Mean/Trend Divergence
  RDS: 'RDS',   // Recent Digit Streak
};

// ============================================
// NOTIFICATION TYPES
// ============================================

export const NOTIFICATION_TYPES = {
  SESSION_CREATED: 'session_created',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  TRADE_EXECUTED: 'trade_executed',
  TP_REACHED: 'tp_reached',
  SL_REACHED: 'sl_reached',
  RECOVERY_STARTED: 'recovery_started',
  ERROR: 'error',
  WARNING: 'warning',
};

// ============================================
// TRADE STATUS
// ============================================

export const TRADE_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  SETTLED: 'settled',
  CANCELLED: 'cancelled',
  ERROR: 'error',
};

// ============================================
// VOLATILITY INDICES
// ============================================

export const VOLATILITY_INDICES = [
  { symbol: 'R_10', name: 'Volatility 10 Index', minStake: 0.35 },
  { symbol: 'R_25', name: 'Volatility 25 Index', minStake: 0.35 },
  { symbol: 'R_50', name: 'Volatility 50 Index', minStake: 0.35 },
  { symbol: 'R_75', name: 'Volatility 75 Index', minStake: 0.35 },
  { symbol: 'R_100', name: 'Volatility 100 Index', minStake: 0.35 },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index', minStake: 0.35 },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index', minStake: 0.35 },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index', minStake: 0.35 },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', minStake: 0.35 },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', minStake: 0.35 },
];

// ============================================
// SESSION DEFAULTS
// ============================================

export const SESSION_DEFAULTS = {
  DAY: {
    minimumBalance: 100,
    duration: 24 * 60 * 60 * 1000, // 24 hours
  },
  ONE_TIME: {
    minimumBalance: 50,
    duration: null, // Until TP or SL
  },
  RECOVERY: {
    minimumBalance: 200,
    maxAttempts: 5,
    cooldown: 300, // 5 minutes
  },
};

// ============================================
// CONFIDENCE THRESHOLD
// ============================================

export const CONFIDENCE_THRESHOLD = 0.5;

// ============================================
// FACTORY FUNCTIONS FOR CREATING OBJECTS
// ============================================

/**
 * Create a new trading account object
 */
export function createTradingAccount(data) {
  return {
    id: data.id || '',
    loginId: data.loginId || '',
    token: data.token || '',
    currency: data.currency || 'USD',
    balance: data.balance || 0,
    isVirtual: data.isVirtual || false,
    accountType: data.accountType || 'trading',
    takeProfit: data.takeProfit || 50,
    stopLoss: data.stopLoss || 25,
    currentProfit: data.currentProfit || 0,
    isInSession: data.isInSession || false,
    sessionId: data.sessionId || null,
    status: data.status || ACCOUNT_STATUS.IDLE,
    lastTradeTime: data.lastTradeTime || null,
  };
}

/**
 * Create a new trading session object
 */
export function createTradingSession(data) {
  return {
    id: data.id || '',
    type: data.type || SESSION_TYPES.DAY,
    name: data.name || '',
    symbol: data.symbol || 'R_100',
    contractType: data.contractType || 'DIGITEVEN',
    stakingMode: data.stakingMode || 'fixed',
    baseStake: data.baseStake || 1,
    martingaleMultiplier: data.martingaleMultiplier || 2,
    maxMartingaleSteps: data.maxMartingaleSteps || 5,
    minimumBalance: data.minimumBalance || 100,
    status: data.status || SESSION_STATUS.PENDING,
    createdAt: data.createdAt || Date.now(),
    startedAt: data.startedAt || null,
    endedAt: data.endedAt || null,
    participantIds: data.participantIds || [],
    totalTrades: data.totalTrades || 0,
    winCount: data.winCount || 0,
    lossCount: data.lossCount || 0,
    totalProfit: data.totalProfit || 0,
    createdBy: data.createdBy || '',
    manualOverrideActive: data.manualOverrideActive || false,
    forcedDirection: data.forcedDirection || null,
  };
}

/**
 * Create a new trade execution object
 */
export function createTradeExecution(data) {
  return {
    id: data.id || '',
    sessionId: data.sessionId || '',
    accountId: data.accountId || '',
    symbol: data.symbol || '',
    contractType: data.contractType || '',
    stake: data.stake || 0,
    barrier: data.barrier || null,
    proposalId: data.proposalId || '',
    contractId: data.contractId || null,
    entryPrice: data.entryPrice || 0,
    entryTick: data.entryTick || 0,
    status: data.status || TRADE_STATUS.PENDING,
    outcome: data.outcome || 'pending',
    payout: data.payout || 0,
    profit: data.profit || 0,
    createdAt: data.createdAt || Date.now(),
    executedAt: data.executedAt || null,
    settledAt: data.settledAt || null,
    signal: data.signal || null,
    martingaleStep: data.martingaleStep || 0,
  };
}

/**
 * Create a notification object
 */
export function createNotification(data) {
  return {
    id: data.id || '',
    type: data.type || '',
    title: data.title || '',
    message: data.message || '',
    data: data.data || null,
    timestamp: data.timestamp || Date.now(),
    read: data.read || false,
    accountId: data.accountId || null,
    sessionId: data.sessionId || null,
  };
}

/**
 * Create a session invitation object
 */
export function createSessionInvitation(data) {
  return {
    sessionId: data.sessionId || '',
    accountId: data.accountId || '',
    sentAt: data.sentAt || Date.now(),
    status: data.status || 'pending',
    expiresAt: data.expiresAt || Date.now() + (5 * 60 * 1000),
  };
}

/**
 * Create a recovery state object
 */
export function createRecoveryState(data) {
  return {
    isActive: data.isActive !== undefined ? data.isActive : true,
    lossToRecover: data.lossToRecover || 0,
    recoveredAmount: data.recoveredAmount || 0,
    attemptCount: data.attemptCount || 0,
    startedAt: data.startedAt || Date.now(),
    currentStake: data.currentStake || 0,
  };
}

/**
 * Create a tick data object
 */
export function createTickData(data) {
  return {
    symbol: data.symbol || '',
    epoch: data.epoch || 0,
    quote: data.quote || 0,
    digit: data.digit || 0,
  };
}

/**
 * Create digit stats object
 */
export function createDigitStats(data) {
  return {
    counts: data.counts || { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    evenCount: data.evenCount || 0,
    oddCount: data.oddCount || 0,
    lastNDigits: data.lastNDigits || [],
    streaks: data.streaks || { even: 0, odd: 0, rising: 0, falling: 0 },
  };
}

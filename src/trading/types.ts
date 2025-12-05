/**
 * Deriv WebSocket Multi-Account Automated Trading System
 * Type Definitions
 */

// ============================================
// ACCOUNT & USER TYPES
// ============================================

export interface TradingAccount {
  id: string;
  loginId: string;        // Deriv account login ID (e.g., CR12345)
  token: string;          // OAuth token for this account
  currency: string;
  balance: number;
  isVirtual: boolean;
  accountType: 'trading' | 'wallet';
  
  // Trading settings per account
  takeProfit: number;     // Target profit in currency
  stopLoss: number;       // Max loss in currency
  currentProfit: number;  // Running P&L for current session
  
  // Session state
  isInSession: boolean;
  sessionId: string | null;
  status: AccountStatus;
  lastTradeTime: number | null;
}

export type AccountStatus = 
  | 'idle'              // Not in any session
  | 'waiting'           // Waiting to accept session
  | 'active'            // Trading in session
  | 'tp_reached'        // Take profit hit
  | 'sl_reached'        // Stop loss hit
  | 'paused'            // Manually paused
  | 'error';            // Error state

export interface UserSettings {
  userId: string;
  accounts: TradingAccount[];
  defaultTakeProfit: number;
  defaultStopLoss: number;
  notificationsEnabled: boolean;
  telegramChatId?: string;
  emailNotifications: boolean;
  soundAlerts: boolean;
  autoAcceptSessions: boolean;
}

// ============================================
// SESSION TYPES
// ============================================

export type SessionType = 'day' | 'one_time' | 'recovery';

export interface TradingSession {
  id: string;
  type: SessionType;
  name: string;
  
  // Session parameters
  symbol: string;           // e.g., 'R_100'
  contractType: ContractType;
  stakingMode: 'fixed' | 'martingale' | 'compounding';
  baseStake: number;
  martingaleMultiplier: number;  // For martingale mode
  maxMartingaleSteps: number;
  
  // Balance requirements
  minimumBalance: number;
  
  // Session state
  status: SessionStatus;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  
  // Participants
  participantIds: string[];  // Account IDs that accepted
  
  // Stats
  totalTrades: number;
  winCount: number;
  lossCount: number;
  totalProfit: number;
  
  // Admin controls
  createdBy: string;        // Admin user ID
  manualOverrideActive: boolean;
  forcedDirection?: 'CALL' | 'PUT';
}

export type SessionStatus = 
  | 'pending'     // Created, waiting for accepts
  | 'active'      // Running
  | 'paused'      // Temporarily paused
  | 'completed'   // Ended normally
  | 'stopped'     // Manually stopped
  | 'recovery';   // In recovery mode

export type ContractType = 
  | 'DIGITEVEN'
  | 'DIGITODD'
  | 'DIGITOVER'
  | 'DIGITUNDER'
  | 'DIGITMATCH'
  | 'DIGITDIFF'
  | 'CALL'
  | 'PUT';

export interface SessionInvitation {
  sessionId: string;
  accountId: string;
  sentAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: number;
}

// ============================================
// STRATEGY TYPES
// ============================================

export type StrategyName = 
  | 'DFPM'  // Digit Frequency Pattern Matcher
  | 'VCS'   // Velocity-Crossover Strategy
  | 'DER'   // Digit Even/Odd Ratio
  | 'TPC'   // Trend Prediction by Clustering
  | 'DTP'   // Digit Transition Probability
  | 'DPB'   // Digit Pattern Breakout
  | 'MTD'   // Mean/Trend Divergence
  | 'RDS';  // Recent Digit Streak

export interface StrategyConfig {
  name: StrategyName;
  enabled: boolean;
  weight: number;        // Weight for ensemble voting
  parameters: Record<string, number>;
}

export interface StrategySignal {
  strategy: StrategyName;
  direction: 'CALL' | 'PUT' | 'EVEN' | 'ODD' | number;  // number for digit match
  confidence: number;    // 0 to 1
  timestamp: number;
  reasoning: string;
}

export interface AggregatedSignal {
  direction: 'CALL' | 'PUT' | 'EVEN' | 'ODD' | number | null;
  confidence: number;
  signals: StrategySignal[];
  shouldTrade: boolean;
  timestamp: number;
}

export const CONFIDENCE_THRESHOLD = 0.5;

// ============================================
// TRADE TYPES
// ============================================

export interface TradeExecution {
  id: string;
  sessionId: string;
  accountId: string;
  
  // Trade parameters
  symbol: string;
  contractType: ContractType;
  stake: number;
  barrier?: number;       // For digit match/diff
  
  // Execution details
  proposalId: string;
  contractId: number | null;
  entryPrice: number;
  entryTick: number;
  
  // Result
  status: TradeStatus;
  outcome: 'win' | 'loss' | 'pending' | 'cancelled';
  payout: number;
  profit: number;
  
  // Timing
  createdAt: number;
  executedAt: number | null;
  settledAt: number | null;
  
  // Strategy info
  signal: AggregatedSignal;
  martingaleStep: number;  // 0 = base, 1+ = martingale steps
}

export type TradeStatus = 
  | 'pending'     // Waiting for execution
  | 'open'        // Contract purchased
  | 'settled'     // Contract settled
  | 'cancelled'   // Cancelled before execution
  | 'error';      // Execution failed

// ============================================
// TICK & MARKET DATA TYPES
// ============================================

export interface TickData {
  symbol: string;
  epoch: number;
  quote: number;
  digit: number;          // Last digit (0-9)
}

export interface TickBuffer {
  symbol: string;
  ticks: TickData[];
  maxSize: number;        // Default 100
  lastUpdated: number;
}

export interface DigitStats {
  counts: Record<number, number>;  // 0-9 frequency
  evenCount: number;
  oddCount: number;
  lastNDigits: number[];
  streaks: {
    even: number;
    odd: number;
    rising: number;
    falling: number;
  };
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'session_created'
  | 'session_started'
  | 'session_ended'
  | 'trade_executed'
  | 'tp_reached'
  | 'sl_reached'
  | 'recovery_started'
  | 'error'
  | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  accountId?: string;
  sessionId?: string;
}

// ============================================
// LOG & HISTORY TYPES
// ============================================

export interface TradeLog {
  id: string;
  timestamp: number;
  sessionId: string;
  accountId: string;
  tradeId: string;
  
  action: 'trade' | 'tp_hit' | 'sl_hit' | 'session_join' | 'session_leave';
  details: string;
  profit?: number;
  balance?: number;
}

export interface SessionHistory {
  sessionId: string;
  type: SessionType;
  symbol: string;
  startedAt: number;
  endedAt: number;
  duration: number;       // in seconds
  
  // Aggregate stats
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
  maxDrawdown: number;
  
  // Participant stats
  participants: {
    accountId: string;
    profit: number;
    trades: number;
    tpHit: boolean;
    slHit: boolean;
  }[];
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminDashboard {
  activeSessions: TradingSession[];
  totalAccounts: number;
  activeAccounts: number;
  todayProfit: number;
  todayTrades: number;
  systemStatus: 'running' | 'paused' | 'maintenance';
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: AdminActionType;
  targetSessionId?: string;
  targetAccountId?: string;
  parameters?: Record<string, any>;
  timestamp: number;
  result: 'success' | 'failed';
  notes?: string;
}

export type AdminActionType = 
  | 'create_session'
  | 'stop_session'
  | 'pause_session'
  | 'resume_session'
  | 'force_direction'
  | 'kick_account'
  | 'adjust_stake'
  | 'trigger_recovery'
  | 'system_pause'
  | 'system_resume';

// ============================================
// RECOVERY MODE TYPES
// ============================================

export interface RecoveryConfig {
  enabled: boolean;
  maxRecoveryAttempts: number;
  recoveryStakeMultiplier: number;
  cooldownSeconds: number;
  targetRecoveryPercent: number;  // e.g., 50% of loss
}

export interface RecoveryState {
  isActive: boolean;
  lossToRecover: number;
  recoveredAmount: number;
  attemptCount: number;
  startedAt: number | null;
  currentStake: number;
}

// ============================================
// SYSTEM STATE TYPE
// ============================================

export interface TradingSystemState {
  // Global state
  isRunning: boolean;
  systemStatus: 'initializing' | 'running' | 'paused' | 'error' | 'maintenance';
  lastError: string | null;
  
  // Tick streaming
  activeSymbols: string[];
  tickBuffers: Map<string, TickBuffer>;
  
  // Sessions
  activeSessions: Map<string, TradingSession>;
  sessionInvitations: SessionInvitation[];
  
  // Accounts
  accounts: Map<string, TradingAccount>;
  
  // Trades
  openTrades: Map<string, TradeExecution>;
  recentTrades: TradeExecution[];
  
  // Recovery
  recoveryStates: Map<string, RecoveryState>;  // keyed by accountId
  
  // Performance
  startTime: number;
  totalTrades: number;
  totalProfit: number;
  uptime: number;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateSessionRequest {
  type: SessionType;
  name: string;
  symbol: string;
  contractType: ContractType;
  stakingMode: 'fixed' | 'martingale' | 'compounding';
  baseStake: number;
  martingaleMultiplier?: number;
  maxMartingaleSteps?: number;
  minimumBalance: number;
  inviteAccountIds: string[];
}

export interface JoinSessionRequest {
  sessionId: string;
  accountId: string;
  takeProfit: number;
  stopLoss: number;
}

export interface AdminOverrideRequest {
  sessionId: string;
  action: 'force_direction' | 'pause' | 'resume' | 'stop';
  direction?: 'CALL' | 'PUT';
  reason?: string;
}

// ============================================
// CONSTANTS
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

export const CONTRACT_TYPES: Record<ContractType, { name: string; category: string }> = {
  DIGITEVEN: { name: 'Digit Even', category: 'digit' },
  DIGITODD: { name: 'Digit Odd', category: 'digit' },
  DIGITOVER: { name: 'Digit Over', category: 'digit' },
  DIGITUNDER: { name: 'Digit Under', category: 'digit' },
  DIGITMATCH: { name: 'Digit Match', category: 'digit' },
  DIGITDIFF: { name: 'Digit Differs', category: 'digit' },
  CALL: { name: 'Rise/Higher', category: 'up_down' },
  PUT: { name: 'Fall/Lower', category: 'up_down' },
};

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

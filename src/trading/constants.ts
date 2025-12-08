/**
 * Trading System Constants
 * All enums, contract types, strategies, and configuration values
 */

// Session Types
export const SESSION_TYPE = {
    DAY: 'day',
    ONE_TIME: 'one_time',
    RECOVERY: 'recovery'
} as const;

export type SessionTypeValue = typeof SESSION_TYPE[keyof typeof SESSION_TYPE];

// Session Status
export const SESSION_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    TP_REACHED: 'tp_reached',
    SL_REACHED: 'sl_reached',
    ERROR: 'error'
} as const;

export type SessionStatusValue = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

// Account Status
export const ACCOUNT_STATUS = {
    ACTIVE: 'active',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    DISABLED: 'disabled'
} as const;

export type AccountStatusValue = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS];

// Contract Types for Digit Trading
export const CONTRACT_TYPE = {
    DIGITEVEN: 'DIGITEVEN',
    DIGITODD: 'DIGITODD',
    DIGITOVER: 'DIGITOVER',
    DIGITUNDER: 'DIGITUNDER',
    DIGITMATCH: 'DIGITMATCH',
    DIGITDIFF: 'DIGITDIFF',
    CALL: 'CALL',
    PUT: 'PUT'
} as const;

export type ContractTypeValue = typeof CONTRACT_TYPE[keyof typeof CONTRACT_TYPE];

// Trading Strategies
export const STRATEGY = {
    DFPM: 'DFPM',  // Digit Frequency Pattern Matching
    VCS: 'VCS',   // Volatility Cluster Strategy
    DER: 'DER',   // Digit Entropy and Randomness
    TPC: 'TPC',   // Temporal Pattern Cycle
    DTP: 'DTP',   // Digit Transition Probability
    DPB: 'DPB',   // Digit Pair Breakout
    MTD: 'MTD',   // Mean Time Between Digits
    RDS: 'RDS'    // Regime Detection Strategy
} as const;

export type StrategyValue = typeof STRATEGY[keyof typeof STRATEGY];

export const STRATEGY_NAMES: Record<StrategyValue, string> = {
    DFPM: 'Digit Frequency Pattern Matching',
    VCS: 'Volatility Cluster Strategy',
    DER: 'Digit Entropy and Randomness',
    TPC: 'Temporal Pattern Cycle',
    DTP: 'Digit Transition Probability',
    DPB: 'Digit Pair Breakout',
    MTD: 'Mean Time Between Digits',
    RDS: 'Regime Detection Strategy'
};

// Staking Modes
export const STAKING_MODE = {
    FIXED: 'fixed',
    MARTINGALE: 'martingale',
    COMPOUNDING: 'compounding'
} as const;

export type StakingModeValue = typeof STAKING_MODE[keyof typeof STAKING_MODE];

// Volatility Indices
export const VOLATILITY_INDEX: readonly string[] = [
    'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
    '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'
] as const;

// Notification Types
export const NOTIFICATION_TYPE = {
    SESSION_CREATED: 'session_created',
    SESSION_STARTED: 'session_started',
    SESSION_ENDED: 'session_ended',
    TRADE_EXECUTED: 'trade_executed',
    TP_REACHED: 'tp_reached',
    SL_REACHED: 'sl_reached',
    RECOVERY_STARTED: 'recovery_started',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
} as const;

export type NotificationTypeValue = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];

// Deriv WebSocket API
export const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3';
export const DERIV_APP_ID = process.env.REACT_APP_DERIV_APP_ID || '114042';

// Default Settings
export interface DefaultSettings {
    baseStake: number;
    targetProfit: number;
    stopLoss: number;
    maxMartingaleSteps: number;
    martingaleMultiplier: number;
    tickBufferSize: number;
    minTicksForAnalysis: number;
    invitationExpiryMinutes: number;
}

export const DEFAULT_SETTINGS: DefaultSettings = {
    baseStake: 1.0,
    targetProfit: 10.0,
    stopLoss: 5.0,
    maxMartingaleSteps: 5,
    martingaleMultiplier: 2.0,
    tickBufferSize: 100,
    minTicksForAnalysis: 20,
    invitationExpiryMinutes: 5
};

// Aliases for convenience (plural forms)
export const CONTRACT_TYPES = CONTRACT_TYPE;

export const VOLATILITY_INDICES: Record<string, string> = {
    R_10: 'R_10',
    R_25: 'R_25',
    R_50: 'R_50',
    R_75: 'R_75',
    R_100: 'R_100',
    '1HZ10V': '1HZ10V',
    '1HZ25V': '1HZ25V',
    '1HZ50V': '1HZ50V',
    '1HZ75V': '1HZ75V',
    '1HZ100V': '1HZ100V'
};

/**
 * Session Management Types
 * Comprehensive types for the Advanced Session Management system
 */

// Account Types
export type AccountType = 'demo' | 'real';

// Session Status
export type SessionStatus = 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';

// Trade Status
export type TradeStatus = 'open' | 'won' | 'lost' | 'cancelled';

// Contract Types
export type ContractType =
    | 'DIGITOVER'
    | 'DIGITUNDER'
    | 'DIGITDIFF'
    | 'DIGITMATCH'
    | 'DIGITEVEN'
    | 'DIGITODD'
    | 'CALL'
    | 'PUT';

// Strategy Types
export type StrategyType = 'DFPM' | 'VCS' | 'MARKOV' | 'RSI_TREND' | 'CUSTOM';

// Trade/Contract Info
export interface TradeInfo {
    id: string;
    contractId: string;
    type: ContractType;
    symbol: string;
    entryPrice: number;
    currentPrice?: number;
    stake: number;
    payout: number;
    potentialPayout: number;
    expiry: string;
    expiryTime: number; // seconds remaining
    status: TradeStatus;
    profit?: number;
    digit?: number;
    barrier?: number;
    createdAt: string;
}

// Session Analytics
export interface SessionAnalytics {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    totalStake: number;
    averageProfit: number;
    largestWin: number;
    largestLoss: number;
    maxDrawdown: number;
    currentStreak: number;
    streakType: 'win' | 'loss' | 'none';
    profitFactor: number;
    averageTradeDuration: number;
}

// Managed Session
export interface ManagedSession {
    id: string;
    name: string;
    userId: string;
    userName?: string;
    accountId: string;
    accountType: AccountType;
    status: SessionStatus;
    symbols: string[];
    activeSymbol?: string;
    balance: number;
    startingBalance: number;
    pnl: number;
    startTime: string;
    endTime?: string;
    duration: number; // seconds
    trades: TradeInfo[];
    openTrades: TradeInfo[];
    tp: number;
    sl: number;
    currentExposure: number;
    strategy?: StrategyType;
    strategyLabel?: string;
    analytics: SessionAnalytics;
    lastUpdate: string;
    error?: string;
}

// Session Filter Options
export interface SessionFilters {
    accountType?: AccountType | 'all';
    status?: SessionStatus | 'all';
    symbol?: string | 'all';
    strategy?: StrategyType | 'all';
    search?: string;
    sortBy?: 'pnl' | 'startTime' | 'duration' | 'trades' | 'balance';
    sortOrder?: 'asc' | 'desc';
}

// Alert Types
export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'profit' | 'loss' | 'tp_hit' | 'sl_hit';

export interface SessionAlert {
    id: string;
    sessionId: string;
    type: AlertType;
    title: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
    soundPlayed: boolean;
}

// Audit Log Entry
export interface AuditLogEntry {
    id: string;
    userId: string;
    userName?: string;
    sessionId?: string;
    action: string;
    details: Record<string, any>;
    timestamp: string;
    ipAddress?: string;
}

// Risk Metrics
export interface RiskMetrics {
    totalExposure: number;
    maxExposure: number;
    accountRiskPercent: number;
    dailyLossLimit: number;
    currentDailyLoss: number;
    consecutiveLosses: number;
    maxConsecutiveLosses: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Panel Layout Config
export interface PanelConfig {
    id: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    visible: boolean;
    minimized: boolean;
}

// Theme
export type ThemeMode = 'dark' | 'light';

// WebSocket Event Types
export interface WSSessionUpdate {
    type: 'session_update';
    sessionId: string;
    data: Partial<ManagedSession>;
}

export interface WSTradeUpdate {
    type: 'trade_update';
    sessionId: string;
    trade: TradeInfo;
    action: 'open' | 'close' | 'update';
}

export interface WSTickUpdate {
    type: 'tick_update';
    symbol: string;
    tick: number;
    timestamp: string;
}

export interface WSAlertEvent {
    type: 'alert';
    sessionId: string;
    alert: SessionAlert;
}

export type WSEvent = WSSessionUpdate | WSTradeUpdate | WSTickUpdate | WSAlertEvent;

// API Response Types
export interface SessionsResponse {
    success: boolean;
    data: ManagedSession[];
    total: number;
}

export interface SessionActionResponse {
    success: boolean;
    message: string;
    session?: ManagedSession;
}

// Bulk Operation
export interface BulkOperation {
    action: 'start' | 'pause' | 'resume' | 'stop';
    sessionIds: string[];
}

// Chart Data Point
export interface ChartDataPoint {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

// P/L Data Point
export interface PLDataPoint {
    timestamp: string;
    pnl: number;
    cumulative: number;
    tradeId?: string;
}

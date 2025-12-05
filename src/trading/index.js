/**
 * Trading Module - Main Export Index
 * 
 * Exports all trading system components
 */

// Types and Constants
export {
  ACCOUNT_STATUS,
  SESSION_TYPE,
  SESSION_STATUS,
  CONTRACT_TYPES,
  STAKING_MODES,
  NOTIFICATION_TYPES,
  STRATEGY_NAMES,
  VOLATILITY_INDICES,
  TRADE_STATUS,
  SESSION_DEFAULTS,
  CONFIDENCE_THRESHOLD,
  createTradingAccount,
  createTradingSession,
  createStrategySignal,
  createDigitStats,
  createTradeExecution,
  createAppNotification,
  createRecoveryState,
} from './types.js';

// Strategy Engine
export {
  calculateDigitStats,
  strategyDFPM,
  strategyVCS,
  strategyDER,
  strategyTPC,
  strategyDTP,
  strategyDPB,
  strategyMTD,
  strategyRDS,
  runAllStrategies,
  aggregateSignals,
  analyzeTicksForSignal,
  DEFAULT_STRATEGY_CONFIGS,
} from './strategyEngine.js';

// Session Manager
export {
  SessionManager,
  sessionManager,
} from './sessionManager.js';

// Trade Executor
export {
  TradeExecutor,
  createTradeExecutor,
} from './tradeExecutor.js';

// Bot Engine
export {
  TradingBotEngine,
  tradingBot,
} from './botEngine.js';

// Notification Service
export {
  notificationService,
  requestNotificationPermission,
  sendBrowserNotification,
  useNotifications,
} from './notificationService.js';

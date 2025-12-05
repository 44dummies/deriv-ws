/**
 * Trading System - Main Export Index
 * 
 * Exports all trading system components for easy importing
 */

// Types
export * from './types';

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
} from './strategyEngine';

// Session Manager
export { SessionManager, sessionManager } from './sessionManager';

// Trade Executor
export { TradeExecutor, createTradeExecutor } from './tradeExecutor';

// Bot Engine
export { TradingBotEngine, tradingBot } from './botEngine';

// Notification Service
export {
  notificationService,
  useNotifications,
  requestNotificationPermission,
  sendBrowserNotification,
} from './notificationService';

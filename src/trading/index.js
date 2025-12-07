/**
 * Trading Module - Main exports
 */

// Constants
export * from './constants';

// Strategy Engine
export { 
  calculateDigitStats,
  runDFPM, runVCS, runDER, runTPC, runDTP, runDPB, runMTD, runRDS,
  runAllStrategies, aggregateSignals, analyzeForSignal 
} from './strategyEngine';

// WebSocket Services
export { 
  createDerivConnection, subscribeTicks, unsubscribeTicks,
  getProposal, buyContract, subscribeContract,
  MultiAccountManager, accountManager 
} from './derivWebSocket';

// API Client
export * as tradingApi from './tradingApi';

// React Hooks
export { 
  useAccounts, useSessions, useSession, 
  useTickStream, useBotStatus, useActivityLogs 
} from './hooks';

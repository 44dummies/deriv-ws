/**
 * Service container for Dependency Injection
 * Instantiates and wires up all services in the correct order to avoid circular dependencies.
 */

import { logger } from '../utils/logger.js';

// Base Services
import { sessionRegistry } from './SessionRegistry.js'; // Singleton
import { marketDataService } from './MarketDataService.js'; // Singleton
import { quantEngine } from './QuantEngine.js'; // Singleton

// Dependent Services
import { QuantEngineAdapter } from './QuantEngineAdapter.js';
import { RiskGuard } from './RiskGuard.js';
import { ExecutionCore } from './ExecutionCore.js';
import { AutoTradingService } from './AutoTradingService.js';

logger.info('Initializing Service Container...');

// 1. Quant Engine Adapter (MarketData -> QuantEngine)
const quantAdapter = new QuantEngineAdapter(marketDataService, quantEngine);

// 2. Risk Guard (QuantEngine + SessionRegistry -> Risk Rules)
const riskGuard = new RiskGuard(quantEngine, sessionRegistry);

// 3. Execution Core (RiskGuard -> Trade Execution)
// ExecutionCore listens to RiskGuard events
const executionCore = new ExecutionCore(riskGuard);

// 4. Auto Trading Service (QuantEngine -> RiskGuard)
const autoTradingService = new AutoTradingService(quantEngine, riskGuard, sessionRegistry);

logger.info('Service Container initialized');

export {
    sessionRegistry,
    marketDataService,
    quantEngine,
    quantAdapter,
    riskGuard,
    executionCore,
    autoTradingService
};

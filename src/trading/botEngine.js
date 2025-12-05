/**
 * Trading Bot Engine - Main Runtime Loop
 * 
 * 24/7 tick streaming and automated trade execution
 * Coordinates strategy engine, session manager, and trade executor
 */

import websocketService from '../services/websocketService.js';
import CONFIG from '../config.js';
import { CONFIDENCE_THRESHOLD, VOLATILITY_INDICES } from './types.js';
import { analyzeTicksForSignal, DEFAULT_STRATEGY_CONFIGS } from './strategyEngine.js';
import { sessionManager } from './sessionManager.js';
import { createTradeExecutor } from './tradeExecutor.js';

// ============================================
// TICK BUFFER MANAGER
// ============================================

class TickBufferManager {
  constructor() {
    /** @type {Map<string, import('./types.js').TickBuffer>} */
    this.buffers = new Map();
    /** @type {number} */
    this.maxBufferSize = 100;
  }
  
  /**
   * Add a tick to the buffer
   * @param {import('./types.js').TickData} tick
   */
  addTick(tick) {
    const buffer = this.buffers.get(tick.symbol) || {
      symbol: tick.symbol,
      ticks: [],
      maxSize: this.maxBufferSize,
      lastUpdated: Date.now(),
    };
    
    buffer.ticks.push(tick);
    
    // Keep only last N ticks
    if (buffer.ticks.length > buffer.maxSize) {
      buffer.ticks = buffer.ticks.slice(-buffer.maxSize);
    }
    
    buffer.lastUpdated = Date.now();
    this.buffers.set(tick.symbol, buffer);
  }
  
  /**
   * Get ticks for a symbol
   * @param {string} symbol
   * @returns {import('./types.js').TickData[]}
   */
  getTicks(symbol) {
    return this.buffers.get(symbol)?.ticks || [];
  }
  
  /**
   * Get buffer for a symbol
   * @param {string} symbol
   * @returns {import('./types.js').TickBuffer | undefined}
   */
  getBuffer(symbol) {
    return this.buffers.get(symbol);
  }
  
  /**
   * Check if we have enough ticks
   * @param {string} symbol
   * @param {number} [minCount=50]
   * @returns {boolean}
   */
  hasEnoughTicks(symbol, minCount = 50) {
    const buffer = this.buffers.get(symbol);
    return buffer ? buffer.ticks.length >= minCount : false;
  }
  
  /**
   * Clear buffers
   * @param {string} [symbol]
   */
  clear(symbol) {
    if (symbol) {
      this.buffers.delete(symbol);
    } else {
      this.buffers.clear();
    }
  }
  
  /**
   * Get all symbols
   * @returns {string[]}
   */
  getAllSymbols() {
    return Array.from(this.buffers.keys());
  }
}

// ============================================
// ACCOUNT MANAGER
// ============================================

/**
 * @typedef {Object} AccountEventAdded
 * @property {'account_added'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {Object} AccountEventUpdated
 * @property {'account_updated'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {Object} AccountEventRemoved
 * @property {'account_removed'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {Object} AccountEventTPReached
 * @property {'tp_reached'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {Object} AccountEventSLReached
 * @property {'sl_reached'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {AccountEventAdded | AccountEventUpdated | AccountEventRemoved | AccountEventTPReached | AccountEventSLReached} AccountEvent
 */

class AccountManager {
  constructor() {
    /** @type {Map<string, import('./types.js').TradingAccount>} */
    this.accounts = new Map();
    /** @type {Array<(event: AccountEvent) => void>} */
    this.listeners = [];
  }
  
  /**
   * Add an account
   * @param {import('./types.js').TradingAccount} account
   */
  addAccount(account) {
    this.accounts.set(account.id, account);
    this.emit({ type: 'account_added', account });
  }
  
  /**
   * Get an account by ID
   * @param {string} accountId
   * @returns {import('./types.js').TradingAccount | undefined}
   */
  getAccount(accountId) {
    return this.accounts.get(accountId);
  }
  
  /**
   * Get all accounts
   * @returns {import('./types.js').TradingAccount[]}
   */
  getAllAccounts() {
    return Array.from(this.accounts.values());
  }
  
  /**
   * Get active accounts
   * @returns {import('./types.js').TradingAccount[]}
   */
  getActiveAccounts() {
    return this.getAllAccounts().filter(a => a.status === 'active' && a.isInSession);
  }
  
  /**
   * Get accounts for a session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingAccount[]}
   */
  getAccountsForSession(sessionId) {
    return this.getAllAccounts().filter(a => a.sessionId === sessionId);
  }
  
  /**
   * Update an account
   * @param {string} accountId
   * @param {Partial<import('./types.js').TradingAccount>} updates
   * @returns {import('./types.js').TradingAccount | null}
   */
  updateAccount(accountId, updates) {
    const account = this.accounts.get(accountId);
    if (!account) return null;
    
    const updated = { ...account, ...updates };
    this.accounts.set(accountId, updated);
    this.emit({ type: 'account_updated', account: updated });
    
    return updated;
  }
  
  /**
   * Update account balance
   * @param {string} accountId
   * @param {number} balance
   */
  updateBalance(accountId, balance) {
    this.updateAccount(accountId, { balance });
  }
  
  /**
   * Update account profit
   * @param {string} accountId
   * @param {number} profitDelta
   */
  updateProfit(accountId, profitDelta) {
    const account = this.accounts.get(accountId);
    if (account) {
      const newProfit = account.currentProfit + profitDelta;
      this.updateAccount(accountId, { currentProfit: newProfit });
      
      // Check TP/SL
      if (newProfit >= account.takeProfit) {
        this.emit({ type: 'tp_reached', account: { ...account, currentProfit: newProfit } });
      } else if (newProfit <= -account.stopLoss) {
        this.emit({ type: 'sl_reached', account: { ...account, currentProfit: newProfit } });
      }
    }
  }
  
  /**
   * Remove an account
   * @param {string} accountId
   */
  removeAccount(accountId) {
    const account = this.accounts.get(accountId);
    if (account) {
      this.accounts.delete(accountId);
      this.emit({ type: 'account_removed', account });
    }
  }
  
  /**
   * Subscribe to events
   * @param {(event: AccountEvent) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  /**
   * Emit an event
   * @param {AccountEvent} event
   */
  emit(event) {
    this.listeners.forEach(l => l(event));
  }
}

// ============================================
// BOT EVENT TYPES (JSDoc)
// ============================================

/**
 * @typedef {Object} BotEventStarted
 * @property {'bot_started'} type
 */

/**
 * @typedef {Object} BotEventStopped
 * @property {'bot_stopped'} type
 */

/**
 * @typedef {Object} BotEventError
 * @property {'bot_error'} type
 * @property {string} error
 */

/**
 * @typedef {Object} BotEventTick
 * @property {'tick'} type
 * @property {import('./types.js').TickData} tick
 */

/**
 * @typedef {Object} BotEventSession
 * @property {'session_event'} type
 * @property {any} event
 */

/**
 * @typedef {Object} BotEventTrade
 * @property {'trade_event'} type
 * @property {any} event
 */

/**
 * @typedef {Object} BotEventTPReached
 * @property {'tp_reached'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {Object} BotEventSLReached
 * @property {'sl_reached'} type
 * @property {import('./types.js').TradingAccount} account
 */

/**
 * @typedef {BotEventStarted | BotEventStopped | BotEventError | BotEventTick | BotEventSession | BotEventTrade | BotEventTPReached | BotEventSLReached} BotEvent
 */

// ============================================
// TRADING BOT ENGINE
// ============================================

export class TradingBotEngine {
  constructor() {
    /** @type {import('./types.js').TradingSystemState} */
    this.state = {
      isRunning: false,
      systemStatus: 'initializing',
      lastError: null,
      activeSymbols: [],
      tickBuffers: new Map(),
      activeSessions: new Map(),
      sessionInvitations: [],
      accounts: new Map(),
      openTrades: new Map(),
      recentTrades: [],
      recoveryStates: new Map(),
      startTime: 0,
      totalTrades: 0,
      totalProfit: 0,
      uptime: 0,
    };
    
    /** @type {TickBufferManager} */
    this.tickBuffers = new TickBufferManager();
    /** @type {AccountManager} */
    this.accountManager = new AccountManager();
    /** @type {import('./tradeExecutor.js').TradeExecutor} */
    this.tradeExecutor = createTradeExecutor(CONFIG.WS_URL, CONFIG.APP_ID);
    /** @type {Map<string, string>} symbol -> subscriptionId */
    this.tickSubscriptions = new Map();
    /** @type {boolean} */
    this.isRunning = false;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.tradeLoopInterval = null;
    /** @type {Map<string, number>} accountId -> current step */
    this.martingaleSteps = new Map();
    /** @type {Array<(event: BotEvent) => void>} */
    this.listeners = [];
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // Handle session events
    sessionManager.subscribe((event) => {
      this.emit({ type: 'session_event', event });
      
      if (event.type === 'session_updated' && event.session.status === 'active') {
        // Start tick streaming for session symbol
        this.subscribeToSymbol(event.session.symbol);
      }
    });
    
    // Handle account TP/SL
    this.accountManager.subscribe((event) => {
      if (event.type === 'tp_reached' && event.account.sessionId) {
        sessionManager.handleTakeProfit(event.account.sessionId, event.account.id);
        this.emit({ type: 'tp_reached', account: event.account });
      }
      
      if (event.type === 'sl_reached' && event.account.sessionId) {
        sessionManager.handleStopLoss(
          event.account.sessionId, 
          event.account.id, 
          Math.abs(event.account.currentProfit)
        );
        this.emit({ type: 'sl_reached', account: event.account });
      }
    });
    
    // Handle trade events
    this.tradeExecutor.subscribe((event) => {
      this.emit({ type: 'trade_event', event });
      
      if (event.type === 'trade_settled') {
        const { trade } = event;
        
        // Update account profit
        this.accountManager.updateProfit(trade.accountId, trade.profit);
        
        // Update martingale step
        if (trade.outcome === 'loss') {
          const currentStep = this.martingaleSteps.get(trade.accountId) || 0;
          const session = sessionManager.getSession(trade.sessionId);
          
          if (session) {
            const { continue: cont, nextStep } = this.tradeExecutor.shouldContinueMartingale(
              session,
              currentStep,
              trade.outcome
            );
            
            if (cont) {
              this.martingaleSteps.set(trade.accountId, nextStep);
            }
          }
        } else {
          // Reset on win
          this.martingaleSteps.set(trade.accountId, 0);
        }
        
        // Update recovery if active
        const recoveryState = sessionManager.getRecoveryState(trade.accountId);
        if (recoveryState?.isActive && trade.profit > 0) {
          sessionManager.updateRecoveryProgress(trade.accountId, trade.profit);
        }
        
        // Update stats
        this.state.totalTrades++;
        this.state.totalProfit += trade.profit;
      }
    });
    
    // Hook session manager to account updates
    sessionManager.onAccountUpdate((accountId, updates) => {
      this.accountManager.updateAccount(accountId, updates);
    });
  }
  
  /**
   * Start the bot engine
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) return;
    
    console.log('🤖 Starting Trading Bot Engine...');
    
    try {
      this.isRunning = true;
      this.state.isRunning = true;
      this.state.systemStatus = 'running';
      this.state.startTime = Date.now();
      
      // Connect to main websocket for tick streaming
      await websocketService.connect();
      
      // Start trade execution loop
      this.startTradeLoop();
      
      this.emit({ type: 'bot_started' });
      console.log('✅ Trading Bot Engine started successfully');
      
    } catch (error) {
      this.state.systemStatus = 'error';
      this.state.lastError = error.message;
      this.emit({ type: 'bot_error', error: error.message });
      throw error;
    }
  }
  
  /**
   * Stop the bot engine
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) return;
    
    console.log('🛑 Stopping Trading Bot Engine...');
    
    this.isRunning = false;
    this.state.isRunning = false;
    this.state.systemStatus = 'paused';
    
    // Stop trade loop
    if (this.tradeLoopInterval) {
      clearInterval(this.tradeLoopInterval);
      this.tradeLoopInterval = null;
    }
    
    // Unsubscribe from all ticks
    for (const [symbol, subId] of this.tickSubscriptions) {
      await websocketService.unsubscribe(subId);
    }
    this.tickSubscriptions.clear();
    
    // Cleanup trade executor
    this.tradeExecutor.cleanup();
    
    this.emit({ type: 'bot_stopped' });
    console.log('✅ Trading Bot Engine stopped');
  }
  
  /**
   * Subscribe to tick stream for a symbol
   * @param {string} symbol
   * @returns {Promise<void>}
   */
  async subscribeToSymbol(symbol) {
    if (this.tickSubscriptions.has(symbol)) return;
    
    console.log(`📊 Subscribing to ticks for ${symbol}`);
    
    try {
      const subId = await websocketService.subscribeTicks(symbol, (response) => {
        if (response.tick) {
          /** @type {import('./types.js').TickData} */
          const tick = {
            symbol: response.tick.symbol,
            epoch: response.tick.epoch,
            quote: response.tick.quote,
            digit: this.extractLastDigit(response.tick.quote),
          };
          
          this.tickBuffers.addTick(tick);
          this.emit({ type: 'tick', tick });
        }
      });
      
      this.tickSubscriptions.set(symbol, subId);
      
      if (!this.state.activeSymbols.includes(symbol)) {
        this.state.activeSymbols.push(symbol);
      }
      
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
    }
  }
  
  /**
   * Unsubscribe from symbol
   * @param {string} symbol
   * @returns {Promise<void>}
   */
  async unsubscribeFromSymbol(symbol) {
    const subId = this.tickSubscriptions.get(symbol);
    if (!subId) return;
    
    try {
      await websocketService.unsubscribe(subId);
      this.tickSubscriptions.delete(symbol);
      this.state.activeSymbols = this.state.activeSymbols.filter(s => s !== symbol);
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
    }
  }
  
  /**
   * Extract last digit from quote
   * @param {number} quote
   * @returns {number}
   */
  extractLastDigit(quote) {
    const quoteStr = quote.toString();
    const lastChar = quoteStr[quoteStr.length - 1];
    return parseInt(lastChar, 10);
  }
  
  /**
   * Main trade execution loop
   */
  startTradeLoop() {
    // Check for trading opportunities every 1 second
    this.tradeLoopInterval = setInterval(() => {
      this.checkAndExecuteTrades();
    }, 1000);
  }
  
  /**
   * Check for trading opportunities and execute
   * @returns {Promise<void>}
   */
  async checkAndExecuteTrades() {
    const activeSessions = sessionManager.getActiveSessions();
    
    for (const session of activeSessions) {
      if (session.status !== 'active') continue;
      
      // Check if we have enough ticks
      if (!this.tickBuffers.hasEnoughTicks(session.symbol, 50)) continue;
      
      // Check for open trades in this session (prevent concurrent trades)
      const openTrades = this.tradeExecutor.getOpenTradesForAccount('*'); // TODO: check by session
      if (openTrades.length > 0) continue;
      
      // Get ticks and analyze
      const ticks = this.tickBuffers.getTicks(session.symbol);
      
      // Check for manual override
      let signal;
      if (session.manualOverrideActive && session.forcedDirection) {
        signal = {
          direction: session.forcedDirection,
          confidence: 1.0,
          signals: [],
          shouldTrade: true,
          timestamp: Date.now(),
        };
      } else {
        signal = analyzeTicksForSignal(ticks, DEFAULT_STRATEGY_CONFIGS);
      }
      
      // Skip if confidence too low
      if (!signal.shouldTrade) continue;
      
      // Get active accounts for this session
      const accounts = this.accountManager.getAccountsForSession(session.id);
      const activeAccounts = accounts.filter(a => a.status === 'active');
      
      if (activeAccounts.length === 0) continue;
      
      // Execute trades
      await this.tradeExecutor.executeMultiAccountTrade(
        activeAccounts,
        session,
        signal,
        (account) => {
          const martingaleStep = this.martingaleSteps.get(account.id) || 0;
          const stake = this.tradeExecutor.calculateStake(session, account, martingaleStep);
          return { stake, martingaleStep };
        }
      );
    }
  }
  
  /**
   * Add trading account
   * @param {import('./types.js').TradingAccount} account
   * @returns {Promise<void>}
   */
  async addAccount(account) {
    this.accountManager.addAccount(account);
    
    // Connect to trade executor
    if (account.token) {
      await this.tradeExecutor.connectAccount(account);
    }
  }
  
  /**
   * Remove trading account
   * @param {string} accountId
   * @returns {Promise<void>}
   */
  async removeAccount(accountId) {
    this.accountManager.removeAccount(accountId);
    await this.tradeExecutor.disconnectAccount(accountId);
  }
  
  /**
   * Get current state
   * @returns {import('./types.js').TradingSystemState}
   */
  getState() {
    return {
      ...this.state,
      uptime: Date.now() - this.state.startTime,
    };
  }
  
  /**
   * Get account manager
   * @returns {AccountManager}
   */
  getAccountManager() {
    return this.accountManager;
  }
  
  /**
   * Get session manager
   * @returns {import('./sessionManager.js').SessionManager}
   */
  getSessionManager() {
    return sessionManager;
  }
  
  /**
   * Get trade executor
   * @returns {import('./tradeExecutor.js').TradeExecutor}
   */
  getTradeExecutor() {
    return this.tradeExecutor;
  }
  
  /**
   * Get tick buffers
   * @returns {TickBufferManager}
   */
  getTickBuffers() {
    return this.tickBuffers;
  }
  
  /**
   * Subscribe to bot events
   * @param {(event: BotEvent) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  /**
   * Emit an event
   * @param {BotEvent} event
   */
  emit(event) {
    this.listeners.forEach(l => l(event));
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const tradingBot = new TradingBotEngine();

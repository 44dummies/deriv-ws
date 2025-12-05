/**
 * Trading Bot Engine - Main Runtime Loop
 * 
 * 24/7 tick streaming and automated trade execution
 * Coordinates strategy engine, session manager, and trade executor
 */

import websocketService from '../services/websocketService';
import CONFIG from '../config';
import {
  TradingSystemState,
  TradingAccount,
  TradingSession,
  TickData,
  TickBuffer,
  AggregatedSignal,
  CONFIDENCE_THRESHOLD,
  VOLATILITY_INDICES,
} from './types';
import { analyzeTicksForSignal, DEFAULT_STRATEGY_CONFIGS } from './strategyEngine';
import { sessionManager, SessionManager } from './sessionManager';
import { TradeExecutor, createTradeExecutor } from './tradeExecutor';

// ============================================
// TICK BUFFER MANAGER
// ============================================

class TickBufferManager {
  private buffers: Map<string, TickBuffer> = new Map();
  private maxBufferSize: number = 100;
  
  addTick(tick: TickData): void {
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
  
  getTicks(symbol: string): TickData[] {
    return this.buffers.get(symbol)?.ticks || [];
  }
  
  getBuffer(symbol: string): TickBuffer | undefined {
    return this.buffers.get(symbol);
  }
  
  hasEnoughTicks(symbol: string, minCount: number = 50): boolean {
    const buffer = this.buffers.get(symbol);
    return buffer ? buffer.ticks.length >= minCount : false;
  }
  
  clear(symbol?: string): void {
    if (symbol) {
      this.buffers.delete(symbol);
    } else {
      this.buffers.clear();
    }
  }
  
  getAllSymbols(): string[] {
    return Array.from(this.buffers.keys());
  }
}

// ============================================
// ACCOUNT MANAGER
// ============================================

class AccountManager {
  private accounts: Map<string, TradingAccount> = new Map();
  private listeners: Array<(event: AccountEvent) => void> = [];
  
  addAccount(account: TradingAccount): void {
    this.accounts.set(account.id, account);
    this.emit({ type: 'account_added', account });
  }
  
  getAccount(accountId: string): TradingAccount | undefined {
    return this.accounts.get(accountId);
  }
  
  getAllAccounts(): TradingAccount[] {
    return Array.from(this.accounts.values());
  }
  
  getActiveAccounts(): TradingAccount[] {
    return this.getAllAccounts().filter(a => a.status === 'active' && a.isInSession);
  }
  
  getAccountsForSession(sessionId: string): TradingAccount[] {
    return this.getAllAccounts().filter(a => a.sessionId === sessionId);
  }
  
  updateAccount(accountId: string, updates: Partial<TradingAccount>): TradingAccount | null {
    const account = this.accounts.get(accountId);
    if (!account) return null;
    
    const updated = { ...account, ...updates };
    this.accounts.set(accountId, updated);
    this.emit({ type: 'account_updated', account: updated });
    
    return updated;
  }
  
  updateBalance(accountId: string, balance: number): void {
    this.updateAccount(accountId, { balance });
  }
  
  updateProfit(accountId: string, profitDelta: number): void {
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
  
  removeAccount(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (account) {
      this.accounts.delete(accountId);
      this.emit({ type: 'account_removed', account });
    }
  }
  
  subscribe(callback: (event: AccountEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  private emit(event: AccountEvent): void {
    this.listeners.forEach(l => l(event));
  }
}

type AccountEvent =
  | { type: 'account_added'; account: TradingAccount }
  | { type: 'account_updated'; account: TradingAccount }
  | { type: 'account_removed'; account: TradingAccount }
  | { type: 'tp_reached'; account: TradingAccount }
  | { type: 'sl_reached'; account: TradingAccount };

// ============================================
// TRADING BOT ENGINE
// ============================================

export class TradingBotEngine {
  private state: TradingSystemState;
  private tickBuffers: TickBufferManager;
  private accountManager: AccountManager;
  private tradeExecutor: TradeExecutor;
  private tickSubscriptions: Map<string, string> = new Map(); // symbol -> subscriptionId
  private isRunning: boolean = false;
  private tradeLoopInterval: ReturnType<typeof setInterval> | null = null;
  private martingaleSteps: Map<string, number> = new Map(); // accountId -> current step
  private listeners: Array<(event: BotEvent) => void> = [];
  
  constructor() {
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
    
    this.tickBuffers = new TickBufferManager();
    this.accountManager = new AccountManager();
    this.tradeExecutor = createTradeExecutor(CONFIG.WS_URL, CONFIG.APP_ID);
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
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
  
  // Start the bot engine
  async start(): Promise<void> {
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
      
    } catch (error: any) {
      this.state.systemStatus = 'error';
      this.state.lastError = error.message;
      this.emit({ type: 'bot_error', error: error.message });
      throw error;
    }
  }
  
  // Stop the bot engine
  async stop(): Promise<void> {
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
  
  // Subscribe to tick stream for a symbol
  private async subscribeToSymbol(symbol: string): Promise<void> {
    if (this.tickSubscriptions.has(symbol)) return;
    
    console.log(`📊 Subscribing to ticks for ${symbol}`);
    
    try {
      const subId = await websocketService.subscribeTicks(symbol, (response) => {
        if (response.tick) {
          const tick: TickData = {
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
  
  // Unsubscribe from symbol
  private async unsubscribeFromSymbol(symbol: string): Promise<void> {
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
  
  // Extract last digit from quote
  private extractLastDigit(quote: number): number {
    const quoteStr = quote.toString();
    const lastChar = quoteStr[quoteStr.length - 1];
    return parseInt(lastChar, 10);
  }
  
  // Main trade execution loop
  private startTradeLoop(): void {
    // Check for trading opportunities every 1 second
    this.tradeLoopInterval = setInterval(() => {
      this.checkAndExecuteTrades();
    }, 1000);
  }
  
  // Check for trading opportunities and execute
  private async checkAndExecuteTrades(): Promise<void> {
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
      let signal: AggregatedSignal;
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
  
  // Add trading account
  async addAccount(account: TradingAccount): Promise<void> {
    this.accountManager.addAccount(account);
    
    // Connect to trade executor
    if (account.token) {
      await this.tradeExecutor.connectAccount(account);
    }
  }
  
  // Remove trading account
  async removeAccount(accountId: string): Promise<void> {
    this.accountManager.removeAccount(accountId);
    await this.tradeExecutor.disconnectAccount(accountId);
  }
  
  // Get current state
  getState(): TradingSystemState {
    return {
      ...this.state,
      uptime: Date.now() - this.state.startTime,
    };
  }
  
  // Get account manager
  getAccountManager(): AccountManager {
    return this.accountManager;
  }
  
  // Get session manager
  getSessionManager(): SessionManager {
    return sessionManager;
  }
  
  // Get trade executor
  getTradeExecutor(): TradeExecutor {
    return this.tradeExecutor;
  }
  
  // Get tick buffers
  getTickBuffers(): TickBufferManager {
    return this.tickBuffers;
  }
  
  // Subscribe to bot events
  subscribe(callback: (event: BotEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  private emit(event: BotEvent): void {
    this.listeners.forEach(l => l(event));
  }
}

// ============================================
// BOT EVENT TYPES
// ============================================

type BotEvent =
  | { type: 'bot_started' }
  | { type: 'bot_stopped' }
  | { type: 'bot_error'; error: string }
  | { type: 'tick'; tick: TickData }
  | { type: 'session_event'; event: any }
  | { type: 'trade_event'; event: any }
  | { type: 'tp_reached'; account: TradingAccount }
  | { type: 'sl_reached'; account: TradingAccount };

// ============================================
// SINGLETON INSTANCE
// ============================================

export const tradingBot = new TradingBotEngine();

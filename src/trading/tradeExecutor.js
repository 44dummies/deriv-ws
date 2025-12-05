/**
 * Trade Executor - Handles multi-account trade execution
 * 
 * Manages simultaneous trade placement across multiple accounts
 * Handles proposal fetching, contract buying, and result tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { sessionManager } from './sessionManager.js';

// ============================================
// MULTI-ACCOUNT WEBSOCKET MANAGER
// ============================================

/**
 * @typedef {Object} AccountConnection
 * @property {string} accountId
 * @property {string} token
 * @property {WebSocket | null} ws
 * @property {boolean} isConnected
 * @property {boolean} isAuthorized
 * @property {string[]} subscriptionIds
 * @property {Map<number, {resolve: Function, reject: Function}>} pendingRequests
 * @property {number} requestId
 */

class MultiAccountWebSocket {
  /**
   * @param {string} wsUrl
   * @param {string} appId
   */
  constructor(wsUrl, appId) {
    /** @type {Map<string, AccountConnection>} */
    this.connections = new Map();
    this.wsUrl = wsUrl;
    this.appId = appId;
  }
  
  /**
   * Connect an account
   * @param {string} accountId
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async connectAccount(accountId, token) {
    if (this.connections.has(accountId) && this.connections.get(accountId).isConnected) {
      return true;
    }
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsUrl}?app_id=${this.appId}`);
      
      /** @type {AccountConnection} */
      const connection = {
        accountId,
        token,
        ws,
        isConnected: false,
        isAuthorized: false,
        subscriptionIds: [],
        pendingRequests: new Map(),
        requestId: 0,
      };
      
      ws.onopen = async () => {
        connection.isConnected = true;
        console.log(`WebSocket connected for account ${accountId}`);
        
        // Authorize
        try {
          const authResponse = await this.send(accountId, { authorize: token });
          if (!authResponse.error) {
            connection.isAuthorized = true;
            this.connections.set(accountId, connection);
            resolve(true);
          } else {
            reject(new Error(authResponse.error.message));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error for account ${accountId}:`, error);
        reject(error);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle subscription updates
        if (data.subscription?.id) {
          // Forward to subscription handler
        }
        
        // Handle request responses
        if (data.req_id && connection.pendingRequests.has(data.req_id)) {
          const handlers = connection.pendingRequests.get(data.req_id);
          connection.pendingRequests.delete(data.req_id);
          
          if (data.error) {
            handlers.reject(data.error);
          } else {
            handlers.resolve(data);
          }
        }
      };
      
      ws.onclose = () => {
        connection.isConnected = false;
        connection.isAuthorized = false;
        console.log(`WebSocket closed for account ${accountId}`);
      };
      
      this.connections.set(accountId, connection);
    });
  }
  
  /**
   * Disconnect an account
   * @param {string} accountId
   * @returns {Promise<void>}
   */
  async disconnectAccount(accountId) {
    const connection = this.connections.get(accountId);
    if (connection?.ws) {
      connection.ws.close();
      this.connections.delete(accountId);
    }
  }
  
  /**
   * Send a request to an account's WebSocket
   * @param {string} accountId
   * @param {Object} request
   * @returns {Promise<any>}
   */
  async send(accountId, request) {
    const connection = this.connections.get(accountId);
    if (!connection || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Account ${accountId} is not connected`);
    }
    
    return new Promise((resolve, reject) => {
      connection.requestId++;
      const reqId = connection.requestId;
      
      connection.pendingRequests.set(reqId, { resolve, reject });
      connection.ws.send(JSON.stringify({ ...request, req_id: reqId }));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (connection.pendingRequests.has(reqId)) {
          connection.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  /**
   * Check if account is connected
   * @param {string} accountId
   * @returns {boolean}
   */
  isAccountConnected(accountId) {
    const connection = this.connections.get(accountId);
    return connection?.isConnected && connection?.isAuthorized || false;
  }
  
  /**
   * Get all connected accounts
   * @returns {string[]}
   */
  getConnectedAccounts() {
    return Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.isConnected && conn.isAuthorized)
      .map(([id, _]) => id);
  }
  
  /**
   * Disconnect all accounts
   */
  disconnectAll() {
    this.connections.forEach((conn, id) => {
      if (conn.ws) conn.ws.close();
    });
    this.connections.clear();
  }
}

// ============================================
// TRADE EVENT TYPES (JSDoc)
// ============================================

/**
 * @typedef {Object} TradeEventCreated
 * @property {'trade_created'} type
 * @property {import('./types.js').TradeExecution} trade
 */

/**
 * @typedef {Object} TradeEventExecuted
 * @property {'trade_executed'} type
 * @property {import('./types.js').TradeExecution} trade
 */

/**
 * @typedef {Object} TradeEventUpdated
 * @property {'trade_updated'} type
 * @property {import('./types.js').TradeExecution} trade
 */

/**
 * @typedef {Object} TradeEventSettled
 * @property {'trade_settled'} type
 * @property {import('./types.js').TradeExecution} trade
 */

/**
 * @typedef {Object} TradeEventError
 * @property {'trade_error'} type
 * @property {import('./types.js').TradeExecution} trade
 * @property {string} error
 */

/**
 * @typedef {TradeEventCreated | TradeEventExecuted | TradeEventUpdated | TradeEventSettled | TradeEventError} TradeEvent
 */

// ============================================
// TRADE EXECUTOR CLASS
// ============================================

export class TradeExecutor {
  /**
   * @param {string} wsUrl
   * @param {string} appId
   */
  constructor(wsUrl, appId) {
    /** @type {MultiAccountWebSocket} */
    this.multiWs = new MultiAccountWebSocket(wsUrl, appId);
    /** @type {Map<string, import('./types.js').TradeExecution>} */
    this.openTrades = new Map();
    /** @type {import('./types.js').TradeExecution[]} */
    this.tradeHistory = [];
    /** @type {Map<number, string>} contractId -> tradeId */
    this.contractSubscriptions = new Map();
    /** @type {Array<(event: TradeEvent) => void>} */
    this.listeners = [];
  }
  
  /**
   * Connect an account
   * @param {import('./types.js').TradingAccount} account
   * @returns {Promise<boolean>}
   */
  async connectAccount(account) {
    return this.multiWs.connectAccount(account.id, account.token);
  }
  
  /**
   * Disconnect an account
   * @param {string} accountId
   * @returns {Promise<void>}
   */
  async disconnectAccount(accountId) {
    return this.multiWs.disconnectAccount(accountId);
  }
  
  /**
   * Check if account is ready
   * @param {string} accountId
   * @returns {boolean}
   */
  isAccountReady(accountId) {
    return this.multiWs.isAccountConnected(accountId);
  }
  
  /**
   * Get account balance
   * @param {string} accountId
   * @returns {Promise<number>}
   */
  async getBalance(accountId) {
    const response = await this.multiWs.send(accountId, { balance: 1 });
    return response.balance?.balance || 0;
  }
  
  /**
   * Execute trade for a single account
   * @param {import('./types.js').TradingAccount} account
   * @param {import('./types.js').TradingSession} session
   * @param {import('./types.js').AggregatedSignal} signal
   * @param {number} stake
   * @param {number} [martingaleStep=0]
   * @returns {Promise<import('./types.js').TradeExecution>}
   */
  async executeTrade(account, session, signal, stake, martingaleStep = 0) {
    const tradeId = uuidv4();
    
    /** @type {import('./types.js').TradeExecution} */
    const trade = {
      id: tradeId,
      sessionId: session.id,
      accountId: account.id,
      symbol: session.symbol,
      contractType: this.mapSignalToContractType(signal.direction, session.contractType),
      stake,
      proposalId: '',
      contractId: null,
      entryPrice: 0,
      entryTick: 0,
      status: 'pending',
      outcome: 'pending',
      payout: 0,
      profit: 0,
      createdAt: Date.now(),
      executedAt: null,
      settledAt: null,
      signal,
      martingaleStep,
    };
    
    this.openTrades.set(tradeId, trade);
    this.emit({ type: 'trade_created', trade });
    
    try {
      // Get proposal
      const proposalRequest = this.buildProposalRequest(session, signal, stake);
      const proposalResponse = await this.multiWs.send(account.id, proposalRequest);
      
      if (proposalResponse.error) {
        throw new Error(proposalResponse.error.message);
      }
      
      trade.proposalId = proposalResponse.proposal.id;
      trade.entryPrice = proposalResponse.proposal.spot;
      trade.payout = proposalResponse.proposal.payout;
      
      // Buy contract
      const buyResponse = await this.multiWs.send(account.id, {
        buy: trade.proposalId,
        price: stake,
      });
      
      if (buyResponse.error) {
        throw new Error(buyResponse.error.message);
      }
      
      trade.contractId = buyResponse.buy.contract_id;
      trade.status = 'open';
      trade.executedAt = Date.now();
      
      this.emit({ type: 'trade_executed', trade });
      
      // Subscribe to contract updates
      this.subscribeToContract(account.id, trade.contractId, tradeId);
      
      return trade;
      
    } catch (error) {
      trade.status = 'error';
      trade.outcome = 'cancelled';
      this.emit({ type: 'trade_error', trade, error: error.message });
      throw error;
    }
  }
  
  /**
   * Execute trades for multiple accounts simultaneously
   * @param {import('./types.js').TradingAccount[]} accounts
   * @param {import('./types.js').TradingSession} session
   * @param {import('./types.js').AggregatedSignal} signal
   * @param {(account: import('./types.js').TradingAccount) => { stake: number; martingaleStep: number }} getStakeForAccount
   * @returns {Promise<Map<string, import('./types.js').TradeExecution | Error>>}
   */
  async executeMultiAccountTrade(accounts, session, signal, getStakeForAccount) {
    const results = new Map();
    
    // Filter to only connected accounts in the session
    const activeAccounts = accounts.filter(a => 
      session.participantIds.includes(a.id) &&
      this.multiWs.isAccountConnected(a.id) &&
      a.status === 'active'
    );
    
    // Execute all trades in parallel
    const promises = activeAccounts.map(async (account) => {
      try {
        const { stake, martingaleStep } = getStakeForAccount(account);
        const trade = await this.executeTrade(account, session, signal, stake, martingaleStep);
        results.set(account.id, trade);
      } catch (error) {
        results.set(account.id, error);
      }
    });
    
    await Promise.allSettled(promises);
    
    return results;
  }
  
  /**
   * Build proposal request based on contract type and signal
   * @param {import('./types.js').TradingSession} session
   * @param {import('./types.js').AggregatedSignal} signal
   * @param {number} stake
   * @returns {Object}
   */
  buildProposalRequest(session, signal, stake) {
    const contractType = this.mapSignalToContractType(signal.direction, session.contractType);
    
    const request = {
      proposal: 1,
      amount: stake,
      basis: 'stake',
      contract_type: contractType,
      currency: 'USD',
      symbol: session.symbol,
      duration: 1,
      duration_unit: 't', // 1 tick for digit contracts
    };
    
    // Add barrier for digit match/differ
    if (contractType === 'DIGITMATCH' || contractType === 'DIGITDIFF') {
      if (typeof signal.direction === 'number') {
        request.barrier = signal.direction;
      } else {
        // Default to most frequent prediction
        request.barrier = 5;
      }
    }
    
    // For DIGITOVER/UNDER, add barrier
    if (contractType === 'DIGITOVER') {
      request.barrier = 4; // Over 4
    }
    if (contractType === 'DIGITUNDER') {
      request.barrier = 5; // Under 5
    }
    
    return request;
  }
  
  /**
   * Map signal direction to contract type
   * @param {'CALL' | 'PUT' | 'EVEN' | 'ODD' | number} direction
   * @param {import('./types.js').ContractType} sessionContractType
   * @returns {import('./types.js').ContractType}
   */
  mapSignalToContractType(direction, sessionContractType) {
    // If session has a specific contract type, use it
    if (sessionContractType !== 'DIGITEVEN' && sessionContractType !== 'DIGITODD') {
      return sessionContractType;
    }
    
    // Map signal direction to contract
    if (direction === 'EVEN') return 'DIGITEVEN';
    if (direction === 'ODD') return 'DIGITODD';
    if (direction === 'CALL') return 'CALL';
    if (direction === 'PUT') return 'PUT';
    if (typeof direction === 'number') return 'DIGITMATCH';
    
    // Fallback
    return sessionContractType;
  }
  
  /**
   * Subscribe to contract updates
   * @param {string} accountId
   * @param {number} contractId
   * @param {string} tradeId
   */
  async subscribeToContract(accountId, contractId, tradeId) {
    this.contractSubscriptions.set(contractId, tradeId);
    
    try {
      const response = await this.multiWs.send(accountId, {
        proposal_open_contract: 1,
        contract_id: contractId,
        subscribe: 1,
      });
      
      // Handle initial response
      if (response.proposal_open_contract) {
        this.handleContractUpdate(response.proposal_open_contract);
      }
    } catch (error) {
      console.error('Failed to subscribe to contract:', error);
    }
  }
  
  /**
   * Handle contract update
   * @param {Object} contract
   */
  handleContractUpdate(contract) {
    const tradeId = this.contractSubscriptions.get(contract.contract_id);
    if (!tradeId) return;
    
    const trade = this.openTrades.get(tradeId);
    if (!trade) return;
    
    // Update trade with contract info
    trade.entryTick = contract.entry_tick || trade.entryTick;
    
    // Check if settled
    if (contract.is_sold || contract.is_expired) {
      trade.status = 'settled';
      trade.settledAt = Date.now();
      trade.profit = contract.profit || 0;
      trade.payout = contract.payout || 0;
      trade.outcome = trade.profit > 0 ? 'win' : 'loss';
      
      // Move to history
      this.openTrades.delete(tradeId);
      this.tradeHistory.push(trade);
      this.contractSubscriptions.delete(contract.contract_id);
      
      // Record in session manager
      sessionManager.recordTrade(trade.sessionId, trade);
      
      this.emit({ type: 'trade_settled', trade });
    } else {
      this.emit({ type: 'trade_updated', trade });
    }
  }
  
  /**
   * Calculate stake based on staking mode
   * @param {import('./types.js').TradingSession} session
   * @param {import('./types.js').TradingAccount} account
   * @param {number} martingaleStep
   * @returns {number}
   */
  calculateStake(session, account, martingaleStep) {
    const baseStake = session.baseStake;
    
    switch (session.stakingMode) {
      case 'fixed':
        return baseStake;
        
      case 'martingale':
        return baseStake * Math.pow(session.martingaleMultiplier, martingaleStep);
        
      case 'compounding':
        // Use percentage of current balance
        const balance = account.balance;
        return Math.max(baseStake, balance * 0.01); // 1% of balance
        
      default:
        return baseStake;
    }
  }
  
  /**
   * Check if martingale should continue
   * @param {import('./types.js').TradingSession} session
   * @param {number} currentStep
   * @param {'win' | 'loss'} lastOutcome
   * @returns {{ continue: boolean; nextStep: number }}
   */
  shouldContinueMartingale(session, currentStep, lastOutcome) {
    if (session.stakingMode !== 'martingale') {
      return { continue: false, nextStep: 0 };
    }
    
    if (lastOutcome === 'win') {
      // Reset on win
      return { continue: true, nextStep: 0 };
    }
    
    // On loss, increment step
    const nextStep = currentStep + 1;
    
    if (nextStep >= session.maxMartingaleSteps) {
      // Max steps reached, reset
      return { continue: true, nextStep: 0 };
    }
    
    return { continue: true, nextStep };
  }
  
  /**
   * Get open trades for account
   * @param {string} accountId
   * @returns {import('./types.js').TradeExecution[]}
   */
  getOpenTradesForAccount(accountId) {
    return Array.from(this.openTrades.values()).filter(t => t.accountId === accountId);
  }
  
  /**
   * Get recent trades
   * @param {number} [limit=50]
   * @returns {import('./types.js').TradeExecution[]}
   */
  getRecentTrades(limit = 50) {
    return this.tradeHistory.slice(-limit);
  }
  
  /**
   * Get trade statistics for session
   * @param {string} sessionId
   * @returns {{ totalTrades: number; wins: number; losses: number; winRate: number; totalProfit: number; avgProfit: number }}
   */
  getSessionTradeStats(sessionId) {
    const trades = this.tradeHistory.filter(t => t.sessionId === sessionId);
    
    const wins = trades.filter(t => t.outcome === 'win').length;
    const losses = trades.filter(t => t.outcome === 'loss').length;
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    
    return {
      totalTrades: trades.length,
      wins,
      losses,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
      totalProfit,
      avgProfit: trades.length > 0 ? totalProfit / trades.length : 0,
    };
  }
  
  /**
   * Subscribe to trade events
   * @param {(event: TradeEvent) => void} callback
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
   * @param {TradeEvent} event
   */
  emit(event) {
    this.listeners.forEach(l => l(event));
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.multiWs.disconnectAll();
    this.openTrades.clear();
    this.contractSubscriptions.clear();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a trade executor instance
 * @param {string} wsUrl
 * @param {string} appId
 * @returns {TradeExecutor}
 */
export function createTradeExecutor(wsUrl, appId) {
  return new TradeExecutor(wsUrl, appId);
}

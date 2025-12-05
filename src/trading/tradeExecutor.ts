/**
 * Trade Executor - Handles multi-account trade execution
 * 
 * Manages simultaneous trade placement across multiple accounts
 * Handles proposal fetching, contract buying, and result tracking
 */

import { v4 as uuidv4 } from 'uuid';
import websocketService from '../services/websocketService';
import {
  TradingAccount,
  TradingSession,
  TradeExecution,
  TradeStatus,
  AggregatedSignal,
  ContractType,
  TickData,
} from './types';
import { sessionManager } from './sessionManager';

// ============================================
// MULTI-ACCOUNT WEBSOCKET MANAGER
// ============================================

interface AccountConnection {
  accountId: string;
  token: string;
  ws: WebSocket | null;
  isConnected: boolean;
  isAuthorized: boolean;
  subscriptionIds: string[];
  pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }>;
  requestId: number;
}

class MultiAccountWebSocket {
  private connections: Map<string, AccountConnection> = new Map();
  private wsUrl: string;
  private appId: string;
  
  constructor(wsUrl: string, appId: string) {
    this.wsUrl = wsUrl;
    this.appId = appId;
  }
  
  async connectAccount(accountId: string, token: string): Promise<boolean> {
    if (this.connections.has(accountId) && this.connections.get(accountId)!.isConnected) {
      return true;
    }
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsUrl}?app_id=${this.appId}`);
      
      const connection: AccountConnection = {
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
          const handlers = connection.pendingRequests.get(data.req_id)!;
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
  
  async disconnectAccount(accountId: string): Promise<void> {
    const connection = this.connections.get(accountId);
    if (connection?.ws) {
      connection.ws.close();
      this.connections.delete(accountId);
    }
  }
  
  async send(accountId: string, request: any): Promise<any> {
    const connection = this.connections.get(accountId);
    if (!connection || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Account ${accountId} is not connected`);
    }
    
    return new Promise((resolve, reject) => {
      connection.requestId++;
      const reqId = connection.requestId;
      
      connection.pendingRequests.set(reqId, { resolve, reject });
      connection.ws!.send(JSON.stringify({ ...request, req_id: reqId }));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (connection.pendingRequests.has(reqId)) {
          connection.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  isAccountConnected(accountId: string): boolean {
    const connection = this.connections.get(accountId);
    return connection?.isConnected && connection?.isAuthorized || false;
  }
  
  getConnectedAccounts(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.isConnected && conn.isAuthorized)
      .map(([id, _]) => id);
  }
  
  disconnectAll(): void {
    this.connections.forEach((conn, id) => {
      if (conn.ws) conn.ws.close();
    });
    this.connections.clear();
  }
}

// ============================================
// TRADE EXECUTOR CLASS
// ============================================

export class TradeExecutor {
  private multiWs: MultiAccountWebSocket;
  private openTrades: Map<string, TradeExecution> = new Map();
  private tradeHistory: TradeExecution[] = [];
  private contractSubscriptions: Map<number, string> = new Map(); // contractId -> tradeId
  private listeners: Array<(event: TradeEvent) => void> = [];
  
  constructor(wsUrl: string, appId: string) {
    this.multiWs = new MultiAccountWebSocket(wsUrl, appId);
  }
  
  // Account connection management
  async connectAccount(account: TradingAccount): Promise<boolean> {
    return this.multiWs.connectAccount(account.id, account.token);
  }
  
  async disconnectAccount(accountId: string): Promise<void> {
    return this.multiWs.disconnectAccount(accountId);
  }
  
  isAccountReady(accountId: string): boolean {
    return this.multiWs.isAccountConnected(accountId);
  }
  
  // Get account balance
  async getBalance(accountId: string): Promise<number> {
    const response = await this.multiWs.send(accountId, { balance: 1 });
    return response.balance?.balance || 0;
  }
  
  // Execute trade for a single account
  async executeTrade(
    account: TradingAccount,
    session: TradingSession,
    signal: AggregatedSignal,
    stake: number,
    martingaleStep: number = 0
  ): Promise<TradeExecution> {
    const tradeId = uuidv4();
    
    const trade: TradeExecution = {
      id: tradeId,
      sessionId: session.id,
      accountId: account.id,
      symbol: session.symbol,
      contractType: this.mapSignalToContractType(signal.direction!, session.contractType),
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
      this.subscribeToContract(account.id, trade.contractId!, tradeId);
      
      return trade;
      
    } catch (error: any) {
      trade.status = 'error';
      trade.outcome = 'cancelled';
      this.emit({ type: 'trade_error', trade, error: error.message });
      throw error;
    }
  }
  
  // Execute trades for multiple accounts simultaneously
  async executeMultiAccountTrade(
    accounts: TradingAccount[],
    session: TradingSession,
    signal: AggregatedSignal,
    getStakeForAccount: (account: TradingAccount) => { stake: number; martingaleStep: number }
  ): Promise<Map<string, TradeExecution | Error>> {
    const results = new Map<string, TradeExecution | Error>();
    
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
      } catch (error: any) {
        results.set(account.id, error);
      }
    });
    
    await Promise.allSettled(promises);
    
    return results;
  }
  
  // Build proposal request based on contract type and signal
  private buildProposalRequest(
    session: TradingSession,
    signal: AggregatedSignal,
    stake: number
  ): any {
    const contractType = this.mapSignalToContractType(signal.direction!, session.contractType);
    
    const request: any = {
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
  
  // Map signal direction to contract type
  private mapSignalToContractType(
    direction: 'CALL' | 'PUT' | 'EVEN' | 'ODD' | number,
    sessionContractType: ContractType
  ): ContractType {
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
  
  // Subscribe to contract updates
  private async subscribeToContract(accountId: string, contractId: number, tradeId: string): Promise<void> {
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
  
  // Handle contract update
  private handleContractUpdate(contract: any): void {
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
  
  // Calculate stake based on staking mode
  calculateStake(
    session: TradingSession,
    account: TradingAccount,
    martingaleStep: number
  ): number {
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
  
  // Check if martingale should continue
  shouldContinueMartingale(
    session: TradingSession,
    currentStep: number,
    lastOutcome: 'win' | 'loss'
  ): { continue: boolean; nextStep: number } {
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
  
  // Get open trades for account
  getOpenTradesForAccount(accountId: string): TradeExecution[] {
    return Array.from(this.openTrades.values()).filter(t => t.accountId === accountId);
  }
  
  // Get recent trades
  getRecentTrades(limit: number = 50): TradeExecution[] {
    return this.tradeHistory.slice(-limit);
  }
  
  // Get trade statistics for session
  getSessionTradeStats(sessionId: string): {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
  } {
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
  
  // Event system
  subscribe(callback: (event: TradeEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  private emit(event: TradeEvent): void {
    this.listeners.forEach(l => l(event));
  }
  
  // Cleanup
  cleanup(): void {
    this.multiWs.disconnectAll();
    this.openTrades.clear();
    this.contractSubscriptions.clear();
  }
}

// ============================================
// TRADE EVENT TYPES
// ============================================

type TradeEvent =
  | { type: 'trade_created'; trade: TradeExecution }
  | { type: 'trade_executed'; trade: TradeExecution }
  | { type: 'trade_updated'; trade: TradeExecution }
  | { type: 'trade_settled'; trade: TradeExecution }
  | { type: 'trade_error'; trade: TradeExecution; error: string };

// ============================================
// FACTORY FUNCTION
// ============================================

export function createTradeExecutor(wsUrl: string, appId: string): TradeExecutor {
  return new TradeExecutor(wsUrl, appId);
}

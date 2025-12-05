/**
 * Deriv WebSocket Service
 * Handles connections to Deriv API for tick streaming and trade execution
 */

import { DERIV_WS_URL, DERIV_APP_ID } from './constants';

/**
 * Create a Deriv WebSocket connection
 */
export function createDerivConnection(token, onMessage, onError, onClose) {
  const ws = new WebSocket(`${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`);
  
  ws.onopen = () => {
    // Authorize on connect
    ws.send(JSON.stringify({ authorize: token }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error('Parse error:', err);
    }
  };
  
  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    if (onError) onError(err);
  };
  
  ws.onclose = () => {
    if (onClose) onClose();
  };
  
  return ws;
}

/**
 * Subscribe to tick stream
 */
export function subscribeTicks(ws, symbol) {
  ws.send(JSON.stringify({
    ticks: symbol,
    subscribe: 1
  }));
}

/**
 * Unsubscribe from tick stream
 */
export function unsubscribeTicks(ws, subscriptionId) {
  ws.send(JSON.stringify({
    forget: subscriptionId
  }));
}

/**
 * Get price proposal for a contract
 */
export function getProposal(ws, params) {
  const request = {
    proposal: 1,
    amount: params.stake,
    basis: 'stake',
    contract_type: params.contractType,
    currency: params.currency || 'USD',
    duration: params.duration || 1,
    duration_unit: params.durationUnit || 't',
    symbol: params.symbol
  };
  
  // Add barrier for digit contracts
  if (params.contractType.includes('DIGIT') && params.prediction !== null && params.prediction !== undefined) {
    if (['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(params.contractType)) {
      request.barrier = params.prediction.toString();
    }
  }
  
  ws.send(JSON.stringify(request));
}

/**
 * Buy a contract
 */
export function buyContract(ws, proposalId, price) {
  ws.send(JSON.stringify({
    buy: proposalId,
    price: price
  }));
}

/**
 * Subscribe to contract updates
 */
export function subscribeContract(ws, contractId) {
  ws.send(JSON.stringify({
    proposal_open_contract: 1,
    contract_id: contractId,
    subscribe: 1
  }));
}

/**
 * Multi-account connection manager
 */
export class MultiAccountManager {
  constructor() {
    this.connections = new Map();
    this.tickBuffers = new Map();
  }
  
  /**
   * Connect an account
   */
  connect(accountId, token, callbacks = {}) {
    if (this.connections.has(accountId)) {
      return this.connections.get(accountId);
    }
    
    const ws = createDerivConnection(
      token,
      (data) => {
        if (data.authorize) {
          if (callbacks.onAuthorized) callbacks.onAuthorized(data.authorize);
        }
        if (data.tick) {
          this.handleTick(accountId, data.tick);
          if (callbacks.onTick) callbacks.onTick(data.tick);
        }
        if (data.proposal) {
          if (callbacks.onProposal) callbacks.onProposal(data.proposal);
        }
        if (data.buy) {
          if (callbacks.onBuy) callbacks.onBuy(data.buy);
        }
        if (data.proposal_open_contract) {
          if (callbacks.onContractUpdate) callbacks.onContractUpdate(data.proposal_open_contract);
        }
        if (data.error) {
          if (callbacks.onError) callbacks.onError(data.error);
        }
      },
      callbacks.onError,
      () => {
        this.connections.delete(accountId);
        if (callbacks.onClose) callbacks.onClose();
      }
    );
    
    this.connections.set(accountId, ws);
    return ws;
  }
  
  /**
   * Handle incoming tick
   */
  handleTick(accountId, tick) {
    const symbol = tick.symbol;
    const key = `${accountId}:${symbol}`;
    
    if (!this.tickBuffers.has(key)) {
      this.tickBuffers.set(key, []);
    }
    
    const buffer = this.tickBuffers.get(key);
    buffer.push({
      epoch: tick.epoch,
      quote: tick.quote,
      symbol: tick.symbol
    });
    
    // Keep last 100 ticks
    if (buffer.length > 100) {
      buffer.shift();
    }
  }
  
  /**
   * Get tick buffer for analysis
   */
  getTickBuffer(accountId, symbol) {
    const key = `${accountId}:${symbol}`;
    return this.tickBuffers.get(key) || [];
  }
  
  /**
   * Disconnect an account
   */
  disconnect(accountId) {
    const ws = this.connections.get(accountId);
    if (ws) {
      ws.close();
      this.connections.delete(accountId);
    }
  }
  
  /**
   * Disconnect all accounts
   */
  disconnectAll() {
    for (const [accountId, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
    this.tickBuffers.clear();
  }
  
  /**
   * Check if account is connected
   */
  isConnected(accountId) {
    const ws = this.connections.get(accountId);
    return ws && ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const accountManager = new MultiAccountManager();

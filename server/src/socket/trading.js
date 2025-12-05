/**
 * Trading Socket Handlers - Real-time WebSocket communication for trading
 */

const WebSocket = require('ws');
const tradingService = require('../services/trading');

// Active Deriv connections per account
const derivConnections = new Map();

// Tick buffers for strategy analysis
const tickBuffers = new Map();

// Session subscriptions (socket.id -> sessionId)
const sessionSubscriptions = new Map();

/**
 * Setup trading socket handlers
 */
function setupTradingSocketHandlers(io, socket) {
  const userId = socket.userId;
  
  // ==================== Session Subscription ====================
  
  /**
   * Subscribe to session updates
   */
  socket.on('trading:subscribe', async (data) => {
    const { sessionId } = data;
    
    try {
      const session = await tradingService.getSession(sessionId);
      if (!session) {
        socket.emit('trading:error', { message: 'Session not found' });
        return;
      }
      
      // Join session room
      socket.join(`trading:${sessionId}`);
      sessionSubscriptions.set(socket.id, sessionId);
      
      socket.emit('trading:subscribed', {
        sessionId,
        session,
      });
      
      console.log(`User ${userId} subscribed to session ${sessionId}`);
    } catch (error) {
      console.error('Error subscribing to session:', error);
      socket.emit('trading:error', { message: error.message });
    }
  });
  
  /**
   * Unsubscribe from session updates
   */
  socket.on('trading:unsubscribe', (data) => {
    const { sessionId } = data;
    
    socket.leave(`trading:${sessionId}`);
    sessionSubscriptions.delete(socket.id);
    
    socket.emit('trading:unsubscribed', { sessionId });
    console.log(`User ${userId} unsubscribed from session ${sessionId}`);
  });
  
  // ==================== Tick Streaming ====================
  
  /**
   * Start tick stream for a volatility index
   */
  socket.on('trading:startTicks', async (data) => {
    const { accountId, volatilityIndex } = data;
    
    try {
      // Get account to verify and get token
      const accounts = await tradingService.getAdminAccounts(userId);
      const account = accounts.find(a => a.id === accountId || a.account_id === accountId);
      
      if (!account) {
        socket.emit('trading:error', { message: 'Account not found' });
        return;
      }
      
      const connectionKey = `${accountId}:${volatilityIndex}`;
      
      // Check if already connected
      if (derivConnections.has(connectionKey)) {
        socket.emit('trading:ticksStarted', { accountId, volatilityIndex });
        return;
      }
      
      // Create Deriv WebSocket connection
      const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
      
      ws.on('open', () => {
        // Authorize first
        ws.send(JSON.stringify({ authorize: account.deriv_token }));
      });
      
      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        
        if (response.authorize) {
          // Start tick subscription after authorization
          ws.send(JSON.stringify({
            ticks: volatilityIndex,
            subscribe: 1,
          }));
          
          socket.emit('trading:ticksStarted', { accountId, volatilityIndex });
        }
        
        if (response.tick) {
          const tick = {
            symbol: response.tick.symbol,
            epoch: response.tick.epoch,
            quote: response.tick.quote,
            digit: parseInt(response.tick.quote.toString().slice(-1)),
          };
          
          // Store in buffer
          if (!tickBuffers.has(volatilityIndex)) {
            tickBuffers.set(volatilityIndex, []);
          }
          const buffer = tickBuffers.get(volatilityIndex);
          buffer.push(tick);
          
          // Keep only last 100 ticks
          if (buffer.length > 100) {
            buffer.shift();
          }
          
          // Emit tick to all subscribers
          io.to(`ticks:${volatilityIndex}`).emit('trading:tick', {
            volatilityIndex,
            tick,
            bufferSize: buffer.length,
          });
        }
        
        if (response.error) {
          socket.emit('trading:error', { 
            message: response.error.message,
            code: response.error.code,
          });
        }
      });
      
      ws.on('error', (err) => {
        console.error(`Deriv WS error for ${connectionKey}:`, err);
        socket.emit('trading:error', { message: 'Connection error' });
      });
      
      ws.on('close', () => {
        derivConnections.delete(connectionKey);
        console.log(`Deriv connection closed for ${connectionKey}`);
      });
      
      derivConnections.set(connectionKey, ws);
      socket.join(`ticks:${volatilityIndex}`);
      
    } catch (error) {
      console.error('Error starting ticks:', error);
      socket.emit('trading:error', { message: error.message });
    }
  });
  
  /**
   * Stop tick stream
   */
  socket.on('trading:stopTicks', (data) => {
    const { accountId, volatilityIndex } = data;
    const connectionKey = `${accountId}:${volatilityIndex}`;
    
    const ws = derivConnections.get(connectionKey);
    if (ws) {
      ws.close();
      derivConnections.delete(connectionKey);
    }
    
    socket.leave(`ticks:${volatilityIndex}`);
    socket.emit('trading:ticksStopped', { accountId, volatilityIndex });
  });
  
  /**
   * Get current tick buffer
   */
  socket.on('trading:getTickBuffer', (data) => {
    const { volatilityIndex } = data;
    const buffer = tickBuffers.get(volatilityIndex) || [];
    
    socket.emit('trading:tickBuffer', {
      volatilityIndex,
      ticks: buffer,
    });
  });
  
  // ==================== Trade Execution ====================
  
  /**
   * Execute a trade
   */
  socket.on('trading:executeTrade', async (data) => {
    const { 
      sessionId,
      accountId, 
      contractType, 
      volatilityIndex, 
      stake, 
      prediction,
      strategy 
    } = data;
    
    try {
      // Get account
      const accounts = await tradingService.getAdminAccounts(userId);
      const account = accounts.find(a => a.id === accountId || a.account_id === accountId);
      
      if (!account) {
        socket.emit('trading:error', { message: 'Account not found' });
        return;
      }
      
      // Create WebSocket for trade
      const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
      
      ws.on('open', () => {
        ws.send(JSON.stringify({ authorize: account.deriv_token }));
      });
      
      ws.on('message', async (rawData) => {
        const response = JSON.parse(rawData.toString());
        
        if (response.authorize) {
          // Get proposal first
          const proposalRequest = {
            proposal: 1,
            amount: stake,
            basis: 'stake',
            contract_type: contractType,
            currency: account.currency || 'USD',
            duration: 1,
            duration_unit: 't',
            symbol: volatilityIndex,
          };
          
          // Add prediction for digit contracts
          if (contractType.includes('DIGIT')) {
            if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') {
              proposalRequest.barrier = prediction.toString();
            } else if (contractType === 'DIGITMATCH' || contractType === 'DIGITDIFF') {
              proposalRequest.barrier = prediction.toString();
            }
          }
          
          ws.send(JSON.stringify(proposalRequest));
        }
        
        if (response.proposal) {
          // Buy the contract
          ws.send(JSON.stringify({
            buy: response.proposal.id,
            price: stake,
          }));
        }
        
        if (response.buy) {
          // Trade executed
          const trade = {
            sessionId,
            accountId,
            contractId: response.buy.contract_id,
            contractType,
            volatilityIndex,
            strategy,
            stake,
            entryTick: response.buy.buy_price,
            prediction,
            result: 'pending',
          };
          
          // Record the trade
          const recordedTrade = await tradingService.recordTrade(trade);
          
          // Subscribe to contract updates
          ws.send(JSON.stringify({
            proposal_open_contract: 1,
            contract_id: response.buy.contract_id,
            subscribe: 1,
          }));
          
          socket.emit('trading:tradeExecuted', {
            trade: recordedTrade,
            contractId: response.buy.contract_id,
          });
          
          // Broadcast to session room
          io.to(`trading:${sessionId}`).emit('trading:newTrade', {
            trade: recordedTrade,
          });
        }
        
        if (response.proposal_open_contract) {
          const contract = response.proposal_open_contract;
          
          if (contract.is_sold || contract.is_expired) {
            const profit = contract.profit;
            const result = profit > 0 ? 'won' : 'lost';
            
            // Update trade result
            await tradingService.updateTradeResult(
              contract.contract_id,
              result,
              profit,
              contract.exit_tick
            );
            
            socket.emit('trading:tradeResult', {
              contractId: contract.contract_id,
              result,
              profit,
              exitTick: contract.exit_tick,
            });
            
            // Broadcast to session room
            io.to(`trading:${sessionId}`).emit('trading:tradeCompleted', {
              contractId: contract.contract_id,
              result,
              profit,
            });
            
            // Check if session TP/SL reached
            const session = await tradingService.getSession(sessionId);
            if (session.status === tradingService.SESSION_STATUS.TP_REACHED) {
              io.to(`trading:${sessionId}`).emit('trading:tpReached', {
                sessionId,
                pnl: session.current_pnl,
              });
            } else if (session.status === tradingService.SESSION_STATUS.SL_REACHED) {
              io.to(`trading:${sessionId}`).emit('trading:slReached', {
                sessionId,
                pnl: session.current_pnl,
              });
            }
            
            ws.close();
          }
        }
        
        if (response.error) {
          socket.emit('trading:error', { 
            message: response.error.message,
            code: response.error.code,
          });
          ws.close();
        }
      });
      
      ws.on('error', (err) => {
        console.error('Trade execution error:', err);
        socket.emit('trading:error', { message: 'Trade execution failed' });
      });
      
    } catch (error) {
      console.error('Error executing trade:', error);
      socket.emit('trading:error', { message: error.message });
    }
  });
  
  // ==================== Session Control ====================
  
  /**
   * Start session via socket
   */
  socket.on('trading:startSession', async (data) => {
    const { sessionId } = data;
    
    try {
      const session = await tradingService.updateSession(sessionId, {
        status: tradingService.SESSION_STATUS.RUNNING,
        started_at: new Date().toISOString(),
      });
      
      await tradingService.logActivity('session_started', `Session started via socket`, {
        sessionId,
        userId,
      });
      
      io.to(`trading:${sessionId}`).emit('trading:sessionStarted', {
        session,
      });
      
    } catch (error) {
      console.error('Error starting session:', error);
      socket.emit('trading:error', { message: error.message });
    }
  });
  
  /**
   * Stop session via socket
   */
  socket.on('trading:stopSession', async (data) => {
    const { sessionId } = data;
    
    try {
      const session = await tradingService.updateSession(sessionId, {
        status: tradingService.SESSION_STATUS.COMPLETED,
        ended_at: new Date().toISOString(),
      });
      
      await tradingService.logActivity('session_stopped', `Session stopped via socket`, {
        sessionId,
        userId,
      });
      
      io.to(`trading:${sessionId}`).emit('trading:sessionStopped', {
        session,
      });
      
    } catch (error) {
      console.error('Error stopping session:', error);
      socket.emit('trading:error', { message: error.message });
    }
  });
  
  // ==================== Cleanup on Disconnect ====================
  
  socket.on('disconnect', () => {
    // Clean up session subscriptions
    const sessionId = sessionSubscriptions.get(socket.id);
    if (sessionId) {
      socket.leave(`trading:${sessionId}`);
      sessionSubscriptions.delete(socket.id);
    }
    
    console.log(`Trading socket disconnected: ${userId}`);
  });
}

/**
 * Broadcast session update to all subscribers
 */
function broadcastSessionUpdate(io, sessionId, session) {
  io.to(`trading:${sessionId}`).emit('trading:sessionUpdate', {
    session,
  });
}

/**
 * Broadcast trade to session subscribers
 */
function broadcastTrade(io, sessionId, trade) {
  io.to(`trading:${sessionId}`).emit('trading:newTrade', {
    trade,
  });
}

/**
 * Broadcast notification to session subscribers
 */
function broadcastNotification(io, sessionId, notification) {
  io.to(`trading:${sessionId}`).emit('trading:notification', {
    notification,
  });
}

/**
 * Get tick buffer for a volatility index
 */
function getTickBuffer(volatilityIndex) {
  return tickBuffers.get(volatilityIndex) || [];
}

/**
 * Close all Deriv connections
 */
function closeAllConnections() {
  for (const [key, ws] of derivConnections) {
    try {
      ws.close();
    } catch (err) {
      console.error(`Error closing connection ${key}:`, err);
    }
  }
  derivConnections.clear();
  tickBuffers.clear();
}

module.exports = {
  setupTradingSocketHandlers,
  broadcastSessionUpdate,
  broadcastTrade,
  broadcastNotification,
  getTickBuffer,
  closeAllConnections,
};

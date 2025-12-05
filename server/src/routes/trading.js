/**
 * Trading Routes - API endpoints for multi-account automated trading
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const tradingService = require('../services/trading');

// ==================== Account Routes ====================

/**
 * GET /api/trading/accounts
 * Get all trading accounts for the authenticated admin
 */
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const accounts = await tradingService.getAdminAccounts(req.userId);
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/accounts
 * Add a new trading account
 */
router.post('/accounts', authMiddleware, async (req, res) => {
  try {
    const { derivToken } = req.body;
    
    if (!derivToken) {
      return res.status(400).json({ success: false, error: 'Deriv token is required' });
    }
    
    // Verify the token first
    const accountInfo = await tradingService.verifyDerivToken(derivToken);
    
    // Add the account
    const account = await tradingService.addTradingAccount(req.userId, {
      accountId: accountInfo.accountId,
      derivToken,
      accountType: accountInfo.isVirtual ? 'demo' : 'real',
      currency: accountInfo.currency,
      balance: accountInfo.balance,
    });
    
    await tradingService.logActivity('account_added', `Account ${accountInfo.accountId} added`, {
      adminId: req.userId,
      accountId: account.id,
    });
    
    res.status(201).json({ 
      success: true, 
      data: {
        ...account,
        email: accountInfo.email,
        fullName: accountInfo.fullName,
      }
    });
  } catch (error) {
    console.error('Error adding account:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/trading/accounts/:id
 * Update a trading account
 */
router.put('/accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const account = await tradingService.updateTradingAccount(id, updates);
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/trading/accounts/:id
 * Delete a trading account
 */
router.delete('/accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    await tradingService.deleteTradingAccount(id);
    await tradingService.logActivity('account_deleted', `Account deleted`, {
      adminId: req.userId,
      accountId: id,
    });
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/accounts/verify
 * Verify a Deriv token without adding the account
 */
router.post('/accounts/verify', authMiddleware, async (req, res) => {
  try {
    const { derivToken } = req.body;
    
    if (!derivToken) {
      return res.status(400).json({ success: false, error: 'Deriv token is required' });
    }
    
    const accountInfo = await tradingService.verifyDerivToken(derivToken);
    res.json({ success: true, data: accountInfo });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== Session Routes ====================

/**
 * GET /api/trading/sessions
 * Get all sessions for the authenticated admin
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const { status, type, limit } = req.query;
    const options = {};
    
    if (status) options.status = status;
    if (type) options.type = type;
    if (limit) options.limit = parseInt(limit);
    
    const sessions = await tradingService.getAdminSessions(req.userId, options);
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trading/sessions/:id
 * Get a specific session
 */
router.get('/sessions/:id', authMiddleware, async (req, res) => {
  try {
    const session = await tradingService.getSession(req.params.id);
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/sessions
 * Create a new trading session
 */
router.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const sessionData = req.body;
    const session = await tradingService.createSession(req.userId, sessionData);
    
    await tradingService.logActivity('session_created', `Session "${session.name}" created`, {
      adminId: req.userId,
      sessionId: session.id,
      type: session.type,
    });
    
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/trading/sessions/:id
 * Update a session
 */
router.put('/sessions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const session = await tradingService.updateSession(id, updates);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/trading/sessions/:id
 * Delete a session
 */
router.delete('/sessions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    await tradingService.deleteSession(id);
    await tradingService.logActivity('session_deleted', 'Session deleted', {
      adminId: req.userId,
      sessionId: id,
    });
    
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/sessions/:id/start
 * Start a trading session
 */
router.post('/sessions/:id/start', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await tradingService.updateSession(id, {
      status: tradingService.SESSION_STATUS.RUNNING,
      started_at: new Date().toISOString(),
    });
    
    await tradingService.logActivity('session_started', `Session "${session.name}" started`, {
      sessionId: id,
    });
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/sessions/:id/stop
 * Stop a trading session
 */
router.post('/sessions/:id/stop', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await tradingService.updateSession(id, {
      status: tradingService.SESSION_STATUS.COMPLETED,
      ended_at: new Date().toISOString(),
    });
    
    await tradingService.logActivity('session_stopped', `Session "${session.name}" stopped`, {
      sessionId: id,
    });
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/sessions/:id/pause
 * Pause a trading session
 */
router.post('/sessions/:id/pause', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await tradingService.updateSession(id, {
      status: tradingService.SESSION_STATUS.PAUSED,
    });
    
    await tradingService.logActivity('session_paused', `Session "${session.name}" paused`, {
      sessionId: id,
    });
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error pausing session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/sessions/:id/resume
 * Resume a paused trading session
 */
router.post('/sessions/:id/resume', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await tradingService.updateSession(id, {
      status: tradingService.SESSION_STATUS.RUNNING,
    });
    
    await tradingService.logActivity('session_resumed', `Session "${session.name}" resumed`, {
      sessionId: id,
    });
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trading/sessions/:id/accounts
 * Get accounts in a session
 */
router.get('/sessions/:id/accounts', authMiddleware, async (req, res) => {
  try {
    const accounts = await tradingService.getSessionAccounts(req.params.id);
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching session accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Invitation Routes ====================

/**
 * POST /api/trading/sessions/:id/invite
 * Invite accounts to a session
 */
router.post('/sessions/:id/invite', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountIds } = req.body;
    
    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Account IDs are required' });
    }
    
    const invitations = await Promise.all(
      accountIds.map(accountId => 
        tradingService.createInvitation(id, accountId, req.userId)
      )
    );
    
    await tradingService.logActivity('invitations_sent', `${invitations.length} invitations sent`, {
      sessionId: id,
      accountCount: invitations.length,
    });
    
    res.status(201).json({ success: true, data: invitations });
  } catch (error) {
    console.error('Error creating invitations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trading/invitations
 * Get pending invitations for the authenticated user's accounts
 */
router.get('/invitations', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.query;
    
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'Account ID is required' });
    }
    
    const invitations = await tradingService.getAccountInvitations(accountId);
    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/invitations/:id/accept
 * Accept an invitation
 */
router.post('/invitations/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'Account ID is required' });
    }
    
    const invitation = await tradingService.acceptInvitation(id, accountId);
    
    await tradingService.logActivity('invitation_accepted', 'Invitation accepted', {
      invitationId: id,
      accountId,
    });
    
    res.json({ success: true, data: invitation });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/invitations/:id/decline
 * Decline an invitation
 */
router.post('/invitations/:id/decline', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'Account ID is required' });
    }
    
    const invitation = await tradingService.declineInvitation(id, accountId);
    
    res.json({ success: true, data: invitation });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== Trade Routes ====================

/**
 * GET /api/trading/sessions/:id/trades
 * Get trades for a session
 */
router.get('/sessions/:id/trades', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId, limit } = req.query;
    
    const options = {};
    if (accountId) options.accountId = accountId;
    if (limit) options.limit = parseInt(limit);
    
    const trades = await tradingService.getSessionTrades(id, options);
    res.json({ success: true, data: trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trading/sessions/:id/stats
 * Get trade statistics for a session
 */
router.get('/sessions/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId } = req.query;
    
    const stats = await tradingService.getTradeStats(id, accountId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Bot Control Routes ====================

/**
 * GET /api/trading/bot/status
 * Get bot status
 */
router.get('/bot/status', authMiddleware, async (req, res) => {
  try {
    const status = tradingService.getBotStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/bot/start
 * Start the trading bot
 */
router.post('/bot/start', authMiddleware, async (req, res) => {
  try {
    const result = await tradingService.startBot();
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error('Error starting bot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/trading/bot/stop
 * Stop the trading bot
 */
router.post('/bot/stop', authMiddleware, async (req, res) => {
  try {
    const result = await tradingService.stopBot();
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error('Error stopping bot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Activity Log Routes ====================

/**
 * GET /api/trading/logs
 * Get activity logs
 */
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    const options = {};
    if (type) options.type = type;
    if (limit) options.limit = parseInt(limit);
    
    const logs = await tradingService.getActivityLogs(options);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Constants Routes ====================

/**
 * GET /api/trading/constants
 * Get trading constants (strategies, contract types, etc.)
 */
router.get('/constants', async (req, res) => {
  res.json({
    success: true,
    data: {
      sessionTypes: tradingService.SESSION_TYPE,
      sessionStatuses: tradingService.SESSION_STATUS,
      accountStatuses: tradingService.ACCOUNT_STATUS,
      contractTypes: tradingService.CONTRACT_TYPES,
      strategyNames: tradingService.STRATEGY_NAMES,
      volatilityIndices: tradingService.VOLATILITY_INDICES,
      stakingModes: tradingService.STAKING_MODE,
    }
  });
});

module.exports = router;

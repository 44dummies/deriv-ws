/**
 * Trading API Service
 * HTTP client for backend trading endpoints
 */

import { apiClient } from '../services/apiClient';

const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://tradermind-server.up.railway.app';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface SessionQueryOptions {
  status?: string;
  type?: string;
  limit?: string | number;
}

interface TradeQueryOptions {
  accountId?: string;
  limit?: string | number;
}



interface SessionData {
  name: string;
  session_type: string;
  mode?: 'real' | 'demo'; // Add mode
  min_balance?: number;
  initial_stake?: number;
  martingale_multiplier?: number;
  default_tp?: number;
  default_sl?: number;
  markets?: string[];
  duration?: number;
  duration_unit?: string;
  stake_percentage?: number;
  contract_type?: string;
  strategy?: string;
  description?: string;
}

/**
 * Helper to make authenticated requests using apiClient
 * Delegates to apiClient which handles token management and 401 refreshes automatically
 */
async function apiRequest(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const method = options.method || 'GET';
  const headers = options.headers || {};

  // Parse body if it's a string (tradingApi sends JSON strings)
  const body = options.body ? JSON.parse(options.body) : undefined;

  switch (method) {
    case 'GET':
      // Ensure endpoint starts with /api if not already (though tradingApi calls include it)
      return apiClient.get(endpoint, { headers });
    case 'POST':
      return apiClient.post(endpoint, body, { headers });
    case 'PUT':
      return apiClient.put(endpoint, body, { headers });
    case 'DELETE':
      return apiClient.delete(endpoint, { headers });
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

// ==================== Account APIs ====================

export async function getAccounts() {
  return apiRequest('/api/trading/accounts');
}

export async function addAccount(derivToken) {
  return apiRequest('/api/trading/accounts', {
    method: 'POST',
    body: JSON.stringify({ derivToken })
  });
}

export async function verifyToken(derivToken) {
  return apiRequest('/api/trading/accounts/verify', {
    method: 'POST',
    body: JSON.stringify({ derivToken })
  });
}

export async function updateAccount(accountId, updates) {
  return apiRequest(`/api/trading/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteAccount(accountId) {
  return apiRequest(`/api/trading/accounts/${accountId}`, {
    method: 'DELETE'
  });
}

// ==================== Session APIs ====================

export async function getSessions(options: SessionQueryOptions = {}) {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.type) params.append('type', options.type);
  if (options.limit) params.append('limit', String(options.limit));

  const query = params.toString();
  return apiRequest(`/api/trading/sessions${query ? '?' + query : ''}`);
}

export async function getSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}`);
}

// Get user's active session with their TP/SL
export async function getMyActiveSession() {
  try {
    const result = await apiRequest('/api/user/sessions/status');
    if (result && result.status !== 'none' && result.session) {
      // Normalize field names for frontend compatibility
      return {
        id: result.session.id,
        session_name: result.session.name,
        name: result.session.name,
        type: result.session.type,
        status: result.session.sessionStatus || result.status,
        user_tp: result.tp,
        user_sl: result.sl,
        current_pnl: result.currentPnl,
        initial_balance: result.initialBalance,
        accepted_at: result.acceptedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}

// Accept a session with TP/SL
export async function acceptSession(data: { sessionId: string; accountId: string; takeProfit: number; stopLoss: number }) {
  return apiRequest(`/api/trading/sessions/${data.sessionId}/join`, {
    method: 'POST',
    body: JSON.stringify({ accountId: data.accountId, takeProfit: data.takeProfit, stopLoss: data.stopLoss })
  });
}

// Update user's TP/SL for a session
export async function updateUserTPSL(data: { sessionId: string; takeProfit: number; stopLoss: number }) {
  return apiRequest(`/api/trading/sessions/${data.sessionId}/tpsl`, {
    method: 'PUT',
    body: JSON.stringify({ takeProfit: data.takeProfit, stopLoss: data.stopLoss })
  });
}

// Leave a session
export async function leaveSession(sessionId: string) {
  return apiRequest(`/api/user/sessions/leave`, {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
}

export async function createSession(sessionData) {
  return apiRequest('/api/trading/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
}

export async function updateSession(sessionId, updates) {
  return apiRequest(`/api/trading/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}`, {
    method: 'DELETE'
  });
}

export async function startSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}/start`, {
    method: 'POST'
  });
}

export async function stopSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}/stop`, {
    method: 'POST'
  });
}

export async function pauseSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}/pause`, {
    method: 'POST'
  });
}

export async function resumeSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}/resume`, {
    method: 'POST'
  });
}

export async function getSessionParticipants(sessionId: string) {
  return apiRequest(`/api/admin/sessions/${sessionId}/participants`);
}

export async function kickParticipant(sessionId: string, userId: string, reason?: string) {
  return apiRequest(`/api/admin/sessions/${sessionId}/kick/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

// ==================== Invitation APIs ====================

export async function inviteAccounts(sessionId, accountIds) {
  return apiRequest(`/api/trading/sessions/${sessionId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ accountIds })
  });
}

export async function getInvitations(accountId) {
  return apiRequest(`/api/trading/invitations?accountId=${accountId}`);
}

export async function acceptInvitation(invitationId, accountId) {
  return apiRequest(`/api/trading/invitations/${invitationId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ accountId })
  });
}

export async function declineInvitation(invitationId, accountId) {
  return apiRequest(`/api/trading/invitations/${invitationId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ accountId })
  });
}

// ==================== Trade APIs ====================

export async function getSessionTrades(sessionId: string, options: TradeQueryOptions = {}) {
  const params = new URLSearchParams();
  if (options.accountId) params.append('accountId', options.accountId);
  if (options.limit) params.append('limit', String(options.limit));

  const query = params.toString();
  return apiRequest(`/api/trading/sessions/${sessionId}/trades${query ? '?' + query : ''}`);
}

export async function getTradeStats(sessionId, accountId = null) {
  const query = accountId ? `?accountId=${accountId}` : '';
  return apiRequest(`/api/trading/sessions/${sessionId}/stats${query}`);
}

// ==================== Bot Control APIs ====================

export async function getBotStatus() {
  return apiRequest('/api/admin/bot/status');
}

export async function startBot(sessionId) {
  return apiRequest('/api/admin/bot/start', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
}

export async function stopBot() {
  return apiRequest('/api/admin/bot/stop', {
    method: 'POST'
  });
}

export async function pauseBot() {
  return apiRequest('/api/admin/bot/pause', {
    method: 'POST'
  });
}

export async function resumeBot() {
  return apiRequest('/api/admin/bot/resume', {
    method: 'POST'
  });
}

// ==================== Activity Logs ====================

export async function getActivityLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/api/admin/logs${query ? '?' + query : ''}`);
}

// ==================== Constants ====================

export async function getTradingConstants() {
  try {
    const result = await apiRequest('/api/trading/constants');
    return result?.data || getDefaultConstants();
  } catch (error) {
    console.warn('Failed to fetch trading constants, using defaults:', error);
    return getDefaultConstants();
  }
}

function getDefaultConstants() {
  return {
    strategies: [
      { id: 'DFPM', name: 'Digit Frequency Pattern Matching' },
      { id: 'VCS', name: 'Volatility Correlation Strategy' }
    ],
    markets: [
      { id: '1HZ100V', name: 'Volatility 100 (1s) Index' },
      { id: '1HZ75V', name: 'Volatility 75 (1s) Index' },
      { id: '1HZ50V', name: 'Volatility 50 (1s) Index' },
      { id: '1HZ25V', name: 'Volatility 25 (1s) Index' },
      { id: '1HZ10V', name: 'Volatility 10 (1s) Index' },
      { id: 'JD100', name: 'Jump 100 Index' },
      { id: 'JD75', name: 'Jump 75 Index' },
      { id: 'JD50', name: 'Jump 50 Index' },
      { id: 'JD25', name: 'Jump 25 Index' },
      { id: 'JD10', name: 'Jump 10 Index' }
    ],
    stakingModes: [
      { id: 'fixed', name: 'Fixed Stake' },
      { id: 'martingale', name: 'Martingale' },
      { id: 'compounding', name: 'Compounding' }
    ]
  };
}

// ==================== Analytics APIs ====================

export async function getLiveStats() {
  return apiRequest('/api/admin/stats/live');
}

export async function getStats(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/api/admin/stats${query ? '?' + query : ''}`);
}

export async function getBalances() {
  return apiRequest('/api/admin/stats/balances');
}

// ==================== Recovery APIs ====================

export async function getRecoveryState(sessionId) {
  return apiRequest(`/api/admin/recovery/${sessionId}`);
}

export async function resetRecovery(sessionId) {
  return apiRequest(`/api/admin/recovery/${sessionId}/reset`, {
    method: 'POST'
  });
}

// ==================== Unified Export ====================

export const tradingApi = {
  // Accounts
  getAccounts,
  addAccount,
  verifyToken,
  updateAccount,
  deleteAccount,

  // Sessions
  getSessions,
  getSession,
  getMyActiveSession,
  acceptSession,
  leaveSession,
  updateUserTPSL,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  stopSession,
  pauseSession,
  resumeSession,
  getSessionParticipants,
  kickParticipant,

  // Invitations
  inviteAccounts,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  createInvitation: inviteAccounts, // Alias

  // Trades
  getSessionTrades,
  getTradeStats,
  getTrades: getSessionTrades, // Alias

  // Bot Control
  startBot,
  stopBot,
  getBotStatus,
  pauseBot,
  resumeBot,

  // Activity Logs
  getActivityLogs,

  // Constants
  getConstants: getTradingConstants,

  // Analytics
  getLiveStats,
  getStats,
  getBalances,

  // Recovery
  getRecoveryState,
  resetRecovery
};

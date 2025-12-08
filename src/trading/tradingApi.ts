/**
 * Trading API Service
 * HTTP client for backend trading endpoints
 */

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
 * Helper to make authenticated requests
 */
async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const token = sessionStorage.getItem('accessToken');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
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

// Stub for getting user's active session
export async function getMyActiveSession() {
  const sessions = await getSessions({ status: 'active' });
  return sessions && sessions.length > 0 ? sessions[0] : null;
}

// Stub for accepting a session with TP/SL
export async function acceptSession(data: { sessionId: string; takeProfit: number; stopLoss: number }) {
  return apiRequest(`/api/trading/sessions/${data.sessionId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ takeProfit: data.takeProfit, stopLoss: data.stopLoss })
  });
}

// Stub for updating user's TP/SL
export async function updateUserTPSL(data: { sessionId: string; takeProfit: number; stopLoss: number }) {
  return apiRequest(`/api/trading/sessions/${data.sessionId}/tpsl`, {
    method: 'PUT',
    body: JSON.stringify({ takeProfit: data.takeProfit, stopLoss: data.stopLoss })
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
  // Return hardcoded constants or fetch from backend if endpoint exists
  return {
    strategies: ['DFPM', 'VCS'],
    markets: ['R_100', 'R_50', 'R_25', 'R_10'],
    staking_modes: ['fixed', 'martingale', 'compounding']
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
  updateUserTPSL,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  stopSession,
  pauseSession,
  resumeSession,

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

  // Recovery
  getRecoveryState,
  resetRecovery
};

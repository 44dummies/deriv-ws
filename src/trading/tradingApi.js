/**
 * Trading API Service
 * HTTP client for backend trading endpoints
 */

const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://tradermind-server.up.railway.app';

/**
 * Helper to make authenticated requests
 */
async function apiRequest(endpoint, options = {}) {
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

export async function getSessions(options = {}) {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.type) params.append('type', options.type);
  if (options.limit) params.append('limit', options.limit);
  
  const query = params.toString();
  return apiRequest(`/api/trading/sessions${query ? '?' + query : ''}`);
}

export async function getSession(sessionId) {
  return apiRequest(`/api/trading/sessions/${sessionId}`);
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

export async function getSessionTrades(sessionId, options = {}) {
  const params = new URLSearchParams();
  if (options.accountId) params.append('accountId', options.accountId);
  if (options.limit) params.append('limit', options.limit);
  
  const query = params.toString();
  return apiRequest(`/api/trading/sessions/${sessionId}/trades${query ? '?' + query : ''}`);
}

export async function getTradeStats(sessionId, accountId = null) {
  const query = accountId ? `?accountId=${accountId}` : '';
  return apiRequest(`/api/trading/sessions/${sessionId}/stats${query}`);
}

// ==================== Bot Control APIs ====================

export async function getBotStatus() {
  return apiRequest('/api/trading/bot/status');
}

export async function startBot() {
  return apiRequest('/api/trading/bot/start', { method: 'POST' });
}

export async function stopBot() {
  return apiRequest('/api/trading/bot/stop', { method: 'POST' });
}

// ==================== Activity Log APIs ====================

export async function getActivityLogs(options = {}) {
  const params = new URLSearchParams();
  if (options.type) params.append('type', options.type);
  if (options.limit) params.append('limit', options.limit);
  
  const query = params.toString();
  return apiRequest(`/api/trading/logs${query ? '?' + query : ''}`);
}

// ==================== Constants APIs ====================

export async function getTradingConstants() {
  return apiRequest('/api/trading/constants');
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
  
  // Activity Logs
  getActivityLogs,
  
  // Constants
  getConstants: getTradingConstants
};

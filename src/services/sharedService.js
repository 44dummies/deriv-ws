/**
 * Shared Resources Service - Notes & Watchlists
 */

const API_URL = process.env.REACT_APP_SERVER_URL || 'https://tradermind-server.up.railway.app';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }
  return response.json();
};

export const sharedService = {
  
  
  

  async getNotes(chatId) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/notes`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateNotes(chatId, content, title = null) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/notes`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, title })
    });
    return handleResponse(response);
  },

  
  
  

  async getWatchlist(chatId) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async addSymbol(chatId, symbol, notes = '') {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist/symbol`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ symbol, notes })
    });
    return handleResponse(response);
  },

  async removeSymbol(chatId, symbol) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist/symbol/${symbol}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateSymbolNotes(chatId, symbol, notes) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist/symbol/${symbol}/notes`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes })
    });
    return handleResponse(response);
  },

  async addStrategy(chatId, strategy) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist/strategy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(strategy)
    });
    return handleResponse(response);
  },

  async updateTimeframes(chatId, timeframes) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist/timeframes`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ timeframes })
    });
    return handleResponse(response);
  },

  async renameWatchlist(chatId, name) {
    const response = await fetch(`${API_URL}/api/shared/${chatId}/watchlist/name`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });
    return handleResponse(response);
  }
};

export default sharedService;

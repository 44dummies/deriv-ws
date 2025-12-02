/**
 * Friends Service - Frontend API client for friends functionality
 */

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
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

export const friendsService = {
  // =============================================
  // PROFILE
  // =============================================

  async getMyProfile() {
    const response = await fetch(`${API_URL}/api/friends/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getProfileByUsername(username) {
    const response = await fetch(`${API_URL}/api/friends/profile/${username}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateProfile(updates) {
    const response = await fetch(`${API_URL}/api/friends/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return handleResponse(response);
  },

  // =============================================
  // SEARCH
  // =============================================

  async searchUsers(query, limit = 20) {
    const response = await fetch(
      `${API_URL}/api/friends/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  // =============================================
  // FRIEND REQUESTS
  // =============================================

  async sendFriendRequest(userId) {
    const response = await fetch(`${API_URL}/api/friends/request/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async acceptFriendRequest(friendshipId) {
    const response = await fetch(`${API_URL}/api/friends/accept/${friendshipId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async declineFriendRequest(friendshipId) {
    const response = await fetch(`${API_URL}/api/friends/decline/${friendshipId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getPendingRequests() {
    const response = await fetch(`${API_URL}/api/friends/requests/pending`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getSentRequests() {
    const response = await fetch(`${API_URL}/api/friends/requests/sent`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // =============================================
  // FRIENDS LIST
  // =============================================

  async getFriends() {
    const response = await fetch(`${API_URL}/api/friends`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async removeFriend(friendId) {
    const response = await fetch(`${API_URL}/api/friends/${friendId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async blockUser(userId) {
    const response = await fetch(`${API_URL}/api/friends/block/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // =============================================
  // RECOMMENDATIONS
  // =============================================

  async getRecommendations(limit = 10) {
    const response = await fetch(`${API_URL}/api/friends/recommendations?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // =============================================
  // ONLINE STATUS
  // =============================================

  async updateOnlineStatus(isOnline, socketId = null) {
    const response = await fetch(`${API_URL}/api/friends/status/online`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isOnline, socketId })
    });
    return handleResponse(response);
  }
};

export default friendsService;

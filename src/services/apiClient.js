/**
 * TraderMind API Client
 * Handles all HTTP API requests to the backend
 */

const API_URL = process.env.REACT_APP_SERVER_URL 
  ? `${process.env.REACT_APP_SERVER_URL}/api`
  : 'http:

class ApiClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.onTokenRefresh = null;
    this.onAuthError = null;
    
    this.loadTokens();
  }

  /**
   * Set tokens
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Load tokens from storage
   */
  loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    return { accessToken: this.accessToken, refreshToken: this.refreshToken };
  }

  /**
   * Clear tokens
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Set callback for token refresh
   */
  onTokenRefreshed(callback) {
    this.onTokenRefresh = callback;
  }

  /**
   * Set callback for auth errors
   */
  onAuthenticationError(callback) {
    this.onAuthError = callback;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return this.handleResponse(retryResponse);
        } else {
          this.clearTokens();
          if (this.onAuthError) {
            this.onAuthError();
          }
          throw new Error('Session expired');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Handle response
   */
  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);
        if (this.onTokenRefresh) {
          this.onTokenRefresh(data.accessToken, data.refreshToken);
        }
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  

  async get(endpoint, options = {}) {
    const { params, ...rest } = options;
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url = `${endpoint}?${searchParams.toString()}`;
    }
    return this.request(url, { method: 'GET', ...rest });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  /**
   * Upload file (multipart/form-data)
   * Don't set Content-Type header - browser will set it with boundary
   */
  async uploadFile(endpoint, formData, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        ...options
      });

      
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { 
            method: 'POST', 
            headers, 
            body: formData,
            ...options 
          });
          return this.handleResponse(retryResponse);
        } else {
          this.clearTokens();
          if (this.onAuthError) {
            this.onAuthError();
          }
          throw new Error('Session expired');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('File upload error:', error);
      return { success: false, error: error.message };
    }
  }

  

  async register(data) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async loginWithDeriv(derivData) {
    console.log('apiClient.loginWithDeriv called with:', derivData);
    const result = await this.request('/auth/deriv', {
      method: 'POST',
      body: JSON.stringify(derivData)
    });
    console.log('apiClient.loginWithDeriv result:', result);
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  

  async getMyProfile() {
    return this.request('/users/me');
  }

  async updateMyProfile(data) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_URL}/users/me/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    });
    
    return this.handleResponse(response);
  }

  async deleteAvatar() {
    return this.request('/users/me/avatar', { method: 'DELETE' });
  }

  async searchUsers(query, limit = 20) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getUserProfile(username) {
    return this.request(`/users/${encodeURIComponent(username)}`);
  }

  

  async getChatrooms() {
    return this.request('/chatrooms');
  }

  async getRecommendedChatrooms() {
    return this.request('/chatrooms/recommendations');
  }

  async getChatroom(id) {
    return this.request(`/chatrooms/${id}`);
  }

  async getChatroomMessages(id, before = null, limit = 50) {
    let url = `/chatrooms/${id}/messages?limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    return this.request(url);
  }

  async getChatroomMembers(id, limit = 50) {
    return this.request(`/chatrooms/${id}/members?limit=${limit}`);
  }

  async joinChatroom(id) {
    return this.request(`/chatrooms/${id}/join`, { method: 'POST' });
  }

  async leaveChatroom(id) {
    return this.request(`/chatrooms/${id}/leave`, { method: 'POST' });
  }

  async muteChatroom(id, muted) {
    return this.request(`/chatrooms/${id}/mute`, {
      method: 'POST',
      body: JSON.stringify({ muted })
    });
  }

  async syncTradingProfile(profileData) {
    return this.request('/chatrooms/sync-profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  }

  

  async getCommunityFeed(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.category) params.append('category', options.category);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.timeRange) params.append('timeRange', options.timeRange);
    
    return this.request(`/community/feed?${params.toString()}`);
  }

  async createPost(data) {
    return this.request('/community/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getPost(id) {
    return this.request(`/community/posts/${id}`);
  }

  async deletePost(id) {
    return this.request(`/community/posts/${id}`, { method: 'DELETE' });
  }

  async votePost(id, value) {
    return this.request(`/community/posts/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value })
    });
  }

  async addComment(postId, content) {
    return this.request(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async deleteComment(id) {
    return this.request(`/community/comments/${id}`, { method: 'DELETE' });
  }

  async getUserPosts(username, page = 1, limit = 20) {
    return this.request(`/community/users/${encodeURIComponent(username)}/posts?page=${page}&limit=${limit}`);
  }

  async getTrendingTags(limit = 10) {
    return this.request(`/community/tags/trending?limit=${limit}`);
  }

  async searchPosts(query, options = {}) {
    const params = new URLSearchParams({ q: query });
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.category) params.append('category', options.category);
    
    return this.request(`/community/search?${params.toString()}`);
  }

  /**
   * Upload file alias for compatibility
   */
  async upload(endpoint, formData, options = {}) {
    return this.uploadFile(endpoint, formData, options);
  }
}


const apiClient = new ApiClient();

export default apiClient;
export { apiClient };

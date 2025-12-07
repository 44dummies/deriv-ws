/**
 * Profile Service
 * Centralized profile management with real-time sync
 * Uses Deriv account ID as the unique identifier
 */

import apiClient from './apiClient';
import realtimeSocket from './realtimeSocket';

class ProfileService {
  constructor() {
    this.profile = null;
    this.listeners = new Set();
    this.onlineUsers = new Map(); 
    this.initialized = false;
  }

  /**
   * Initialize profile service and load user profile
   */
  async initialize() {
    if (this.initialized) return this.profile;

    try {
      const response = await apiClient.get('/users/me');
      if (response) {
        this.profile = this.normalizeProfile(response);
        this.initialized = true;
        this.notifyListeners('profile:loaded', this.profile);
        
        
        this.setupSocketListeners();
      }
      return this.profile;
    } catch (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
  }

  /**
   * Normalize profile data from server
   */
  normalizeProfile(data) {
    return {
      id: data.id,
      derivId: data.derivId || data.deriv_id,
      username: data.username || `trader_${(data.derivId || data.deriv_id || '').slice(0, 8)}`,
      displayName: data.displayName || data.display_name || data.fullname || '',
      fullname: data.fullname || '',
      email: data.email || '',
      avatarUrl: data.avatarUrl || data.profile_photo || null,
      bio: data.bio || '',
      statusMessage: data.statusMessage || data.status_message || '',
      country: data.country || '',
      performanceTier: data.performanceTier || data.performance_tier || 'beginner',
      isOnline: data.isOnline ?? data.is_online ?? true,
      createdAt: data.createdAt || data.created_at,
      isProfileComplete: data.isProfileComplete ?? data.is_profile_complete ?? false,
    };
  }

  /**
   * Get current profile
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Update profile
   */
  async updateProfile(updates) {
    try {
      const response = await apiClient.put('/users/me', updates);
      
      if (response.success) {
        
        this.profile = { ...this.profile, ...this.normalizeProfile(response.profile || updates) };
        
        
        realtimeSocket.emitProfileUpdate({
          derivId: this.profile.derivId,
          username: this.profile.username,
          displayName: this.profile.displayName,
          avatarUrl: this.profile.avatarUrl,
          statusMessage: this.profile.statusMessage,
        });
        
        this.notifyListeners('profile:updated', this.profile);
        return { success: true, profile: this.profile };
      }
      
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Update username (unique)
   */
  async updateUsername(username) {
    try {
      const response = await apiClient.put('/users/me/username', { username });
      
      if (response.success) {
        this.profile.username = username;
        
        
        realtimeSocket.emitProfileUpdate({
          derivId: this.profile.derivId,
          username: username,
        });
        
        this.notifyListeners('profile:updated', this.profile);
        return { success: true };
      }
      
      return response;
    } catch (error) {
      console.error('Update username error:', error);
      throw error;
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiClient.uploadFile('/users/me/avatar', formData);
      
      if (response.avatarUrl) {
        this.profile.avatarUrl = response.avatarUrl;
        
        
        realtimeSocket.emitProfileUpdate({
          derivId: this.profile.derivId,
          avatarUrl: response.avatarUrl,
        });
        
        this.notifyListeners('profile:updated', this.profile);
        return { success: true, avatarUrl: response.avatarUrl };
      }
      
      return response;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  /**
   * Remove avatar
   */
  async removeAvatar() {
    try {
      const response = await apiClient.delete('/users/me/avatar');
      
      if (response.success) {
        this.profile.avatarUrl = null;
        
        
        realtimeSocket.emitProfileUpdate({
          derivId: this.profile.derivId,
          avatarUrl: null,
        });
        
        this.notifyListeners('profile:updated', this.profile);
        return { success: true };
      }
      
      return response;
    } catch (error) {
      console.error('Remove avatar error:', error);
      throw error;
    }
  }

  /**
   * Setup socket listeners for real-time profile updates
   */
  setupSocketListeners() {
    
    realtimeSocket.on('userProfileUpdated', (data) => {
      const { derivId, ...updates } = data;
      
      
      if (this.onlineUsers.has(derivId)) {
        const user = this.onlineUsers.get(derivId);
        this.onlineUsers.set(derivId, { ...user, ...updates });
      }
      
      this.notifyListeners('user:updated', data);
    });

    
    realtimeSocket.on('onlineUsers', (users) => {
      this.onlineUsers.clear();
      users.forEach(user => {
        this.onlineUsers.set(user.derivId, this.normalizeProfile(user));
      });
      this.notifyListeners('onlineUsers:updated', Array.from(this.onlineUsers.values()));
    });

    
    realtimeSocket.on('userOnline', (user) => {
      this.onlineUsers.set(user.derivId, this.normalizeProfile(user));
      this.notifyListeners('user:online', user);
    });

    
    realtimeSocket.on('userOffline', (data) => {
      this.onlineUsers.delete(data.derivId);
      this.notifyListeners('user:offline', data);
    });
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.onlineUsers.values());
  }

  /**
   * Get user by derivId (from cache or fetch)
   */
  async getUserByDerivId(derivId) {
    
    if (this.onlineUsers.has(derivId)) {
      return this.onlineUsers.get(derivId);
    }

    
    try {
      const response = await apiClient.get(`/users/${derivId}`);
      if (response) {
        const profile = this.normalizeProfile(response);
        this.onlineUsers.set(derivId, profile);
        return profile;
      }
    } catch (error) {
      console.error('Get user error:', error);
    }

    return null;
  }

  /**
   * Subscribe to profile events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data));
  }

  /**
   * Clear profile on logout
   */
  clear() {
    this.profile = null;
    this.onlineUsers.clear();
    this.initialized = false;
    this.listeners.clear();
  }
}


const profileService = new ProfileService();
export default profileService;

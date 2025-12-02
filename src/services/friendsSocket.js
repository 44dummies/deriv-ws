/**
 * Friends Socket Service - Real-time WebSocket connection for Friends Center
 */

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class FriendsSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(derivId, token) {
    if (this.socket?.connected) {
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      this.socket = io(`${SOCKET_URL}/friends`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('[FriendsSocket] Connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        
        // Authenticate
        this.socket.emit('auth', { derivId, token });
      });

      this.socket.on('auth:success', (data) => {
        console.log('[FriendsSocket] Authenticated:', data.user?.username);
        this.userId = data.user?.id;
        this.emitToListeners('auth:success', data);
        resolve(data);
      });

      this.socket.on('auth:error', (error) => {
        console.error('[FriendsSocket] Auth error:', error);
        this.emitToListeners('auth:error', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[FriendsSocket] Disconnected:', reason);
        this.connected = false;
        this.emitToListeners('disconnect', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[FriendsSocket] Connection error:', error);
        this.reconnectAttempts++;
        this.emitToListeners('connect_error', error);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      // Set up event forwarding
      this.setupEventForwarding();
    });
  }

  setupEventForwarding() {
    const events = [
      // Friend events
      'friend:request',
      'friend:accepted',
      'friend:declined',
      'friend:online',
      'friend:offline',
      'friend:statusUpdate',
      
      // Chat events
      'chat:message',
      'chat:newMessage',
      'chat:typing',
      'chat:read',
      'chat:reaction',
      'chat:messageDeleted',
      'chat:joined',
      'chat:ping',
      
      // Shared resources
      'notes:updated',
      'notes:cursor',
      'watchlist:updated',
      
      // Notifications
      'notification',
      
      // Portfolio
      'portfolio:update',
      
      // Mentor
      'mentor:assigned',
      'mentor:feedback',
      
      // General
      'error'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        this.emitToListeners(event, data);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.userId = null;
    }
  }

  // =============================================
  // CHAT METHODS
  // =============================================

  joinChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('chat:join', chatId);
    }
  }

  leaveChat(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('chat:leave', chatId);
    }
  }

  sendMessage(chatId, messageData) {
    if (this.socket?.connected) {
      this.socket.emit('chat:message', { chatId, ...messageData });
    }
  }

  setTyping(chatId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit('chat:typing', { chatId, isTyping });
    }
  }

  markAsRead(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('chat:read', chatId);
    }
  }

  sendReaction(chatId, messageId, reaction) {
    if (this.socket?.connected) {
      this.socket.emit('chat:reaction', { chatId, messageId, reaction });
    }
  }

  sendPing(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('chat:ping', chatId);
    }
  }

  // =============================================
  // SHARED NOTES METHODS
  // =============================================

  joinNotes(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('notes:join', chatId);
    }
  }

  leaveNotes(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('notes:leave', chatId);
    }
  }

  updateNotes(chatId, content, title = null) {
    if (this.socket?.connected) {
      this.socket.emit('notes:update', { chatId, content, title });
    }
  }

  sendCursorPosition(chatId, position) {
    if (this.socket?.connected) {
      this.socket.emit('notes:cursor', { chatId, position });
    }
  }

  // =============================================
  // WATCHLIST METHODS
  // =============================================

  updateWatchlist(chatId, action, payload) {
    if (this.socket?.connected) {
      this.socket.emit('watchlist:update', { chatId, action, payload });
    }
  }

  // =============================================
  // FRIEND REQUEST METHODS
  // =============================================

  sendFriendRequest(targetUserId) {
    if (this.socket?.connected) {
      this.socket.emit('friend:request', targetUserId);
    }
  }

  acceptFriendRequest(friendshipId) {
    if (this.socket?.connected) {
      this.socket.emit('friend:accept', friendshipId);
    }
  }

  declineFriendRequest(friendshipId) {
    if (this.socket?.connected) {
      this.socket.emit('friend:decline', friendshipId);
    }
  }

  // =============================================
  // PRESENCE METHODS
  // =============================================

  updatePresence(status) {
    if (this.socket?.connected) {
      this.socket.emit('presence:update', status);
    }
  }

  // =============================================
  // NOTIFICATION METHODS
  // =============================================

  markNotificationRead(notificationId) {
    if (this.socket?.connected) {
      this.socket.emit('notification:read', notificationId);
    }
  }

  markAllNotificationsRead() {
    if (this.socket?.connected) {
      this.socket.emit('notifications:readAll');
    }
  }

  // =============================================
  // LISTENER MANAGEMENT
  // =============================================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emitToListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[FriendsSocket] Listener error for ${event}:`, error);
        }
      });
    }
  }

  // =============================================
  // STATUS
  // =============================================

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  getSocketId() {
    return this.socket?.id;
  }

  getUserId() {
    return this.userId;
  }
}

// Singleton instance
export const friendsSocket = new FriendsSocketService();
export default friendsSocket;

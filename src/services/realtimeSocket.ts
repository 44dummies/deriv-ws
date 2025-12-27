/**
 * Real-time Socket Client Service
 * Handles Socket.IO connection for real-time chat features
 */

import { io } from 'socket.io-client';
import { TokenService } from './tokenService';

import { CONFIG } from '../config/constants';

const SOCKET_URL = CONFIG.SERVER_URL;

class RealtimeSocketService {
  socket: any;
  connected: boolean;
  listeners: Map<string, Set<Function>>;
  messageCallbacks: Set<Function>;
  presenceCallbacks: Set<Function>;
  typingCallbacks: Set<Function>;
  connectionCallbacks: Set<Function>;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.messageCallbacks = new Set();
    this.presenceCallbacks = new Set();
    this.typingCallbacks = new Set();
    this.connectionCallbacks = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to the socket server
   */
  connect(accessToken) {
    if (this.socket?.connected) {
      // If already connected with SAME token, return
      if (this.socket.auth?.token === accessToken) {
        return Promise.resolve();
      }
      // If token changed, disconnect and reconnect
      console.log('[RealtimeSocket] Token changed, reconnecting...');
      this.disconnect();
    }

    // Ensure we use the freshest token available
    const tokenToUse = accessToken || sessionStorage.getItem('accessToken');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Socket.IO connection timed out'));
        }
      }, 10000);

      this.socket = io(SOCKET_URL, {
        auth: { token: tokenToUse },
        transports: ['websocket'], // Force WebSocket only to match server config
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        timeout: 60000,
        autoConnect: true,
        forceNew: false
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('🔌 Socket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        // Only log critical auth errors, suppress general connection noise
        if (error.message === 'Authentication required' || error.message === 'Invalid token' || error.message.includes('jwt')) {
          console.warn('[RealtimeSocket] Auth failed:', error.message);
          this.socket.disconnect();
          this.connected = false;
          // Let AuthContext handle logout via 401s, don't force redirect here to avoid race conditions
        } else {
          // Debounce generic connection errors (e.g. 502s) to avoid spam
          if (this.reconnectAttempts % 5 === 0) {
            console.warn(`[RealtimeSocket] Connection retry ${this.reconnectAttempts}:`, error.message);
          }
        }
        this.reconnectAttempts++;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.connected = false;
        this.notifyConnectionChange(false);


        if (reason === 'io server disconnect') {
          console.log('🔄 Server disconnected, attempting reconnect...');
          this.socket.connect();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        this.connected = true;
        this.notifyConnectionChange(true);
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });


      this.socket.on('newMessage', (message) => {
        this.messageCallbacks.forEach(cb => cb(message));
      });


      this.socket.on('roomPresence', (data) => {
        this.presenceCallbacks.forEach(cb => cb(data));
      });

      this.socket.on('userJoined', (data) => {
        this.presenceCallbacks.forEach(cb => cb({ type: 'join', ...data }));
      });

      this.socket.on('userLeft', (data) => {
        this.presenceCallbacks.forEach(cb => cb({ type: 'leave', ...data }));
      });


      this.socket.on('userTyping', (data) => {
        this.typingCallbacks.forEach(cb => cb(data));
      });


      this.socket.on('messageRead', (data) => {
        this.emit('messageRead', data);
      });


      this.socket.on('reactionUpdate', (data) => {
        this.emit('reactionUpdate', data);
      });


      this.socket.on('messageModerated', (data) => {
        this.emit('messageModerated', data);
      });

      this.socket.on('moderationWarning', (data) => {
        this.emit('moderationWarning', data);
      });


      this.socket.on('joinedRoom', (data) => {
        this.emit('joinedRoom', data);
      });
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Join a chatroom
   */
  joinRoom(roomId) {
    if (!this.socket) return;
    this.socket.emit('joinRoom', { roomId });
  }

  /**
   * Leave a chatroom
   */
  leaveRoom(roomId) {
    if (!this.socket) return;
    this.socket.emit('leaveRoom', { roomId });
  }

  /**
   * Send a message
   */
  sendMessage(roomId, content, replyTo = null) {
    if (!this.socket) return;
    this.socket.emit('sendMessage', { roomId, content, replyTo });
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId, isTyping) {
    if (!this.socket) return;
    this.socket.emit('typing', { roomId, isTyping });
  }

  /**
   * Mark message as read
   */
  markRead(messageId, roomId) {
    if (!this.socket) return;
    this.socket.emit('readMessage', { messageId, roomId });
  }

  /**
   * Add reaction to message
   */
  addReaction(messageId, roomId, emoji) {
    if (!this.socket) return;
    this.socket.emit('addReaction', { messageId, roomId, emoji });
  }

  /**
   * Remove reaction from message
   */
  removeReaction(messageId, roomId, emoji) {
    if (!this.socket) return;
    this.socket.emit('removeReaction', { messageId, roomId, emoji });
  }

  /**
   * Report a message
   */
  reportMessage(messageId, reason) {
    if (!this.socket) return;
    this.socket.emit('reportMessage', { messageId, reason });
  }

  /**
   * Emit profile update to server for real-time sync
   */
  emitProfileUpdate(profileData) {
    if (!this.socket) return;
    this.socket.emit('profileUpdate', profileData);
  }

  /**
   * Request online users list
   */
  requestOnlineUsers() {
    if (!this.socket) return;
    this.socket.emit('getOnlineUsers');
  }

  /**
   * Subscribe to new messages
   */
  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Subscribe to presence updates
   */
  onPresence(callback) {
    this.presenceCallbacks.add(callback);
    return () => this.presenceCallbacks.delete(callback);
  }

  /**
   * Subscribe to typing indicators
   */
  onTyping(callback) {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection changes
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Generic event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);


    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Emit event to server (Socket.IO emit)
   */
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Emit to local listeners only
   */
  emitLocal(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  /**
   * Notify connection change
   */
  notifyConnectionChange(connected) {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }
}


const realtimeSocket = new RealtimeSocketService();

export default realtimeSocket;
export { realtimeSocket };

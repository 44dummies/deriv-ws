/**
 * Real-time Socket Client Service
 * Handles Socket.IO connection for real-time chat features
 */

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class RealtimeSocketService {
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
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('🔌 Socket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to chat server'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.connected = false;
        this.notifyConnectionChange(false);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Message events
      this.socket.on('newMessage', (message) => {
        this.messageCallbacks.forEach(cb => cb(message));
      });

      // Presence events
      this.socket.on('roomPresence', (data) => {
        this.presenceCallbacks.forEach(cb => cb(data));
      });

      this.socket.on('userJoined', (data) => {
        this.presenceCallbacks.forEach(cb => cb({ type: 'join', ...data }));
      });

      this.socket.on('userLeft', (data) => {
        this.presenceCallbacks.forEach(cb => cb({ type: 'leave', ...data }));
      });

      // Typing events
      this.socket.on('userTyping', (data) => {
        this.typingCallbacks.forEach(cb => cb(data));
      });

      // Read receipts
      this.socket.on('messageRead', (data) => {
        this.emit('messageRead', data);
      });

      // Reactions
      this.socket.on('reactionUpdate', (data) => {
        this.emit('reactionUpdate', data);
      });

      // Moderation
      this.socket.on('messageModerated', (data) => {
        this.emit('messageModerated', data);
      });

      this.socket.on('moderationWarning', (data) => {
        this.emit('moderationWarning', data);
      });

      // Room events
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
    return () => this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit to local listeners
   */
  emit(event, data) {
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

// Singleton instance
const realtimeSocket = new RealtimeSocketService();

export default realtimeSocket;

/**
 * Notification System - Real-time alerts and notifications
 * 
 * Handles in-app notifications, sound alerts, and external integrations
 */

import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';

// ============================================
// NOTIFICATION STORE
// ============================================

class NotificationStore {
  constructor() {
    /** @type {import('./types.js').AppNotification[]} */
    this.notifications = [];
    /** @type {number} */
    this.maxNotifications = 100;
    /** @type {Array<(notification: import('./types.js').AppNotification) => void>} */
    this.listeners = [];
    /** @type {boolean} */
    this.soundEnabled = true;
  }
  
  /**
   * Add a notification
   * @param {Omit<import('./types.js').AppNotification, 'id' | 'timestamp' | 'read'>} notification
   * @returns {import('./types.js').AppNotification}
   */
  add(notification) {
    /** @type {import('./types.js').AppNotification} */
    const fullNotification = {
      ...notification,
      id: uuidv4(),
      timestamp: Date.now(),
      read: false,
    };
    
    this.notifications.unshift(fullNotification);
    
    // Trim to max
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }
    
    // Play sound if enabled
    if (this.soundEnabled) {
      this.playSound(notification.type);
    }
    
    // Notify listeners
    this.listeners.forEach(cb => cb(fullNotification));
    
    return fullNotification;
  }
  
  /**
   * Get all notifications
   * @returns {import('./types.js').AppNotification[]}
   */
  getAll() {
    return this.notifications;
  }
  
  /**
   * Get unread notifications
   * @returns {import('./types.js').AppNotification[]}
   */
  getUnread() {
    return this.notifications.filter(n => !n.read);
  }
  
  /**
   * Get notifications for an account
   * @param {string} accountId
   * @returns {import('./types.js').AppNotification[]}
   */
  getForAccount(accountId) {
    return this.notifications.filter(n => n.accountId === accountId);
  }
  
  /**
   * Get notifications for a session
   * @param {string} sessionId
   * @returns {import('./types.js').AppNotification[]}
   */
  getForSession(sessionId) {
    return this.notifications.filter(n => n.sessionId === sessionId);
  }
  
  /**
   * Mark a notification as read
   * @param {string} notificationId
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
  }
  
  /**
   * Clear all notifications
   */
  clear() {
    this.notifications = [];
  }
  
  /**
   * Subscribe to notifications
   * @param {(notification: import('./types.js').AppNotification) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  /**
   * Enable/disable sounds
   * @param {boolean} enabled
   */
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }
  
  /**
   * Play notification sound
   * @param {import('./types.js').NotificationType} type
   */
  playSound(type) {
    try {
      // Create audio context for notification sounds
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different sounds for different notification types
      switch (type) {
        case 'tp_reached':
          oscillator.frequency.value = 880; // High pitch for success
          oscillator.type = 'sine';
          break;
        case 'sl_reached':
          oscillator.frequency.value = 220; // Low pitch for loss
          oscillator.type = 'triangle';
          break;
        case 'trade_executed':
          oscillator.frequency.value = 440; // Normal pitch
          oscillator.type = 'sine';
          break;
        case 'error':
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          break;
        default:
          oscillator.frequency.value = 523; // C5
          oscillator.type = 'sine';
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Audio not supported or blocked
      console.log('Audio notification not available');
    }
  }
}

// ============================================
// NOTIFICATION SERVICE
// ============================================

class NotificationService {
  constructor() {
    /** @type {NotificationStore} */
    this.store = new NotificationStore();
  }
  
  /**
   * Notify session created
   * @param {import('./types.js').TradingSession} session
   * @returns {import('./types.js').AppNotification}
   */
  notifySessionCreated(session) {
    return this.store.add({
      type: 'session_created',
      title: 'New Session Created',
      message: `Session "${session.name}" has been created for ${session.symbol}`,
      data: { sessionId: session.id, symbol: session.symbol },
      sessionId: session.id,
    });
  }
  
  /**
   * Notify session started
   * @param {import('./types.js').TradingSession} session
   * @returns {import('./types.js').AppNotification}
   */
  notifySessionStarted(session) {
    return this.store.add({
      type: 'session_started',
      title: 'Session Started',
      message: `Session "${session.name}" is now active`,
      data: { sessionId: session.id },
      sessionId: session.id,
    });
  }
  
  /**
   * Notify session ended
   * @param {import('./types.js').TradingSession} session
   * @param {string} reason
   * @returns {import('./types.js').AppNotification}
   */
  notifySessionEnded(session, reason) {
    return this.store.add({
      type: 'session_ended',
      title: 'Session Ended',
      message: `Session "${session.name}" has ended. ${reason}`,
      data: { sessionId: session.id, reason },
      sessionId: session.id,
    });
  }
  
  /**
   * Notify trade executed
   * @param {import('./types.js').TradeExecution} trade
   * @returns {import('./types.js').AppNotification}
   */
  notifyTradeExecuted(trade) {
    return this.store.add({
      type: 'trade_executed',
      title: 'Trade Executed',
      message: `${trade.contractType} trade placed for $${trade.stake.toFixed(2)}`,
      data: { tradeId: trade.id, contractType: trade.contractType, stake: trade.stake },
      accountId: trade.accountId,
      sessionId: trade.sessionId,
    });
  }
  
  /**
   * Notify trade result
   * @param {import('./types.js').TradeExecution} trade
   * @returns {import('./types.js').AppNotification}
   */
  notifyTradeResult(trade) {
    const isWin = trade.outcome === 'win';
    return this.store.add({
      type: isWin ? 'tp_reached' : 'sl_reached',
      title: isWin ? 'Trade Won! 🎉' : 'Trade Lost',
      message: `${trade.contractType}: ${isWin ? '+' : ''}$${trade.profit.toFixed(2)}`,
      data: { tradeId: trade.id, profit: trade.profit, outcome: trade.outcome },
      accountId: trade.accountId,
      sessionId: trade.sessionId,
    });
  }
  
  /**
   * Notify take profit reached
   * @param {import('./types.js').TradingAccount} account
   * @returns {import('./types.js').AppNotification}
   */
  notifyTakeProfitReached(account) {
    return this.store.add({
      type: 'tp_reached',
      title: '🎉 Take Profit Reached!',
      message: `Account ${account.loginId} reached TP: +$${account.currentProfit.toFixed(2)}`,
      data: { accountId: account.id, profit: account.currentProfit },
      accountId: account.id,
      sessionId: account.sessionId || undefined,
    });
  }
  
  /**
   * Notify stop loss reached
   * @param {import('./types.js').TradingAccount} account
   * @returns {import('./types.js').AppNotification}
   */
  notifyStopLossReached(account) {
    return this.store.add({
      type: 'sl_reached',
      title: '⚠️ Stop Loss Reached',
      message: `Account ${account.loginId} hit SL: -$${Math.abs(account.currentProfit).toFixed(2)}`,
      data: { accountId: account.id, loss: account.currentProfit },
      accountId: account.id,
      sessionId: account.sessionId || undefined,
    });
  }
  
  /**
   * Notify recovery started
   * @param {import('./types.js').TradingAccount} account
   * @param {number} lossAmount
   * @returns {import('./types.js').AppNotification}
   */
  notifyRecoveryStarted(account, lossAmount) {
    return this.store.add({
      type: 'recovery_started',
      title: 'Recovery Mode Started',
      message: `Attempting to recover $${lossAmount.toFixed(2)} for ${account.loginId}`,
      data: { accountId: account.id, lossAmount },
      accountId: account.id,
    });
  }
  
  /**
   * Notify recovery complete
   * @param {import('./types.js').TradingAccount} account
   * @param {number} recoveredAmount
   * @returns {import('./types.js').AppNotification}
   */
  notifyRecoveryComplete(account, recoveredAmount) {
    return this.store.add({
      type: 'session_ended',
      title: '✅ Recovery Complete',
      message: `Recovered $${recoveredAmount.toFixed(2)} for ${account.loginId}`,
      data: { accountId: account.id, recoveredAmount },
      accountId: account.id,
    });
  }
  
  /**
   * Notify error
   * @param {string} message
   * @param {Record<string, any>} [details]
   * @returns {import('./types.js').AppNotification}
   */
  notifyError(message, details) {
    return this.store.add({
      type: 'error',
      title: '❌ Error',
      message,
      data: details,
    });
  }
  
  /**
   * Notify warning
   * @param {string} message
   * @param {Record<string, any>} [details]
   * @returns {import('./types.js').AppNotification}
   */
  notifyWarning(message, details) {
    return this.store.add({
      type: 'warning',
      title: '⚠️ Warning',
      message,
      data: details,
    });
  }
  
  /**
   * Get all notifications
   * @returns {import('./types.js').AppNotification[]}
   */
  getNotifications() {
    return this.store.getAll();
  }
  
  /**
   * Get unread notifications
   * @returns {import('./types.js').AppNotification[]}
   */
  getUnreadNotifications() {
    return this.store.getUnread();
  }
  
  /**
   * Get unread count
   * @returns {number}
   */
  getUnreadCount() {
    return this.store.getUnread().length;
  }
  
  /**
   * Mark as read
   * @param {string} notificationId
   */
  markAsRead(notificationId) {
    this.store.markAsRead(notificationId);
  }
  
  /**
   * Mark all as read
   */
  markAllAsRead() {
    this.store.markAllAsRead();
  }
  
  /**
   * Clear notifications
   */
  clearNotifications() {
    this.store.clear();
  }
  
  /**
   * Set sound enabled
   * @param {boolean} enabled
   */
  setSoundEnabled(enabled) {
    this.store.setSoundEnabled(enabled);
  }
  
  /**
   * Subscribe to notifications
   * @param {(notification: import('./types.js').AppNotification) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    return this.store.subscribe(callback);
  }
}

// ============================================
// BROWSER NOTIFICATION HELPER
// ============================================

/**
 * Request notification permission
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

/**
 * Send browser notification
 * @param {string} title
 * @param {NotificationOptions} [options]
 */
export function sendBrowserNotification(title, options) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const notificationService = new NotificationService();

// ============================================
// REACT HOOK
// ============================================

/**
 * Hook for notifications
 * @returns {{
 *   notifications: import('./types.js').AppNotification[],
 *   unreadCount: number,
 *   markAsRead: (id: string) => void,
 *   markAllAsRead: () => void,
 *   clear: () => void
 * }}
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // Initial load
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());
    
    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
      
      // Send browser notification for important events
      if (['tp_reached', 'sl_reached', 'error'].includes(notification.type)) {
        sendBrowserNotification(notification.title, {
          body: notification.message,
          tag: notification.id,
        });
      }
    });
    
    return unsubscribe;
  }, []);
  
  return {
    notifications,
    unreadCount,
    markAsRead: (id) => {
      notificationService.markAsRead(id);
      setNotifications([...notificationService.getNotifications()]);
      setUnreadCount(notificationService.getUnreadCount());
    },
    markAllAsRead: () => {
      notificationService.markAllAsRead();
      setNotifications([...notificationService.getNotifications()]);
      setUnreadCount(0);
    },
    clear: () => {
      notificationService.clearNotifications();
      setNotifications([]);
      setUnreadCount(0);
    },
  };
}

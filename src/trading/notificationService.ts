/**
 * Notification System - Real-time alerts and notifications
 * 
 * Handles in-app notifications, sound alerts, and external integrations
 */

import type {
  Notification as AppNotification,
  NotificationType,
  TradingAccount,
  TradingSession,
  TradeExecution,
} from './types';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// NOTIFICATION STORE
// ============================================

class NotificationStore {
  private notifications: AppNotification[] = [];
  private maxNotifications: number = 100;
  private listeners: Array<(notification: AppNotification) => void> = [];
  private soundEnabled: boolean = true;
  
  add(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const fullNotification: AppNotification = {
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
  
  getAll(): AppNotification[] {
    return this.notifications;
  }
  
  getUnread(): AppNotification[] {
    return this.notifications.filter(n => !n.read);
  }
  
  getForAccount(accountId: string): AppNotification[] {
    return this.notifications.filter(n => n.accountId === accountId);
  }
  
  getForSession(sessionId: string): AppNotification[] {
    return this.notifications.filter(n => n.sessionId === sessionId);
  }
  
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }
  
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }
  
  clear(): void {
    this.notifications = [];
  }
  
  subscribe(callback: (notification: AppNotification) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }
  
  private playSound(type: NotificationType): void {
    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  private store: NotificationStore;
  
  constructor() {
    this.store = new NotificationStore();
  }
  
  // Session notifications
  notifySessionCreated(session: TradingSession): AppNotification {
    return this.store.add({
      type: 'session_created',
      title: 'New Session Created',
      message: `Session "${session.name}" has been created for ${session.symbol}`,
      data: { sessionId: session.id, symbol: session.symbol },
      sessionId: session.id,
    });
  }
  
  notifySessionStarted(session: TradingSession): AppNotification {
    return this.store.add({
      type: 'session_started',
      title: 'Session Started',
      message: `Session "${session.name}" is now active`,
      data: { sessionId: session.id },
      sessionId: session.id,
    });
  }
  
  notifySessionEnded(session: TradingSession, reason: string): AppNotification {
    return this.store.add({
      type: 'session_ended',
      title: 'Session Ended',
      message: `Session "${session.name}" has ended. ${reason}`,
      data: { sessionId: session.id, reason },
      sessionId: session.id,
    });
  }
  
  // Trade notifications
  notifyTradeExecuted(trade: TradeExecution): AppNotification {
    return this.store.add({
      type: 'trade_executed',
      title: 'Trade Executed',
      message: `${trade.contractType} trade placed for $${trade.stake.toFixed(2)}`,
      data: { tradeId: trade.id, contractType: trade.contractType, stake: trade.stake },
      accountId: trade.accountId,
      sessionId: trade.sessionId,
    });
  }
  
  notifyTradeResult(trade: TradeExecution): AppNotification {
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
  
  // Account notifications
  notifyTakeProfitReached(account: TradingAccount): AppNotification {
    return this.store.add({
      type: 'tp_reached',
      title: '🎉 Take Profit Reached!',
      message: `Account ${account.loginId} reached TP: +$${account.currentProfit.toFixed(2)}`,
      data: { accountId: account.id, profit: account.currentProfit },
      accountId: account.id,
      sessionId: account.sessionId || undefined,
    });
  }
  
  notifyStopLossReached(account: TradingAccount): AppNotification {
    return this.store.add({
      type: 'sl_reached',
      title: '⚠️ Stop Loss Reached',
      message: `Account ${account.loginId} hit SL: -$${Math.abs(account.currentProfit).toFixed(2)}`,
      data: { accountId: account.id, loss: account.currentProfit },
      accountId: account.id,
      sessionId: account.sessionId || undefined,
    });
  }
  
  // Recovery notifications
  notifyRecoveryStarted(account: TradingAccount, lossAmount: number): AppNotification {
    return this.store.add({
      type: 'recovery_started',
      title: 'Recovery Mode Started',
      message: `Attempting to recover $${lossAmount.toFixed(2)} for ${account.loginId}`,
      data: { accountId: account.id, lossAmount },
      accountId: account.id,
    });
  }
  
  notifyRecoveryComplete(account: TradingAccount, recoveredAmount: number): AppNotification {
    return this.store.add({
      type: 'session_ended',
      title: '✅ Recovery Complete',
      message: `Recovered $${recoveredAmount.toFixed(2)} for ${account.loginId}`,
      data: { accountId: account.id, recoveredAmount },
      accountId: account.id,
    });
  }
  
  // Error notifications
  notifyError(message: string, details?: Record<string, any>): AppNotification {
    return this.store.add({
      type: 'error',
      title: '❌ Error',
      message,
      data: details,
    });
  }
  
  // Warning notifications
  notifyWarning(message: string, details?: Record<string, any>): AppNotification {
    return this.store.add({
      type: 'warning',
      title: '⚠️ Warning',
      message,
      data: details,
    });
  }
  
  // Store access
  getNotifications(): AppNotification[] {
    return this.store.getAll();
  }
  
  getUnreadNotifications(): AppNotification[] {
    return this.store.getUnread();
  }
  
  getUnreadCount(): number {
    return this.store.getUnread().length;
  }
  
  markAsRead(notificationId: string): void {
    this.store.markAsRead(notificationId);
  }
  
  markAllAsRead(): void {
    this.store.markAllAsRead();
  }
  
  clearNotifications(): void {
    this.store.clear();
  }
  
  setSoundEnabled(enabled: boolean): void {
    this.store.setSoundEnabled(enabled);
  }
  
  subscribe(callback: (notification: AppNotification) => void): () => void {
    return this.store.subscribe(callback);
  }
}

// ============================================
// BROWSER NOTIFICATION HELPER
// ============================================

export async function requestNotificationPermission(): Promise<boolean> {
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

export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
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

import { useState, useEffect } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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
    markAsRead: (id: string) => {
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

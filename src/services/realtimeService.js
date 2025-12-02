/**
 * TraderMind Real-time Service
 * Simulates real-time trading activity and user presence
 */

class RealtimeService {
  constructor() {
    this.rooms = new Map();
    this.tradeAlerts = [];
    this.subscribers = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Start simulating activity
    this._simulateActivity();
  }

  _simulateActivity() {
    // Simulate new trade alerts every 10-30 seconds
    setInterval(() => {
      const alert = this._generateTradeAlert();
      this.tradeAlerts.unshift(alert);
      if (this.tradeAlerts.length > 50) this.tradeAlerts.pop();
      
      // Notify subscribers
      this._notifySubscribers('newTradeAlert', alert);
    }, Math.random() * 20000 + 10000);
  }

  _generateTradeAlert() {
    const traders = [
      { name: 'Mike_V75', avatar: '🎯' },
      { name: 'Sarah_Pro', avatar: '📈' },
      { name: 'James_Binary', avatar: '⚡' },
      { name: 'Lisa_Boom', avatar: '💎' },
      { name: 'Chen_TA', avatar: '📊' },
    ];
    
    const assets = ['Volatility 75', 'Crash 500', 'Boom 1000', 'V10 (1s)', 'Step Index'];
    const outcomes = ['WIN', 'WIN', 'WIN', 'LOSS']; // 75% win rate simulation
    
    const trader = traders[Math.floor(Math.random() * traders.length)];
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const profit = outcome === 'WIN' 
      ? (Math.random() * 50 + 5).toFixed(2) 
      : (-Math.random() * 30 - 5).toFixed(2);

    return {
      id: Date.now().toString(),
      trader: trader.name,
      avatar: trader.avatar,
      asset,
      outcome,
      profit: parseFloat(profit),
      timestamp: new Date().toISOString(),
    };
  }

  getTradeAlerts(count = 10) {
    return this.tradeAlerts.slice(0, count);
  }

  getOnlineUsers(roomId) {
    if (!this.rooms.has(roomId)) {
      // Generate some default online users
      this.rooms.set(roomId, this._generateOnlineUsers());
    }
    return this.rooms.get(roomId);
  }

  _generateOnlineUsers() {
    const users = [
      { id: 'u1', name: 'Mike_V75', avatar: '🎯', status: 'online' },
      { id: 'u2', name: 'Sarah_Pro', avatar: '📈', status: 'online' },
      { id: 'u3', name: 'James_Binary', avatar: '⚡', status: 'away' },
      { id: 'u4', name: 'Lisa_Boom', avatar: '💎', status: 'online' },
      { id: 'u5', name: 'Chen_TA', avatar: '📊', status: 'online' },
    ];
    
    // Return random subset
    const count = Math.floor(Math.random() * 3) + 2;
    return users.slice(0, count);
  }

  subscribeToRoom(roomId, callback) {
    if (!this.subscribers.has(roomId)) {
      this.subscribers.set(roomId, new Set());
    }
    this.subscribers.get(roomId).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(roomId);
      if (subs) subs.delete(callback);
    };
  }

  subscribe(eventType, callback) {
    const key = `global_${eventType}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) subs.delete(callback);
    };
  }

  _notifySubscribers(eventType, data) {
    const key = `global_${eventType}`;
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  setUserTyping(roomId, userId, isTyping) {
    // Notify room subscribers about typing status
    const subs = this.subscribers.get(roomId);
    if (subs) {
      subs.forEach(callback => callback('typing', { 
        roomId, 
        userId, 
        isTyping,
        userName: 'You'
      }));
    }
  }

  pushMessage(roomId, message) {
    // Notify room subscribers about new message
    const subs = this.subscribers.get(roomId);
    if (subs) {
      subs.forEach(callback => callback('message', message));
    }
  }
}

const realtimeService = new RealtimeService();
export default realtimeService;

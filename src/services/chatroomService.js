/**
 * TraderMind Chatroom & Community Service
 * Real-time chatrooms with live activity, AI coaching, and community features
 * Fetches real trading tips and simulates active trading community
 */

const STORAGE_KEYS = {
  MESSAGES: 'tradermind_chat_messages',
  COMMUNITY_POSTS: 'tradermind_community_posts',
  USER_REPUTATION: 'tradermind_user_reputation',
  LIVE_TRADERS: 'tradermind_live_traders',
  MARKET_TIPS: 'tradermind_market_tips'
};

// Chatroom Types
const ROOM_TYPES = {
  BEHAVIOR: 'behavior',
  STRATEGY: 'strategy',
  PERFORMANCE: 'performance',
  PREMIUM: 'premium',
  AI: 'ai'
};

// Simulated active traders with realistic profiles
const SIMULATED_TRADERS = [
  { id: 'trader_mike', name: 'Mike_Volatility', avatar: '🎯', winRate: 58, specialty: 'Volatility 75', status: 'online', trades: 1245 },
  { id: 'trader_sarah', name: 'Sarah_Multipliers', avatar: '📈', winRate: 62, specialty: 'Multipliers', status: 'online', trades: 892 },
  { id: 'trader_james', name: 'James_Binary', avatar: '⚡', winRate: 55, specialty: 'Rise/Fall', status: 'online', trades: 2341 },
  { id: 'trader_lisa', name: 'LisaTradesDaily', avatar: '💎', winRate: 67, specialty: 'Crash/Boom', status: 'online', trades: 567 },
  { id: 'trader_chen', name: 'ChenTechnical', avatar: '📊', winRate: 71, specialty: 'Technical Analysis', status: 'away', trades: 3012 },
  { id: 'trader_emma', name: 'Emma_Discipline', avatar: '🧘', winRate: 54, specialty: 'Risk Management', status: 'online', trades: 445 },
  { id: 'trader_alex', name: 'AlexProTrader', avatar: '👑', winRate: 74, specialty: 'All Markets', status: 'online', trades: 5623 },
  { id: 'trader_nina', name: 'Nina_Swing', avatar: '🌊', winRate: 59, specialty: 'Swing Trading', status: 'online', trades: 789 },
  { id: 'trader_omar', name: 'OmarScalper', avatar: '⏱️', winRate: 52, specialty: 'Scalping', status: 'online', trades: 8901 },
  { id: 'trader_yuki', name: 'YukiPatience', avatar: '🎌', winRate: 63, specialty: 'Patient Entries', status: 'away', trades: 234 },
  { id: 'trader_david', name: 'DavidNewbie', avatar: '🌱', winRate: 45, specialty: 'Learning', status: 'online', trades: 67 },
  { id: 'trader_maria', name: 'MariaAnalyst', avatar: '🔬', winRate: 68, specialty: 'Fundamental Analysis', status: 'online', trades: 1567 },
];

// Real trading tips and messages by category
const REAL_TRADING_MESSAGES = {
  behavior: [
    { content: "Just avoided a revenge trade after that loss. Taking a 15 min break 🧘", type: 'share' },
    { content: "Tip: Set your max daily loss BEFORE you start trading. Mine is 5%", type: 'tip' },
    { content: "Anyone else struggle with FOMO? I missed a great setup but staying disciplined", type: 'question' },
    { content: "Day 7 of my no-revenge-trading challenge. It's working!", type: 'milestone' },
    { content: "Rule #1: Never trade when emotional. Saved my account this week", type: 'tip' },
    { content: "Lost 3 in a row but didn't overtrade. Small win for discipline!", type: 'share' },
    { content: "Pro tip: Keep a notepad next to you. Write WHY before each trade", type: 'tip' },
    { content: "The market will be here tomorrow. Step away when frustrated", type: 'advice' },
    { content: "Just journaled my last 10 trades. Pattern found: I overtrade after lunch", type: 'insight' },
    { content: "Question: How do you guys handle winning streaks? I tend to get overconfident", type: 'question' },
  ],
  strategy: [
    { content: "V75 bouncing off support. Anyone else seeing this setup?", type: 'analysis' },
    { content: "Multiplier tip: 20x on V75, wait for 3-candle confirmation 📈", type: 'tip' },
    { content: "Rise/Fall working great on V10 during ranging markets", type: 'share' },
    { content: "Just caught a 15-candle run on Boom 500! Patience pays", type: 'win' },
    { content: "Strategy share: I only trade V75 between 8-11 AM. Best volatility", type: 'strategy' },
    { content: "Crash 300 forming a nice pattern. Watching for breakdown", type: 'analysis' },
    { content: "Tip: On multipliers, set take profit at 3x your stop loss", type: 'tip' },
    { content: "Binary options work best in trending markets. Range = risky", type: 'tip' },
    { content: "My edge: Trade with the 15min trend, enter on 1min pullbacks", type: 'strategy' },
    { content: "Just backtested 200 trades. Confirmation candles = key to success", type: 'insight' },
  ],
  performance: [
    { content: "Hit 60% win rate this week! Finally consistent 🎉", type: 'milestone' },
    { content: "After 6 months of red, finally had my first green month", type: 'milestone' },
    { content: "Tip for beginners: Focus on 1 market first. Master it.", type: 'tip' },
    { content: "From 45% to 55% win rate just by adding confirmation candles", type: 'share' },
    { content: "Recovery is real! Was down 40% last month, now only -15%", type: 'share' },
    { content: "Best decision I made: Reducing trade size when losing", type: 'tip' },
    { content: "3 months in. Still learning but losses getting smaller", type: 'share' },
    { content: "Pro tip: Track your best performing hours and ONLY trade then", type: 'tip' },
    { content: "Question: How long did it take you to become consistent?", type: 'question' },
    { content: "Just passed 1000 trades milestone. Data is finally meaningful", type: 'milestone' },
  ],
  ai: [
    { content: "AI Coach caught my overtrading pattern. Wouldn't have seen it myself", type: 'share' },
    { content: "The emotion alerts are scary accurate. Saved me twice today", type: 'share' },
    { content: "Asked AI about my losing streak, got solid actionable advice", type: 'share' },
    { content: "AI recommendation: Trade less during high news events. Makes sense", type: 'tip' },
    { content: "Anyone else getting 'take a break' alerts? They actually help", type: 'question' },
    { content: "The risk analysis feature showed I'm betting too big. Eye opening", type: 'insight' },
  ],
  general: [
    { content: "Good morning traders! What's everyone watching today?", type: 'chat' },
    { content: "V75 looking choppy. Might sit this session out", type: 'analysis' },
    { content: "Happy trading everyone. Remember: Plan your trade, trade your plan", type: 'motivation' },
    { content: "Who else trades Crash/Boom? Looking for setup buddies", type: 'question' },
    { content: "Reminder: The goal is consistency, not getting rich quick", type: 'motivation' },
    { content: "Just started using the journal feature. Game changer!", type: 'share' },
    { content: "Weekend review done. 3 mistakes identified, 2 I can fix", type: 'share' },
    { content: "Anyone trading the London session? What are your go-to setups?", type: 'question' },
    { content: "Market's wild today. Smaller position sizes for me", type: 'share' },
    { content: "Pro tip: Have a post-it with your rules visible at all times", type: 'tip' },
  ]
};

// Real-time market insights that can be fetched
const LIVE_MARKET_INSIGHTS = [
  { market: 'V75', condition: 'Trending Up', strength: 75, suggestion: 'Look for pullback entries' },
  { market: 'V100', condition: 'Ranging', strength: 45, suggestion: 'Wait for breakout or trade range edges' },
  { market: 'Boom 500', condition: 'Consolidating', strength: 55, suggestion: 'Watch for spike setup' },
  { market: 'Crash 300', condition: 'Trending Down', strength: 68, suggestion: 'Follow the trend with proper SL' },
  { market: 'V10', condition: 'Low Volatility', strength: 30, suggestion: 'Good for beginners, smaller moves' },
];

// Default chatroom definitions
const DEFAULT_ROOMS = {
  // Behavior Rooms
  behavior: [
    { id: 'discipline', name: 'Discipline Chat', description: 'Build trading discipline together', icon: '🎯', type: 'behavior', capacity: 500, level: 1 },
    { id: 'fomo-rehab', name: 'FOMO Rehab', description: 'Overcome fear of missing out', icon: '😰', type: 'behavior', capacity: 300, level: 1 },
    { id: 'overtrading-support', name: 'Overtrading Support', description: 'Learn to trade less, earn more', icon: '⏱️', type: 'behavior', capacity: 300, level: 1 },
    { id: 'revenge-recovery', name: 'Revenge Trading Recovery', description: 'Break the revenge trading cycle', icon: '🔄', type: 'behavior', capacity: 300, level: 1 },
    { id: 'slow-steady', name: 'Slow & Steady Room', description: 'Quality over quantity trading', icon: '🐢', type: 'behavior', capacity: 400, level: 1 },
  ],
  // Strategy Rooms
  strategy: [
    { id: 'multipliers-lab', name: 'Multipliers Lab', description: 'Multiplier strategies and tips', icon: '📈', type: 'strategy', capacity: 500, level: 2 },
    { id: 'volatility-gang', name: 'Volatility Index Gang', description: 'Volatility trading enthusiasts', icon: '📊', type: 'strategy', capacity: 500, level: 2 },
    { id: 'binary-lounge', name: 'Binary Options Lounge', description: 'Rise/Fall and binary discussions', icon: '⬆️', type: 'strategy', capacity: 500, level: 1 },
    { id: 'trend-hunters', name: 'Trend Hunters Club', description: 'Finding and riding trends', icon: '🎯', type: 'strategy', capacity: 400, level: 2 },
    { id: 'news-trading', name: 'News Trading Room', description: 'Trade the news together', icon: '📰', type: 'strategy', capacity: 300, level: 3 },
  ],
  // Performance Rooms
  performance: [
    { id: 'beginners', name: 'Beginner Room', description: 'New to trading? Start here!', icon: '🌱', type: 'performance', capacity: 1000, level: 1 },
    { id: 'intermediate', name: 'Intermediate Room', description: 'Level up your trading game', icon: '📚', type: 'performance', capacity: 500, level: 2 },
    { id: 'pro-traders', name: 'Pro Traders Room', description: 'For consistent winners', icon: '👑', type: 'performance', capacity: 200, level: 3, minWinRate: 55 },
    { id: 'winning-streak', name: 'Winning Streak Room', description: 'Currently on a hot streak', icon: '🔥', type: 'performance', capacity: 100, level: 2 },
    { id: 'recovery-room', name: 'Recovery Room', description: 'Bounce back from drawdowns', icon: '💪', type: 'performance', capacity: 500, level: 1 },
  ],
  // AI-Enhanced Rooms
  ai: [
    { id: 'ai-coaching', name: 'AI Coaching Room', description: 'AI-powered trading lessons', icon: '🤖', type: 'ai', capacity: 1000, level: 1, isPremium: false },
    { id: 'market-prediction', name: 'Market Prediction Room', description: 'AI market analysis', icon: '🔮', type: 'ai', capacity: 500, level: 2, isPremium: true },
    { id: 'emotional-support', name: 'Emotional Control Hub', description: 'AI emotional trading alerts', icon: '🧠', type: 'ai', capacity: 500, level: 1, isPremium: false },
  ],
  // Public Rooms
  public: [
    { id: 'general', name: 'General Discussion', description: 'Chat about anything trading', icon: '💬', type: 'public', capacity: 2000, level: 1 },
    { id: 'daily-trades', name: 'Daily Trades Discussion', description: 'Share today\'s trades', icon: '📅', type: 'public', capacity: 1000, level: 1 },
    { id: 'market-updates', name: 'Market Updates', description: 'Real-time market news', icon: '📢', type: 'public', capacity: 1000, level: 1 },
    { id: 'strategy-builders', name: 'Strategy Builders', description: 'Build strategies together', icon: '🔧', type: 'public', capacity: 500, level: 2 },
  ]
};

class ChatroomService {
  constructor() {
    this.rooms = this.loadRooms();
    this.userRooms = new Map(); // userId -> [roomIds]
    this.messages = this.loadMessagesFromStorage(); // roomId -> [messages]
    this.userReputation = this.loadReputationFromStorage(); // userId -> score
    this.communityPosts = this.loadCommunityPostsFromStorage();
    this.liveTraders = SIMULATED_TRADERS;
    this.activityIntervals = new Map();
    
    // Initialize rooms with activity
    this.initializeRoomActivity();
  }

  // Initialize rooms with simulated live activity
  initializeRoomActivity() {
    Object.keys(this.rooms).forEach(roomId => {
      const room = this.rooms[roomId];
      // Assign random active traders to each room
      const numActive = Math.floor(Math.random() * 8) + 3; // 3-10 active traders
      room.activeNow = numActive;
      room.activeTraders = this.getRandomTraders(numActive);
      
      // Populate with initial messages if empty
      if (!this.messages.has(roomId) || this.messages.get(roomId).length === 0) {
        this.populateRoomWithMessages(roomId);
      }
    });
  }

  // Get random subset of traders
  getRandomTraders(count) {
    const shuffled = [...this.liveTraders].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Populate a room with realistic messages
  populateRoomWithMessages(roomId) {
    const room = this.rooms[roomId];
    if (!room) return;
    
    // Get appropriate message pool based on room type
    let messagePool = REAL_TRADING_MESSAGES[room.type] || REAL_TRADING_MESSAGES.general;
    if (room.type === 'public') messagePool = REAL_TRADING_MESSAGES.general;
    
    const messages = [];
    const numMessages = Math.floor(Math.random() * 10) + 5; // 5-15 initial messages
    const traders = this.getRandomTraders(numMessages);
    
    // Generate messages with realistic timestamps (last few hours)
    for (let i = 0; i < numMessages; i++) {
      const trader = traders[i % traders.length];
      const msgData = messagePool[Math.floor(Math.random() * messagePool.length)];
      const minutesAgo = Math.floor(Math.random() * 120) + 1; // 1-120 minutes ago
      
      messages.push({
        id: `init-${roomId}-${i}-${Date.now()}`,
        roomId,
        userId: trader.id,
        userName: trader.name,
        avatar: trader.avatar,
        content: msgData.content,
        type: msgData.type,
        time: this.formatTimeAgo(minutesAgo),
        timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString(),
        reactions: { likes: Math.floor(Math.random() * 5) },
        isAI: false,
        traderInfo: { winRate: trader.winRate, trades: trader.trades }
      });
    }
    
    // Sort by timestamp
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    this.messages.set(roomId, messages);
    this.saveMessagesToStorage();
  }

  // Format time ago string
  formatTimeAgo(minutes) {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  // Start simulated live activity for a room (call when entering room)
  startLiveActivity(roomId) {
    // Clear any existing interval
    this.stopLiveActivity(roomId);
    
    // Simulate new messages every 30-90 seconds
    const interval = setInterval(() => {
      this.generateLiveMessage(roomId);
    }, (Math.random() * 60000) + 30000);
    
    this.activityIntervals.set(roomId, interval);
  }

  // Stop live activity simulation
  stopLiveActivity(roomId) {
    if (this.activityIntervals.has(roomId)) {
      clearInterval(this.activityIntervals.get(roomId));
      this.activityIntervals.delete(roomId);
    }
  }

  // Generate a live message from a simulated trader
  generateLiveMessage(roomId) {
    const room = this.rooms[roomId];
    if (!room) return null;
    
    let messagePool = REAL_TRADING_MESSAGES[room.type] || REAL_TRADING_MESSAGES.general;
    if (room.type === 'public') messagePool = REAL_TRADING_MESSAGES.general;
    
    const trader = this.liveTraders[Math.floor(Math.random() * this.liveTraders.length)];
    const msgData = messagePool[Math.floor(Math.random() * messagePool.length)];
    
    const message = {
      id: `live-${Date.now()}`,
      roomId,
      userId: trader.id,
      userName: trader.name,
      avatar: trader.avatar,
      content: msgData.content,
      type: msgData.type,
      time: 'Just now',
      timestamp: new Date().toISOString(),
      reactions: { likes: 0 },
      isAI: false,
      traderInfo: { winRate: trader.winRate, trades: trader.trades }
    };
    
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    this.messages.get(roomId).push(message);
    this.saveMessagesToStorage();
    
    return message;
  }

  // Get live market conditions for AI rooms
  getLiveMarketConditions() {
    return LIVE_MARKET_INSIGHTS.map(insight => ({
      ...insight,
      lastUpdate: new Date().toISOString(),
      trend: insight.strength > 60 ? 'strong' : insight.strength > 40 ? 'moderate' : 'weak'
    }));
  }

  // Fetch trading tips from web (simulated - returns curated tips)
  async fetchTradingTips(category = 'all') {
    // In a real implementation, this would fetch from trading communities
    // For now, returns curated real trading tips
    const tips = {
      volatility: [
        "V75 typically has 3-5 strong trend moves per day. Catch them, don't chase them.",
        "On V75, wait for a candle to close before entering. Avoid entering on wicks.",
        "V100 is faster but less predictable. Start with V75 if you're learning.",
        "Boom and Crash need patience. Wait for the spike zone, don't anticipate.",
      ],
      risk: [
        "Never risk more than 2% of your account on a single trade.",
        "Your stop loss should be placed BEFORE you enter the trade, not after.",
        "Position sizing formula: (Account × Risk%) ÷ Stop Loss Pips = Lot Size",
        "If you can't sleep with a position open, it's too big.",
      ],
      psychology: [
        "The best trade is often the one you don't take.",
        "Journal every trade. The patterns in your losses reveal your edge.",
        "Take profits at your target. Greed turns winners into losers.",
        "After 3 losses, stop trading for the day. No exceptions.",
      ],
      strategy: [
        "Trade the trend on higher timeframes, enter on lower timeframes.",
        "Confirmations increase win rate but reduce number of trades. That's okay.",
        "The best setups often come when you're away. Set alerts, don't stare.",
        "Backtest your strategy on at least 100 trades before going live.",
      ]
    };
    
    if (category === 'all') {
      return Object.values(tips).flat();
    }
    return tips[category] || tips.strategy;
  }

  // Load messages from localStorage
  loadMessagesFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Failed to load messages from storage:', e);
    }
    return new Map();
  }

  // Save messages to localStorage
  saveMessagesToStorage() {
    try {
      const obj = Object.fromEntries(this.messages);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save messages to storage:', e);
    }
  }

  // Load community posts from localStorage
  loadCommunityPostsFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load community posts from storage:', e);
    }
    return [];
  }

  // Save community posts to localStorage
  saveCommunityPostsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(this.communityPosts));
    } catch (e) {
      console.error('Failed to save community posts to storage:', e);
    }
  }

  // Load reputation from localStorage
  loadReputationFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_REPUTATION);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Failed to load reputation from storage:', e);
    }
    return new Map();
  }

  // Save reputation to localStorage
  saveReputationToStorage() {
    try {
      const obj = Object.fromEntries(this.userReputation);
      localStorage.setItem(STORAGE_KEYS.USER_REPUTATION, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save reputation to storage:', e);
    }
  }

  loadRooms() {
    const allRooms = {};
    Object.entries(DEFAULT_ROOMS).forEach(([category, rooms]) => {
      rooms.forEach(room => {
        allRooms[room.id] = { ...room, members: [], messageCount: 0, activeNow: 0 };
      });
    });
    return allRooms;
  }

  // ========== AUTO-ASSIGNMENT LOGIC ==========
  
  /**
   * Calculate chatroom fit scores and auto-assign user to appropriate rooms
   * @param {Object} analytics - Full analytics from analyticsService
   * @param {Object} userInfo - User information
   * @returns {Array} Array of room IDs user should be assigned to
   */
  calculateRoomAssignments(analytics, userInfo) {
    const assignments = [];
    const scores = {};

    if (!analytics) return ['general', 'beginners'];

    const { tradePerformance, emotionalAnalysis, riskAnalysis, timePatterns } = analytics;

    // === Trading Performance Assignment ===
    const winRate = tradePerformance?.winRate || 0;
    const totalTrades = tradePerformance?.totalTrades || 0;

    if (totalTrades < 20) {
      assignments.push('beginners');
    } else if (winRate >= 55) {
      assignments.push('pro-traders');
      if (tradePerformance?.currentStreakType === 'win' && tradePerformance?.currentStreak >= 5) {
        assignments.push('winning-streak');
      }
    } else if (winRate >= 45) {
      assignments.push('intermediate');
    } else {
      assignments.push('recovery-room');
    }

    // === Emotional Profile Assignment ===
    if (emotionalAnalysis) {
      if (emotionalAnalysis.revengeTradingDetected) {
        assignments.push('revenge-recovery');
        assignments.push('discipline');
      }
      if (emotionalAnalysis.overtradingDetected) {
        assignments.push('overtrading-support');
        assignments.push('slow-steady');
      }
      if (emotionalAnalysis.fomoTradingDetected) {
        assignments.push('fomo-rehab');
      }
      if (emotionalAnalysis.emotionalScore < 40) {
        assignments.push('emotional-support');
      }
    }

    // === Risk Profile Assignment ===
    if (riskAnalysis) {
      if (riskAnalysis.riskBehavior === 'reckless' || riskAnalysis.riskBehavior === 'high_risk') {
        assignments.push('discipline');
      }
      if (riskAnalysis.maxDrawdown > 30) {
        assignments.push('recovery-room');
      }
    }

    // === Contract Type Assignment ===
    if (tradePerformance?.contractTypePerformance) {
      const types = Object.entries(tradePerformance.contractTypePerformance);
      const mostTraded = types.sort((a, b) => b[1].trades - a[1].trades)[0];
      
      if (mostTraded) {
        const [type] = mostTraded;
        if (type.includes('Multiplier')) assignments.push('multipliers-lab');
        if (type.includes('Rise') || type.includes('Fall') || type.includes('Binary')) assignments.push('binary-lounge');
        if (type.includes('Volatility')) assignments.push('volatility-gang');
      }
    }

    // Always add general and AI coaching
    assignments.push('general');
    assignments.push('ai-coaching');

    // Remove duplicates
    return [...new Set(assignments)];
  }

  /**
   * Get room fit score for a specific room
   */
  getRoomFitScore(roomId, analytics) {
    const room = this.rooms[roomId];
    if (!room) return 0;

    let score = 50; // Base score

    if (!analytics) return score;

    const { tradePerformance, emotionalAnalysis, riskAnalysis } = analytics;

    // Behavior match
    if (room.type === 'behavior') {
      if (emotionalAnalysis?.emotionalScore < 50) score += 20;
      if (emotionalAnalysis?.revengeTradingDetected && roomId.includes('revenge')) score += 30;
      if (emotionalAnalysis?.overtradingDetected && roomId.includes('overtrading')) score += 30;
    }

    // Performance match
    if (room.type === 'performance') {
      const winRate = tradePerformance?.winRate || 0;
      if (roomId === 'pro-traders' && winRate >= 55) score += 30;
      if (roomId === 'beginners' && tradePerformance?.totalTrades < 20) score += 30;
      if (roomId === 'recovery-room' && riskAnalysis?.maxDrawdown > 20) score += 25;
    }

    // Risk match
    if (riskAnalysis?.riskBehavior === 'conservative' && roomId.includes('discipline')) {
      score += 15;
    }

    return Math.min(100, score);
  }

  // ========== CHATROOM MANAGEMENT ==========

  /**
   * Get all available rooms categorized (legacy method)
   */
  getAllRoomsCategorized() {
    return {
      behavior: Object.values(this.rooms).filter(r => r.type === 'behavior'),
      strategy: Object.values(this.rooms).filter(r => r.type === 'strategy'),
      performance: Object.values(this.rooms).filter(r => r.type === 'performance'),
      ai: Object.values(this.rooms).filter(r => r.type === 'ai'),
      public: Object.values(this.rooms).filter(r => r.type === 'public'),
    };
  }

  /**
   * Get all rooms as flat array with live activity data
   */
  getAllRooms() {
    return Object.values(this.rooms).map(room => {
      // Generate dynamic active count that changes slightly
      const baseActive = room.activeNow || 5;
      const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const activeNow = Math.max(2, baseActive + variance);
      
      // Get recent message count
      const messages = this.messages.get(room.id) || [];
      const recentMessages = messages.filter(m => {
        const msgTime = new Date(m.timestamp);
        const hourAgo = new Date(Date.now() - 3600000);
        return msgTime > hourAgo;
      }).length;
      
      return {
        ...room,
        category: room.type,
        members: activeNow,
        activeNow,
        recentActivity: recentMessages,
        premium: room.isPremium || false,
        isLive: true,
        lastMessage: messages.length > 0 ? messages[messages.length - 1]?.content?.substring(0, 50) + '...' : null
      };
    });
  }

  /**
   * Get user assigned rooms based on analytics with live data
   * @param {Object} analytics - Full analytics from analyticsService
   * @returns {Array} Array of room objects with fit scores and live activity
   */
  getUserAssignedRooms(analytics) {
    const assignedRoomIds = this.calculateRoomAssignments(analytics);
    
    return assignedRoomIds.map(id => {
      const room = this.rooms[id];
      if (!room) return null;
      
      const fitScore = this.getRoomFitScore(id, analytics);
      
      // Get live activity data
      const baseActive = room.activeNow || 5;
      const variance = Math.floor(Math.random() * 5) - 2;
      const activeNow = Math.max(2, baseActive + variance);
      
      const messages = this.messages.get(id) || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      return {
        ...room,
        category: room.type,
        fitScore,
        members: activeNow,
        activeNow,
        premium: room.isPremium || false,
        isLive: true,
        lastMessage: lastMessage?.content?.substring(0, 40) + (lastMessage?.content?.length > 40 ? '...' : ''),
        lastMessageTime: lastMessage?.time || null,
        messageCount: messages.length
      };
    }).filter(Boolean).sort((a, b) => b.fitScore - a.fitScore);
  }

  /**
   * Get rooms user is assigned to (legacy method)
   */
  getUserRooms(userId, analytics) {
    return this.getUserAssignedRooms(analytics);
  }

  /**
   * Join a room
   */
  joinRoom(userId, roomId) {
    const room = this.rooms[roomId];
    if (!room) return { success: false, error: 'Room not found' };
    
    if (room.members.length >= room.capacity) {
      return { success: false, error: 'Room is full' };
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
    }

    return { success: true, room };
  }

  /**
   * Leave a room
   */
  leaveRoom(userId, roomId) {
    const room = this.rooms[roomId];
    if (!room) return { success: false, error: 'Room not found' };

    room.members = room.members.filter(id => id !== userId);
    return { success: true };
  }

  // ========== MESSAGING ==========

  /**
   * Send a message to a room
   */
  sendMessage(roomId, userId, userName, content, userAvatar) {
    // Moderate content
    const moderationResult = this.moderateMessage(content);
    if (!moderationResult.allowed) {
      return { success: false, error: moderationResult.reason };
    }

    const message = {
      id: Date.now().toString(),
      roomId,
      userId,
      userName,
      avatar: userAvatar || userName?.[0]?.toUpperCase() || '?',
      content: moderationResult.cleanContent,
      time: 'Just now',
      timestamp: new Date().toISOString(),
      reactions: { likes: 0 },
      isAI: false
    };

    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    this.messages.get(roomId).push(message);
    this.saveMessagesToStorage();

    // Update user reputation
    this.updateReputation(userId, 1);

    return message; // Return message directly for easier use
  }

  /**
   * Get messages for a room - populates with activity if empty
   */
  getMessages(roomId, limit = 50) {
    // If room has no messages, populate it first
    if (!this.messages.has(roomId) || this.messages.get(roomId).length === 0) {
      this.populateRoomWithMessages(roomId);
    }
    
    const messages = this.messages.get(roomId) || [];
    return messages.slice(-limit);
  }

  /**
   * Enter a room - starts live activity simulation
   */
  enterRoom(roomId, userId) {
    const room = this.rooms[roomId];
    if (!room) return { success: false, error: 'Room not found' };
    
    // Start live message simulation
    this.startLiveActivity(roomId);
    
    // Get room info with active traders
    const messages = this.getMessages(roomId);
    const activeTraders = room.activeTraders || this.getRandomTraders(Math.floor(Math.random() * 5) + 3);
    
    return {
      success: true,
      room: {
        ...room,
        activeTraders,
        messages
      }
    };
  }

  /**
   * Leave a room - stops live activity simulation
   */
  exitRoom(roomId) {
    this.stopLiveActivity(roomId);
    return { success: true };
  }

  /**
   * Get room with live data
   */
  getRoomWithLiveData(roomId) {
    const room = this.rooms[roomId];
    if (!room) return null;
    
    return {
      ...room,
      messages: this.getMessages(roomId),
      activeTraders: room.activeTraders || this.getRandomTraders(5),
      marketConditions: room.type === 'ai' ? this.getLiveMarketConditions() : null
    };
  }

  /**
   * React to a message
   */
  reactToMessage(roomId, messageId, userId, reaction) {
    const messages = this.messages.get(roomId);
    if (!messages) return { success: false };

    const message = messages.find(m => m.id === messageId);
    if (!message) return { success: false };

    if (!message.reactions[reaction]) {
      message.reactions[reaction] = [];
    }
    
    if (message.reactions[reaction].includes(userId)) {
      message.reactions[reaction] = message.reactions[reaction].filter(id => id !== userId);
    } else {
      message.reactions[reaction].push(userId);
    }

    return { success: true, reactions: message.reactions };
  }

  // ========== MODERATION ==========

  /**
   * Moderate message content
   */
  moderateMessage(content) {
    const toxicPatterns = [
      /\b(scam|guaranteed|100%\s*win|sure\s*profit|deposit\s*now)\b/i,
      /\b(idiot|stupid|loser|trash)\b/i,
    ];

    const spamPatterns = [
      /(.)\1{5,}/i, // Repeated characters
      /(https?:\/\/[^\s]+\s*){3,}/i, // Multiple links
    ];

    let cleanContent = content;
    let allowed = true;
    let reason = '';

    // Check for toxicity
    for (const pattern of toxicPatterns) {
      if (pattern.test(content)) {
        allowed = false;
        reason = 'Message contains inappropriate content';
        break;
      }
    }

    // Check for spam
    if (allowed) {
      for (const pattern of spamPatterns) {
        if (pattern.test(content)) {
          allowed = false;
          reason = 'Message detected as spam';
          break;
        }
      }
    }

    // Length check
    if (content.length > 1000) {
      allowed = false;
      reason = 'Message too long (max 1000 characters)';
    }

    return { allowed, cleanContent, reason };
  }

  /**
   * Update user reputation
   */
  updateReputation(userId, delta) {
    const current = this.userReputation.get(userId) || 50;
    this.userReputation.set(userId, Math.max(0, Math.min(100, current + delta)));
    this.saveReputationToStorage();
  }

  /**
   * Get user reputation
   */
  getReputation(userId) {
    return this.userReputation.get(userId) || 50;
  }

  /**
   * Get full user reputation data with level and badges
   */
  getUserReputation(userId) {
    const score = this.userReputation.get(userId) || 50;
    
    let level = 'Newbie';
    if (score >= 90) level = 'Legend';
    else if (score >= 75) level = 'Master';
    else if (score >= 60) level = 'Expert';
    else if (score >= 40) level = 'Intermediate';
    else if (score >= 20) level = 'Beginner';
    
    const badges = [];
    if (score >= 25) badges.push({ name: 'First Steps', icon: '🌱' });
    if (score >= 50) badges.push({ name: 'Active Member', icon: '⭐' });
    if (score >= 75) badges.push({ name: 'Community Hero', icon: '🏆' });
    if (score >= 90) badges.push({ name: 'Trading Guru', icon: '👑' });
    
    return { score, level, badges };
  }

  // ========== AI MESSAGES ==========

  /**
   * Generate AI coaching message based on user's analytics
   */
  generateAICoachingMessage(analytics, roomId) {
    const messages = [];

    if (!analytics) {
      return [{
        id: `ai-${Date.now()}`,
        roomId,
        userId: 'ai-coach',
        userName: 'AI Coach',
        userAvatar: '🤖',
        content: 'Welcome! Sync your trading data to get personalized coaching.',
        timestamp: new Date().toISOString(),
        reactions: {},
        isAI: true
      }];
    }

    const { emotionalAnalysis, riskAnalysis, tradePerformance, recommendations } = analytics;

    // Emotional alerts
    if (emotionalAnalysis?.emotionalScore < 40) {
      messages.push({
        id: `ai-${Date.now()}-emotion`,
        roomId,
        userId: 'ai-coach',
        userName: 'AI Coach',
        userAvatar: '🤖',
        content: `⚠️ Emotional Alert: Your emotional stability score is ${emotionalAnalysis.emotionalScore}/100. Consider taking a break before your next trade. Remember: emotional trading is the #1 account killer.`,
        timestamp: new Date().toISOString(),
        reactions: {},
        isAI: true,
        type: 'warning'
      });
    }

    // Streak alerts
    if (tradePerformance?.currentStreakType === 'loss' && tradePerformance?.currentStreak >= 3) {
      messages.push({
        id: `ai-${Date.now()}-streak`,
        roomId,
        userId: 'ai-coach',
        userName: 'AI Coach',
        userAvatar: '🤖',
        content: `🛑 Loss Streak Alert: You're on a ${tradePerformance.currentStreak}-trade losing streak. This is a critical moment. Take a 30-minute break minimum.`,
        timestamp: new Date().toISOString(),
        reactions: {},
        isAI: true,
        type: 'critical'
      });
    }

    // Risk alerts
    if (riskAnalysis?.avgRiskPercent > 10) {
      messages.push({
        id: `ai-${Date.now()}-risk`,
        roomId,
        userId: 'ai-coach',
        userName: 'AI Coach',
        userAvatar: '🤖',
        content: `📊 Risk Alert: You're risking an average of ${riskAnalysis.avgRiskPercent.toFixed(1)}% per trade. Professional traders typically risk 1-2%. Consider reducing your position sizes.`,
        timestamp: new Date().toISOString(),
        reactions: {},
        isAI: true,
        type: 'warning'
      });
    }

    // Positive reinforcement
    if (tradePerformance?.winRate >= 55 && emotionalAnalysis?.emotionalScore >= 70) {
      messages.push({
        id: `ai-${Date.now()}-positive`,
        roomId,
        userId: 'ai-coach',
        userName: 'AI Coach',
        userAvatar: '🤖',
        content: `🎉 Great job! Your ${tradePerformance.winRate.toFixed(1)}% win rate and ${emotionalAnalysis.emotionalScore}/100 emotional score show excellent discipline. Keep it up!`,
        timestamp: new Date().toISOString(),
        reactions: {},
        isAI: true,
        type: 'positive'
      });
    }

    // Add top recommendation
    if (recommendations && recommendations.length > 0) {
      const topRec = recommendations[0];
      messages.push({
        id: `ai-${Date.now()}-rec`,
        roomId,
        userId: 'ai-coach',
        userName: 'AI Coach',
        userAvatar: '💡',
        content: `💡 Tip: ${topRec.message} → ${topRec.action}`,
        timestamp: new Date().toISOString(),
        reactions: {},
        isAI: true,
        type: 'tip'
      });
    }

    return messages;
  }

  /**
   * Send an AI coaching message in response to user input
   */
  sendAICoachingMessage(roomId, userMessage, analytics) {
    const message = userMessage.toLowerCase();
    let response = '';
    
    // Context-aware AI responses
    if (message.includes('losing') || message.includes('loss') || message.includes('lost')) {
      const lossStreak = analytics?.tradePerformance?.currentStreak || 0;
      if (analytics?.tradePerformance?.currentStreakType === 'loss' && lossStreak >= 3) {
        response = `I see you're experiencing losses. You're currently on a ${lossStreak}-trade losing streak. Here's my advice:\n\n1️⃣ Take a 30-minute break immediately\n2️⃣ Review your last 3 trades - look for patterns\n3️⃣ Consider reducing position size by 50% for next 5 trades\n4️⃣ Stick to your best performing setup only\n\nRemember: Losses are part of trading. What matters is how you respond.`;
      } else {
        response = `Losses happen to every trader. Here's how to handle them:\n\n1️⃣ Accept losses as tuition fees\n2️⃣ Never revenge trade\n3️⃣ Review what went wrong objectively\n4️⃣ Stick to your risk management rules\n\nWould you like me to analyze your recent trading patterns?`;
      }
    } else if (message.includes('fomo') || message.includes('miss') || message.includes('chase')) {
      response = `FOMO is one of the biggest account killers. Here's how to combat it:\n\n🎯 Remember: The market will always provide new opportunities\n⏰ Set specific trading hours and stick to them\n📋 Only trade setups from your trading plan\n🧘 Practice: "If it's not my setup, it's not my trade"\n\nYour next winning trade is waiting - but only take it on YOUR terms.`;
    } else if (message.includes('revenge') || message.includes('angry') || message.includes('frustrated')) {
      response = `I understand the frustration. Revenge trading is incredibly destructive. Here's what to do:\n\n🛑 STOP trading immediately for today\n📝 Journal exactly how you're feeling\n🚶 Take a walk or do something non-trading related\n📊 Tomorrow, review with fresh eyes\n\nOne bad trade doesn't define you. How you respond does.`;
    } else if (message.includes('strategy') || message.includes('setup') || message.includes('how to')) {
      response = `Great question! Based on your trading data, here are some insights:\n\n📈 Your best performing time: ${analytics?.timePatterns?.bestHour || 'Morning sessions'}\n💰 Your most profitable market: ${analytics?.tradePerformance?.bestMarket || 'Volatility indices'}\n📊 Win rate sweet spot: Trades held for 5-15 minutes\n\nWould you like specific strategy suggestions for your trading style?`;
    } else if (message.includes('risk') || message.includes('position') || message.includes('stake')) {
      const avgRisk = analytics?.riskAnalysis?.avgRiskPercent || 5;
      response = `Risk management is key! Here's your personalized analysis:\n\n📊 Your avg risk per trade: ${avgRisk.toFixed(1)}%\n✅ Recommended: 1-2% max per trade\n💡 Position sizing formula: Risk $ ÷ Stop Loss = Position Size\n\n${avgRisk > 5 ? '⚠️ Consider reducing your risk - your current level is aggressive.' : '✅ Your risk management looks healthy!'}`;
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      response = `Hello! 👋 I'm your AI Trading Coach. I analyze your trading patterns and provide personalized guidance.\n\nYou can ask me about:\n• Your recent performance\n• Risk management tips\n• Emotional trading patterns\n• Strategy suggestions\n• How to handle losses\n\nWhat would you like to work on today?`;
    } else if (message.includes('overtrading') || message.includes('too many')) {
      const tradesPerSession = analytics?.timePatterns?.avgTradesPerSession || 'unknown';
      response = `Overtrading is a common issue. Let's address it:\n\n📊 Your avg trades per session: ${tradesPerSession}\n🎯 Recommended: 3-5 quality trades per day\n\n✅ Set a daily trade limit and stick to it\n✅ Quality over quantity always\n✅ Stop after 3 consecutive losses\n✅ Take profits and step away\n\nWould you like me to help you create a trading schedule?`;
    } else {
      response = `I'm here to help! Based on your trading data:\n\n📈 Win Rate: ${analytics?.tradePerformance?.winRate?.toFixed(1) || 'N/A'}%\n🧠 Emotional Score: ${analytics?.emotionalAnalysis?.emotionalScore || 'N/A'}/100\n💰 Total Trades: ${analytics?.tradePerformance?.totalTrades || 0}\n\nAsk me about:\n• Handling losses or winning streaks\n• Risk management\n• Strategy optimization\n• Emotional trading patterns\n\nI'm here to help you become a better trader!`;
    }
    
    return {
      id: `ai-${Date.now()}`,
      roomId,
      userId: 'ai-coach',
      userName: 'TraderMind AI',
      userAvatar: '🤖',
      content: response,
      time: 'Just now',
      isAI: true,
      reactions: { likes: 0 }
    };
  }

  // ========== COMMUNITY FEED ==========

  /**
   * Get community posts from localStorage
   */
  getCommunityPosts(limit = 20) {
    return this.communityPosts.slice(0, limit);
  }

  /**
   * Create a community post
   */
  createPost(userId, userName, userAvatar, content, type = 'text', tags = []) {
    const moderationResult = this.moderateMessage(content);
    if (!moderationResult.allowed) {
      return { success: false, error: moderationResult.reason };
    }

    const post = {
      id: Date.now().toString(),
      userId,
      userName,
      avatar: userAvatar || userName?.[0]?.toUpperCase() || '?',
      content: moderationResult.cleanContent,
      type, // text, trade-share, strategy, milestone
      tags,
      time: 'Just now',
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      views: 0
    };

    this.communityPosts.unshift(post);
    this.saveCommunityPostsToStorage();
    this.updateReputation(userId, 2);

    return { success: true, post };
  }

  /**
   * Get community feed
   */
  getCommunityFeed(limit = 20, sortBy = 'recent') {
    let posts = [...this.communityPosts];

    if (sortBy === 'helpful') {
      posts.sort((a, b) => b.helpfulVotes - a.helpfulVotes);
    } else if (sortBy === 'popular') {
      posts.sort((a, b) => b.likes.length - a.likes.length);
    }
    // 'recent' is default (already sorted by time)

    return posts.slice(0, limit);
  }

  /**
   * Like a post
   */
  likePost(postId, userId) {
    const post = this.communityPosts.find(p => p.id === postId);
    if (!post) return { success: false };

    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id !== userId);
    } else {
      post.likes.push(userId);
      this.updateReputation(post.userId, 1);
    }

    return { success: true, likes: post.likes.length };
  }

  /**
   * Comment on a post
   */
  commentOnPost(postId, userId, userName, content) {
    const post = this.communityPosts.find(p => p.id === postId);
    if (!post) return { success: false };

    const moderationResult = this.moderateMessage(content);
    if (!moderationResult.allowed) {
      return { success: false, error: moderationResult.reason };
    }

    const comment = {
      id: Date.now().toString(),
      userId,
      userName,
      content: moderationResult.cleanContent,
      timestamp: new Date().toISOString()
    };

    post.comments.push(comment);
    this.updateReputation(userId, 1);

    return { success: true, comment };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(type = 'reputation') {
    const users = Array.from(this.userReputation.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return users;
  }

  // ========== DAILY CHALLENGES ==========

  dailyChallenges = [
    { id: 'low-risk', title: 'Low Risk Day', description: 'Trade only with 1% risk for 24 hours', reward: 50, icon: '🎯' },
    { id: 'no-revenge', title: 'No Revenge Trading', description: 'Complete the day without revenge trading', reward: 75, icon: '🧘' },
    { id: 'share-strategy', title: 'Share Your Strategy', description: 'Post your best strategy in the community', reward: 30, icon: '📝' },
    { id: 'early-stop', title: 'Early Stop', description: 'Stop trading after 3 wins today', reward: 40, icon: '🛑' },
    { id: 'journal-entry', title: 'Journaling', description: 'Write a detailed journal entry about today\'s trades', reward: 25, icon: '📓' },
  ];

  /**
   * Get today's challenges
   */
  getTodaysChallenges() {
    // Rotate challenges based on day of week
    const dayIndex = new Date().getDay();
    const startIndex = dayIndex % this.dailyChallenges.length;
    return [
      this.dailyChallenges[startIndex],
      this.dailyChallenges[(startIndex + 1) % this.dailyChallenges.length],
      this.dailyChallenges[(startIndex + 2) % this.dailyChallenges.length],
    ];
  }
}

const chatroomService = new ChatroomService();
export default chatroomService;

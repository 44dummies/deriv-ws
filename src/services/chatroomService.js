/**
 * NexaTrade Chatroom & Community Service
 * Handles chatrooms, community feed, auto-assignment, and moderation
 */

// Chatroom Types
const ROOM_TYPES = {
  BEHAVIOR: 'behavior',
  STRATEGY: 'strategy',
  PERFORMANCE: 'performance',
  PREMIUM: 'premium',
  AI: 'ai'
};

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
    this.messages = new Map(); // roomId -> [messages]
    this.userReputation = new Map(); // userId -> score
    this.initializeSampleMessages();
  }

  loadRooms() {
    const allRooms = {};
    Object.entries(DEFAULT_ROOMS).forEach(([category, rooms]) => {
      rooms.forEach(room => {
        allRooms[room.id] = { ...room, members: [], messageCount: 0, activeNow: Math.floor(Math.random() * 50) + 10 };
      });
    });
    return allRooms;
  }

  initializeSampleMessages() {
    // Sample messages for AI coaching room
    this.messages.set('ai-coaching', [
      { id: '1', userName: 'NexaTrade AI', content: 'Welcome to AI Coaching! I analyze your trading patterns and provide personalized guidance. Ask me anything about your trading behavior.', time: 'Pinned', isAI: true, reactions: { likes: 45 } },
      { id: '2', userName: 'TraderMike', avatar: 'T', content: 'Hey AI, I keep losing on Volatility 75. What am I doing wrong?', time: '2h ago', isAI: false, reactions: { likes: 3 } },
      { id: '3', userName: 'NexaTrade AI', content: 'Based on typical patterns, V75 losses often come from: 1) Trading during high volatility spikes without proper stop loss, 2) Over-leveraging with multipliers, 3) Revenge trading after losses. Try setting strict 2% risk limits per trade.', time: '2h ago', isAI: true, reactions: { likes: 12 } },
    ]);
    
    // Sample messages for general room
    this.messages.set('general', [
      { id: '1', userName: 'CommunityBot', content: '👋 Welcome to General Discussion! Please be respectful and share your trading experiences.', time: 'Pinned', isAI: true, reactions: { likes: 89 } },
      { id: '2', userName: 'EarlyBird', avatar: 'E', content: 'Good morning traders! Ready for another profitable day?', time: '1h ago', isAI: false, reactions: { likes: 15 } },
      { id: '3', userName: 'NightOwl', avatar: 'N', content: 'Asian session is looking volatile today. Be careful out there!', time: '45m ago', isAI: false, reactions: { likes: 8 } },
    ]);
    
    // Sample messages for FOMO rehab
    this.messages.set('fomo-rehab', [
      { id: '1', userName: 'NexaTrade AI', content: 'This is a safe space to discuss FOMO (Fear Of Missing Out) trading. Remember: Missing a trade is better than taking a bad one!', time: 'Pinned', isAI: true, reactions: { likes: 67 } },
      { id: '2', userName: 'RecoveringFOMO', avatar: 'R', content: 'Day 5 without chasing trades! The urge is real but staying strong 💪', time: '3h ago', isAI: false, reactions: { likes: 23 } },
      { id: '3', userName: 'ZenTrader', avatar: 'Z', content: 'Proud of you! I used to chase every spike. Now I wait for MY setups only.', time: '2h ago', isAI: false, reactions: { likes: 11 } },
    ]);
    
    // Sample messages for discipline room
    this.messages.set('discipline', [
      { id: '1', userName: 'NexaTrade AI', content: 'Trading discipline is the foundation of success. Share your discipline tips and hold each other accountable!', time: 'Pinned', isAI: true, reactions: { likes: 78 } },
      { id: '2', userName: 'DisciplineCoach', avatar: 'D', content: 'Rule #1: Always set your stop loss BEFORE entering a trade. No exceptions!', time: '4h ago', isAI: false, reactions: { likes: 34 } },
    ]);
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
   * Get all rooms as flat array with category included
   */
  getAllRooms() {
    return Object.values(this.rooms).map(room => ({
      ...room,
      category: room.type,
      members: room.activeNow || Math.floor(Math.random() * 50),
      premium: room.isPremium || false
    }));
  }

  /**
   * Get user assigned rooms based on analytics
   * @param {Object} analytics - Full analytics from analyticsService
   * @returns {Array} Array of room objects with fit scores
   */
  getUserAssignedRooms(analytics) {
    const assignedRoomIds = this.calculateRoomAssignments(analytics);
    
    return assignedRoomIds.map(id => {
      const room = this.rooms[id];
      if (!room) return null;
      
      const fitScore = this.getRoomFitScore(id, analytics);
      
      return {
        ...room,
        category: room.type,
        fitScore,
        members: room.activeNow || Math.floor(Math.random() * 50),
        premium: room.isPremium || false
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
      userAvatar: userAvatar || userName?.[0]?.toUpperCase() || '?',
      content: moderationResult.cleanContent,
      timestamp: new Date().toISOString(),
      reactions: {},
      isAI: false
    };

    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    this.messages.get(roomId).push(message);

    // Update user reputation
    this.updateReputation(userId, 1);

    return { success: true, message };
  }

  /**
   * Get messages for a room
   */
  getMessages(roomId, limit = 50) {
    const messages = this.messages.get(roomId) || [];
    return messages.slice(-limit);
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
      userName: 'NexaTrade AI',
      userAvatar: '🤖',
      content: response,
      time: 'Just now',
      isAI: true,
      reactions: { likes: 0 }
    };
  }

  // ========== COMMUNITY FEED ==========

  /**
   * Community feed posts storage with sample data
   */
  communityPosts = [
    { 
      id: '1', 
      userId: 'user_1',
      userName: 'TraderJoe', 
      avatar: '🎯', 
      content: 'Just hit a 10-trade winning streak on Volatility 75! The key is patience and proper risk management. Never risk more than 2% per trade.', 
      time: '2 hours ago', 
      likes: 45, 
      comments: 12, 
      views: 234,
      tags: ['winning-streak', 'volatility-75', 'risk-management'],
      badge: 'Pro Trader'
    },
    { 
      id: '2', 
      userId: 'user_2',
      userName: 'CryptoQueen', 
      avatar: '👑', 
      content: 'Sharing my multiplier strategy for beginners: Start with 10x multiplier, set stop loss at 5%, take profit at 20%. Simple but effective!', 
      time: '4 hours ago', 
      likes: 89, 
      comments: 34, 
      views: 567,
      tags: ['multipliers', 'beginner-friendly', 'strategy'],
      badge: 'Strategy Master'
    },
    { 
      id: '3', 
      userId: 'user_3',
      userName: 'DisciplinedTrader', 
      avatar: '🧘', 
      content: 'Day 30 of no revenge trading! The FOMO Rehab room really helped me overcome my worst habit. Thank you to everyone for the support!', 
      time: '6 hours ago', 
      likes: 123, 
      comments: 45, 
      views: 890,
      tags: ['discipline', 'milestone', 'recovery'],
      badge: 'Recovery Champion'
    },
    { 
      id: '4', 
      userId: 'user_4',
      userName: 'NewbieTrader', 
      avatar: '🌱', 
      content: 'First profitable week ever! Small gains but consistent. Learning a lot from the beginner room. What was your first winning week like?', 
      time: '8 hours ago', 
      likes: 67, 
      comments: 28, 
      views: 345,
      tags: ['milestone', 'beginner', 'first-win']
    },
    { 
      id: '5', 
      userId: 'user_5',
      userName: 'AIEnthusiast', 
      avatar: '🤖', 
      content: 'The AI coaching room just helped me identify my overtrading pattern. It suggested I limit myself to 5 trades per session. Game changer!', 
      time: '12 hours ago', 
      likes: 56, 
      comments: 19, 
      views: 278,
      tags: ['ai-coaching', 'overtrading', 'improvement'],
      badge: 'AI Pioneer'
    }
  ];

  /**
   * Get community posts (alias for getCommunityFeed with sample data)
   */
  getCommunityPosts(limit = 20) {
    return this.communityPosts.slice(0, limit);
  }

  /**
   * Create a community post
   */
  createPost(userId, userName, userAvatar, content, type = 'text', attachments = []) {
    const moderationResult = this.moderateMessage(content);
    if (!moderationResult.allowed) {
      return { success: false, error: moderationResult.reason };
    }

    const post = {
      id: Date.now().toString(),
      userId,
      userName,
      userAvatar: userAvatar || userName?.[0]?.toUpperCase() || '?',
      content: moderationResult.cleanContent,
      type, // text, trade-screenshot, strategy, victory, loss
      attachments,
      timestamp: new Date().toISOString(),
      likes: [],
      comments: [],
      helpfulVotes: 0,
      isVerified: false
    };

    this.communityPosts.unshift(post);
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

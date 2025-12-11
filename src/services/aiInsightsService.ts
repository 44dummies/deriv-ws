/**
 * TraderMind AI Insights Service
 * Provides AI-powered trading insights and recommendations
 */

class AIInsightsService {
  initialized: boolean;
  cachedInsights: any;

  constructor() {
    this.initialized = false;
    this.cachedInsights = null;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Generate room insights based on message content and activity
   */
  generateRoomInsights(roomId: string, messages: any[], roomType: string) {
    if (!messages || messages.length === 0) {
      return {
        sentiment: 'neutral',
        activity: 'quiet',
        topics: [],
        summary: 'No recent activity'
      };
    }

    // Analyze sentiment from recent messages
    const recentMessages = messages.slice(-20);
    let positiveCount = 0;
    let negativeCount = 0;
    const topics: string[] = [];

    const positiveWords = ['profit', 'win', 'won', 'green', 'up', 'great', 'nice', 'good', 'awesome'];
    const negativeWords = ['loss', 'lost', 'red', 'down', 'bad', 'stop', 'sl', 'fail'];
    const topicKeywords = {
      'strategy': ['strategy', 'signal', 'entry', 'exit', 'pattern'],
      'risk': ['risk', 'sl', 'tp', 'stop loss', 'take profit'],
      'markets': ['r_100', 'r_50', 'volatility', 'market'],
      'education': ['learn', 'tutorial', 'help', 'question', 'how']
    };

    recentMessages.forEach(msg => {
      const content = (msg.content || msg.message || '').toLowerCase();

      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });

      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(kw => content.includes(kw)) && !topics.includes(topic)) {
          topics.push(topic);
        }
      });
    });

    // Determine sentiment
    let sentiment = 'neutral';
    if (positiveCount > negativeCount * 1.5) sentiment = 'bullish';
    else if (negativeCount > positiveCount * 1.5) sentiment = 'bearish';
    else if (positiveCount > 0 || negativeCount > 0) sentiment = 'mixed';

    // Determine activity level
    const messagesPerHour = recentMessages.length; // Simplified
    let activity = 'normal';
    if (messagesPerHour > 15) activity = 'high';
    else if (messagesPerHour < 5) activity = 'quiet';

    // Generate summary
    const summaries = {
      bullish: 'Traders are feeling optimistic with recent wins.',
      bearish: 'Sentiment is cautious after some losses.',
      mixed: 'Mixed reactions with both wins and losses.',
      neutral: 'Standard trading discussions.'
    };

    return {
      sentiment,
      activity,
      topics: topics.slice(0, 3),
      summary: summaries[sentiment] || summaries.neutral,
      messageCount: messages.length,
      recentActivity: recentMessages.length
    };
  }

  /**
   * Get AI-generated insights based on trading data
   */
  async getInsights(tradingData: any = {}) {

    await new Promise(resolve => setTimeout(resolve, 500));

    const { winRate = 50, totalTrades = 0, recentLosses = 0 } = tradingData;

    const insights = {
      summary: this._generateSummary(winRate, totalTrades),
      recommendations: this._generateRecommendations(winRate, recentLosses),
      behaviorScore: this._calculateBehaviorScore(tradingData),
      riskLevel: this._assessRiskLevel(tradingData),
      nextSteps: this._suggestNextSteps(winRate, totalTrades),
    };

    this.cachedInsights = insights;
    return insights;
  }

  _generateSummary(winRate, totalTrades) {
    if (totalTrades < 10) {
      return "You're just getting started! Focus on learning the patterns and managing risk.";
    }
    if (winRate >= 60) {
      return "Great performance! Your win rate is above average. Keep up the disciplined approach.";
    }
    if (winRate >= 50) {
      return "You're on the right track. Focus on improving entry timing for better results.";
    }
    return "There's room for improvement. Consider reviewing your strategy and risk management.";
  }

  _generateRecommendations(winRate, recentLosses) {
    const recommendations = [];

    if (recentLosses >= 3) {
      recommendations.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Take a Break',
        description: 'You\'ve had several losses in a row. Consider stepping away to reset.',
      });
    }

    if (winRate < 50) {
      recommendations.push({
        type: 'strategy',
        icon: '📊',
        title: 'Review Entry Points',
        description: 'Your entries might be premature. Wait for stronger confirmation signals.',
      });
    }

    recommendations.push({
      type: 'tip',
      icon: '💡',
      title: 'Journal Your Trades',
      description: 'Recording your thought process helps identify patterns in your behavior.',
    });

    recommendations.push({
      type: 'mindset',
      icon: '🧘',
      title: 'Stay Disciplined',
      description: 'Stick to your trading plan. Emotional decisions lead to losses.',
    });

    return recommendations;
  }

  _calculateBehaviorScore(data) {

    let score = 70;

    if (data.followedPlan) score += 10;
    if (data.usedStopLoss) score += 10;
    if (data.noRevengeTrading) score += 10;
    if (data.recentLosses > 3) score -= 20;
    if (data.overtradingDetected) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  _assessRiskLevel(data) {
    const { positionSize = 0, accountBalance = 1000, recentLosses = 0 } = data;

    const riskPercentage = (positionSize / accountBalance) * 100;

    if (riskPercentage > 10 || recentLosses > 5) {
      return { level: 'high', color: 'red', label: 'High Risk' };
    }
    if (riskPercentage > 5 || recentLosses > 3) {
      return { level: 'medium', color: 'yellow', label: 'Moderate Risk' };
    }
    return { level: 'low', color: 'green', label: 'Low Risk' };
  }

  _suggestNextSteps(winRate, totalTrades) {
    const steps = [];

    if (totalTrades < 10) {
      steps.push('Complete 10 demo trades to establish a baseline');
    }
    if (winRate < 50) {
      steps.push('Review your last 5 losing trades for patterns');
    }
    steps.push('Set a maximum of 3 trades for your next session');
    steps.push('Write down your trading plan before starting');

    return steps;
  }

  /**
   * Get quick trading tip
   */
  getQuickTip() {
    const tips = [
      "Never risk more than 2% of your account on a single trade.",
      "The market will always be there tomorrow. Know when to step away.",
      "A trading plan is worthless if you don't follow it.",
      "Winning traders focus on the process, not the profits.",
      "Your emotions are your biggest trading risk.",
      "Small consistent gains beat big risky bets.",
      "The best trade is sometimes no trade at all.",
      "Review your losing trades - they teach more than winners.",
    ];

    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Analyze trading emotion
   */
  analyzeEmotion(recentTrades = []) {
    if (recentTrades.length < 3) {
      return { emotion: 'neutral', confidence: 0.5 };
    }

    const recentLosses = recentTrades.filter(t => t.profit < 0).length;
    const recentWins = recentTrades.filter(t => t.profit > 0).length;

    if (recentLosses >= 3) {
      return { emotion: 'frustrated', confidence: 0.8, suggestion: 'Take a break' };
    }
    if (recentWins >= 3) {
      return { emotion: 'confident', confidence: 0.7, suggestion: 'Stay humble, stick to plan' };
    }

    return { emotion: 'neutral', confidence: 0.6 };
  }

  /**
   * Generate personalized room recommendations based on user analytics
   */
  generatePersonalizedRecommendations(userAnalytics: any = {}, allRooms: any[] = []) {
    const recommendations = [];
    const { winRate = 50, totalTrades = 0, behaviorScore = 70, recentLosses = 0 } = userAnalytics;


    let userLevel = 1;
    if (totalTrades >= 100 && winRate >= 55) userLevel = 3;
    else if (totalTrades >= 50 && winRate >= 50) userLevel = 2;


    const scoredRooms = allRooms.map(room => {
      let score = 0;
      let reason = '';


      if (room.type === 'performance') {
        if (winRate < 50 && room.id === 'beginners') {
          score += 30;
          reason = 'Perfect for building fundamentals';
        } else if (winRate >= 50 && winRate < 60 && room.id === 'intermediate') {
          score += 30;
          reason = 'Level up your consistency';
        } else if (winRate >= 60 && room.id === 'pro-traders') {
          score += 30;
          reason = 'Join fellow consistent traders';
        }
        if (recentLosses >= 3 && room.id === 'recovery-room') {
          score += 40;
          reason = 'Get back on track together';
        }
      }


      if (room.type === 'behavior') {
        if (behaviorScore < 50 && room.id === 'discipline') {
          score += 35;
          reason = 'Build stronger trading habits';
        }
        if (recentLosses >= 3 && room.id === 'revenge-recovery') {
          score += 40;
          reason = 'Avoid revenge trading patterns';
        }
      }


      if (room.type === 'ai') {
        if (totalTrades < 50) {
          score += 25;
          reason = 'AI coaching for faster learning';
        }
        if (behaviorScore < 60 && room.id === 'emotional-support') {
          score += 30;
          reason = 'Get emotional trading alerts';
        }
      }


      if (room.type === 'strategy' && userLevel >= 2) {
        score += 15;
        reason = 'Explore new strategies';
      }


      if (room.level <= userLevel) {
        score += 10;
      }

      return { ...room, score, reason };
    });


    const topRecs = scoredRooms
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);


    if (recentLosses >= 3) {
      recommendations.push({
        type: 'alert',
        icon: '⚠️',
        message: 'Consider taking a break. The Recovery Room has traders who understand.',
        roomId: 'recovery-room'
      });
    }

    if (winRate >= 55 && totalTrades >= 100) {
      recommendations.push({
        type: 'achievement',
        icon: '🏆',
        message: 'You qualify for the Pro Traders Room!',
        roomId: 'pro-traders'
      });
    }

    if (totalTrades < 20) {
      recommendations.push({
        type: 'tip',
        icon: '💡',
        message: 'Start in the Beginner Room to learn from experienced traders.',
        roomId: 'beginners'
      });
    }

    return {
      rooms: topRecs,
      messages: recommendations,
      userLevel,
      suggestedAction: this._getSuggestedAction(userAnalytics)
    };
  }

  _getSuggestedAction(analytics) {
    const { winRate = 50, recentLosses = 0, behaviorScore = 70 } = analytics;

    if (recentLosses >= 3) {
      return 'Take a 15-minute break before your next trade';
    }
    if (behaviorScore < 50) {
      return 'Focus on following your trading plan today';
    }
    if (winRate < 45) {
      return 'Consider paper trading to refine your strategy';
    }
    return 'Stay disciplined and stick to your plan';
  }
}

const aiInsightsService = new AIInsightsService();
export default aiInsightsService;

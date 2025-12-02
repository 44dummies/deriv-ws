/**
 * TraderMind AI Insights Service
 * Provides AI-powered trading insights and recommendations
 */

class AIInsightsService {
  constructor() {
    this.initialized = false;
    this.cachedInsights = null;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Get AI-generated insights based on trading data
   */
  async getInsights(tradingData = {}) {
    // Simulate AI analysis delay
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
    // Score from 0-100 based on trading behavior
    let score = 70; // Base score

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
}

const aiInsightsService = new AIInsightsService();
export default aiInsightsService;

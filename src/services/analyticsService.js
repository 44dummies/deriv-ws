/**
 * TraderMind Analytics Service
 * Comprehensive trading analytics engine with AI-driven emotional analysis
 */

class AnalyticsService {
  
  // ========== 1. DEPOSITS & WITHDRAWALS ANALYSIS ==========
  
  /**
   * Analyze financial flow from statement data
   * @param {Array} statements - Array of statement transactions
   * @returns {Object} Financial flow analysis
   */
  analyzeFinancialFlow(statements) {
    const deposits = statements.filter(s => s.action_type === 'deposit');
    const withdrawals = statements.filter(s => s.action_type === 'withdrawal');
    
    const totalDeposits = deposits.reduce((sum, d) => sum + Math.abs(d.amount || 0), 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Math.abs(w.amount || 0), 0);
    const netFlow = totalDeposits - totalWithdrawals;
    
    // Deposit frequency analysis
    const depositDates = deposits.map(d => new Date(d.transaction_time * 1000));
    const depositFrequency = this.calculateFrequency(depositDates);
    
    // Average deposit size
    const avgDepositSize = deposits.length > 0 ? totalDeposits / deposits.length : 0;
    
    // Deposit volatility (standard deviation of deposit amounts)
    const depositAmounts = deposits.map(d => Math.abs(d.amount || 0));
    const depositVolatility = this.calculateStandardDeviation(depositAmounts);
    
    // Funding Stability Score (0-100)
    const fundingStabilityScore = this.calculateFundingStabilityScore({
      depositVolatility,
      avgDepositSize,
      depositFrequency,
      netFlow,
      totalDeposits
    });
    
    return {
      totalDeposits,
      totalWithdrawals,
      netFlow,
      depositCount: deposits.length,
      withdrawalCount: withdrawals.length,
      avgDepositSize,
      depositFrequency,
      depositVolatility,
      fundingStabilityScore,
      isNetInvesting: netFlow > 0,
      deposits,
      withdrawals
    };
  }
  
  calculateFundingStabilityScore({ depositVolatility, avgDepositSize, depositFrequency, netFlow, totalDeposits }) {
    let score = 50; // Base score
    
    // Lower volatility = better (up to +20)
    const volatilityRatio = avgDepositSize > 0 ? depositVolatility / avgDepositSize : 0;
    if (volatilityRatio < 0.3) score += 20;
    else if (volatilityRatio < 0.5) score += 10;
    else if (volatilityRatio > 1) score -= 15;
    
    // Consistent deposit frequency = better (up to +15)
    if (depositFrequency === 'monthly') score += 15;
    else if (depositFrequency === 'weekly') score += 10;
    else if (depositFrequency === 'daily') score -= 10; // Too frequent might indicate chasing losses
    
    // Positive net flow = better (up to +15)
    if (netFlow > 0) score += 15;
    else if (netFlow < -totalDeposits * 0.5) score -= 20; // Withdrawn more than 50% of deposits
    
    return Math.max(0, Math.min(100, score));
  }
  
  calculateFrequency(dates) {
    if (dates.length < 2) return 'insufficient_data';
    
    const sortedDates = dates.sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < sortedDates.length; i++) {
      intervals.push((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24)); // Days
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    if (avgInterval <= 1) return 'daily';
    if (avgInterval <= 7) return 'weekly';
    if (avgInterval <= 30) return 'monthly';
    return 'irregular';
  }
  
  // ========== 2. TRADING PERFORMANCE ANALYSIS ==========
  
  /**
   * Comprehensive trading performance analysis
   * @param {Array} trades - Array of trade objects
   * @returns {Object} Trading performance metrics
   */
  analyzeTradePerformance(trades) {
    if (!trades || trades.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }
    
    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit < 0);
    
    const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const totalProfit = grossProfit - grossLoss;
    
    // Win/Loss Ratio
    const winRate = (wins.length / trades.length) * 100;
    
    // Profit Factor
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    // Average Win vs Average Loss
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    
    // Streak Analysis
    const streakAnalysis = this.analyzeStreaks(trades);
    
    // Contract-type performance
    const contractTypePerformance = this.analyzeByContractType(trades);
    
    // Market performance
    const marketPerformance = this.analyzeByMarket(trades);
    
    return {
      totalTrades: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate,
      grossProfit,
      grossLoss,
      totalProfit,
      profitFactor,
      avgWin,
      avgLoss,
      riskRewardRatio,
      bestTrade: Math.max(...trades.map(t => t.profit)),
      worstTrade: Math.min(...trades.map(t => t.profit)),
      avgProfit: totalProfit / trades.length,
      ...streakAnalysis,
      contractTypePerformance,
      marketPerformance
    };
  }
  
  getEmptyPerformanceMetrics() {
    return {
      totalTrades: 0, winCount: 0, lossCount: 0, winRate: 0,
      grossProfit: 0, grossLoss: 0, totalProfit: 0, profitFactor: 0,
      avgWin: 0, avgLoss: 0, riskRewardRatio: 0, bestTrade: 0, worstTrade: 0,
      avgProfit: 0, winStreak: 0, lossStreak: 0, currentStreak: 0,
      currentStreakType: 'none', contractTypePerformance: {}, marketPerformance: {}
    };
  }
  
  analyzeStreaks(trades) {
    let currentWinStreak = 0, maxWinStreak = 0;
    let currentLossStreak = 0, maxLossStreak = 0;
    let currentStreak = 0, currentStreakType = 'none';
    
    trades.forEach(t => {
      if (t.profit > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        currentStreak = currentWinStreak;
        currentStreakType = 'win';
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        currentStreak = currentLossStreak;
        currentStreakType = 'loss';
      }
    });
    
    return { winStreak: maxWinStreak, lossStreak: maxLossStreak, currentStreak, currentStreakType };
  }
  
  analyzeByContractType(trades) {
    const byType = {};
    trades.forEach(t => {
      const type = this.extractContractType(t.shortcode) || 'Unknown';
      if (!byType[type]) byType[type] = { wins: 0, losses: 0, profit: 0, trades: 0 };
      byType[type].trades++;
      byType[type].profit += t.profit;
      if (t.profit > 0) byType[type].wins++;
      else byType[type].losses++;
    });
    
    // Calculate win rate for each type
    Object.keys(byType).forEach(type => {
      byType[type].winRate = byType[type].trades > 0 
        ? (byType[type].wins / byType[type].trades) * 100 
        : 0;
    });
    
    return byType;
  }
  
  extractContractType(shortcode) {
    if (!shortcode) return 'Unknown';
    const code = shortcode.toUpperCase();
    if (code.includes('CALL') || code.includes('PUT')) return 'Rise/Fall';
    if (code.includes('DIGIT')) return 'Digits';
    if (code.includes('TOUCH')) return 'Touch/No Touch';
    if (code.includes('ASIAN')) return 'Asians';
    if (code.includes('MULT')) return 'Multipliers';
    if (code.includes('TICK')) return 'Tick Trades';
    return 'Other';
  }
  
  analyzeByMarket(trades) {
    const byMarket = {};
    trades.forEach(t => {
      const market = t.symbol || t.underlying || 'Unknown';
      if (!byMarket[market]) byMarket[market] = { wins: 0, losses: 0, profit: 0, trades: 0 };
      byMarket[market].trades++;
      byMarket[market].profit += t.profit;
      if (t.profit > 0) byMarket[market].wins++;
      else byMarket[market].losses++;
    });
    
    Object.keys(byMarket).forEach(market => {
      byMarket[market].winRate = byMarket[market].trades > 0 
        ? (byMarket[market].wins / byMarket[market].trades) * 100 
        : 0;
    });
    
    return byMarket;
  }
  
  // ========== 3. RISK MANAGEMENT ANALYSIS ==========
  
  /**
   * Analyze risk management behavior
   * @param {Array} trades - Trade history
   * @param {number} accountBalance - Current account balance
   * @returns {Object} Risk analysis
   */
  analyzeRiskManagement(trades, accountBalance) {
    if (!trades || trades.length === 0) {
      return this.getEmptyRiskMetrics();
    }
    
    const stakes = trades.map(t => t.buy_price || 0);
    
    // Stake Size Volatility
    const avgStake = stakes.reduce((a, b) => a + b, 0) / stakes.length;
    const stakeVolatility = this.calculateStandardDeviation(stakes);
    const stakeVolatilityRatio = avgStake > 0 ? stakeVolatility / avgStake : 0;
    
    // % of Balance Per Trade (estimated from stakes)
    const riskPercentages = stakes.map(s => accountBalance > 0 ? (s / accountBalance) * 100 : 0);
    const avgRiskPercent = riskPercentages.reduce((a, b) => a + b, 0) / riskPercentages.length;
    const maxRiskPercent = Math.max(...riskPercentages);
    
    // Drawdown Tracking
    const drawdownAnalysis = this.calculateDrawdown(trades);
    
    // Stake change detection (sudden spikes)
    const stakeSpikeCount = this.detectStakeSpikes(stakes, avgStake);
    
    // Risk behavior classification
    const riskBehavior = this.classifyRiskBehavior({
      avgRiskPercent,
      maxRiskPercent,
      stakeVolatilityRatio,
      stakeSpikeCount
    });
    
    return {
      avgStake,
      stakeVolatility,
      stakeVolatilityRatio,
      avgRiskPercent,
      maxRiskPercent,
      stakeSpikeCount,
      riskBehavior,
      ...drawdownAnalysis
    };
  }
  
  getEmptyRiskMetrics() {
    return {
      avgStake: 0, stakeVolatility: 0, stakeVolatilityRatio: 0,
      avgRiskPercent: 0, maxRiskPercent: 0, stakeSpikeCount: 0,
      riskBehavior: 'unknown', maxDrawdown: 0, avgDrawdown: 0,
      currentDrawdown: 0, drawdownRecoverySpeed: 0
    };
  }
  
  calculateDrawdown(trades) {
    let peak = 0;
    let cumulative = 0;
    let maxDrawdown = 0;
    const drawdowns = [];
    
    trades.forEach(t => {
      cumulative += t.profit;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      drawdowns.push(drawdown);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    const avgDrawdown = drawdowns.length > 0 
      ? drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length 
      : 0;
    
    const currentDrawdown = drawdowns.length > 0 ? drawdowns[drawdowns.length - 1] : 0;
    
    // Recovery speed (how many trades to recover from drawdown)
    let recoveryTrades = 0;
    let inDrawdown = false;
    let drawdownRecoveries = [];
    let currentRecoveryCount = 0;
    
    drawdowns.forEach((dd, i) => {
      if (dd > 5 && !inDrawdown) {
        inDrawdown = true;
        currentRecoveryCount = 0;
      } else if (dd < 1 && inDrawdown) {
        drawdownRecoveries.push(currentRecoveryCount);
        inDrawdown = false;
      } else if (inDrawdown) {
        currentRecoveryCount++;
      }
    });
    
    const drawdownRecoverySpeed = drawdownRecoveries.length > 0
      ? drawdownRecoveries.reduce((a, b) => a + b, 0) / drawdownRecoveries.length
      : 0;
    
    return { maxDrawdown, avgDrawdown, currentDrawdown, drawdownRecoverySpeed };
  }
  
  detectStakeSpikes(stakes, avgStake) {
    let spikeCount = 0;
    const threshold = avgStake * 2; // Spike = 2x average
    
    for (let i = 1; i < stakes.length; i++) {
      if (stakes[i] > threshold && stakes[i] > stakes[i-1] * 1.5) {
        spikeCount++;
      }
    }
    
    return spikeCount;
  }
  
  classifyRiskBehavior({ avgRiskPercent, maxRiskPercent, stakeVolatilityRatio, stakeSpikeCount }) {
    if (avgRiskPercent > 20 || maxRiskPercent > 50) return 'reckless';
    if (avgRiskPercent > 10 || stakeSpikeCount > 5) return 'high_risk';
    if (stakeVolatilityRatio > 0.5) return 'inconsistent';
    if (avgRiskPercent <= 2 && stakeVolatilityRatio < 0.3) return 'conservative';
    return 'moderate';
  }
  
  // ========== 4. TIME-BASED BEHAVIOR ANALYSIS ==========
  
  /**
   * Analyze trading patterns by time
   * @param {Array} trades - Trade history
   * @returns {Object} Time-based analysis
   */
  analyzeTimePatterns(trades) {
    if (!trades || trades.length === 0) {
      return this.getEmptyTimePatterns();
    }
    
    const byHour = {};
    const byDayOfWeek = {};
    const bySession = { morning: { wins: 0, losses: 0, profit: 0 }, 
                        afternoon: { wins: 0, losses: 0, profit: 0 },
                        evening: { wins: 0, losses: 0, profit: 0 },
                        night: { wins: 0, losses: 0, profit: 0 } };
    
    trades.forEach(t => {
      const date = new Date(t.purchase_time * 1000);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      // By hour
      if (!byHour[hour]) byHour[hour] = { wins: 0, losses: 0, profit: 0, trades: 0 };
      byHour[hour].trades++;
      byHour[hour].profit += t.profit;
      if (t.profit > 0) byHour[hour].wins++;
      else byHour[hour].losses++;
      
      // By day of week
      if (!byDayOfWeek[dayOfWeek]) byDayOfWeek[dayOfWeek] = { wins: 0, losses: 0, profit: 0, trades: 0 };
      byDayOfWeek[dayOfWeek].trades++;
      byDayOfWeek[dayOfWeek].profit += t.profit;
      if (t.profit > 0) byDayOfWeek[dayOfWeek].wins++;
      else byDayOfWeek[dayOfWeek].losses++;
      
      // By session
      const session = hour >= 6 && hour < 12 ? 'morning' :
                      hour >= 12 && hour < 17 ? 'afternoon' :
                      hour >= 17 && hour < 22 ? 'evening' : 'night';
      bySession[session].profit += t.profit;
      if (t.profit > 0) bySession[session].wins++;
      else bySession[session].losses++;
    });
    
    // Calculate win rates
    Object.keys(byHour).forEach(h => {
      byHour[h].winRate = byHour[h].trades > 0 ? (byHour[h].wins / byHour[h].trades) * 100 : 0;
    });
    Object.keys(byDayOfWeek).forEach(d => {
      byDayOfWeek[d].winRate = byDayOfWeek[d].trades > 0 ? (byDayOfWeek[d].wins / byDayOfWeek[d].trades) * 100 : 0;
    });
    Object.keys(bySession).forEach(s => {
      const total = bySession[s].wins + bySession[s].losses;
      bySession[s].winRate = total > 0 ? (bySession[s].wins / total) * 100 : 0;
    });
    
    // Find best and worst hours
    const hourEntries = Object.entries(byHour);
    const bestHour = hourEntries.length > 0 
      ? hourEntries.reduce((best, curr) => curr[1].profit > best[1].profit ? curr : best)
      : null;
    const worstHour = hourEntries.length > 0
      ? hourEntries.reduce((worst, curr) => curr[1].profit < worst[1].profit ? curr : worst)
      : null;
    
    // Dangerous hours (high loss rate, specifically night trading)
    const dangerousHours = Object.entries(byHour)
      .filter(([h, data]) => data.winRate < 40 && data.trades >= 3)
      .map(([h]) => parseInt(h));
    
    return {
      byHour,
      byDayOfWeek,
      bySession,
      bestHour: bestHour ? { hour: parseInt(bestHour[0]), ...bestHour[1] } : null,
      worstHour: worstHour ? { hour: parseInt(worstHour[0]), ...worstHour[1] } : null,
      dangerousHours,
      nightTradingLossRate: bySession.night.wins + bySession.night.losses > 0
        ? (bySession.night.losses / (bySession.night.wins + bySession.night.losses)) * 100
        : 0
    };
  }
  
  getEmptyTimePatterns() {
    return {
      byHour: {}, byDayOfWeek: {}, bySession: {},
      bestHour: null, worstHour: null, dangerousHours: [], nightTradingLossRate: 0
    };
  }
  
  // ========== 5. EMOTIONAL TRADING ANALYTICS (AI-DRIVEN) ==========
  
  /**
   * AI-driven emotional trading analysis
   * @param {Array} trades - Trade history with timestamps
   * @param {Object} financialFlow - Deposit/withdrawal analysis
   * @returns {Object} Emotional trading analysis
   */
  analyzeEmotionalTrading(trades, financialFlow = {}) {
    if (!trades || trades.length === 0) {
      return this.getEmptyEmotionalAnalysis();
    }
    
    const emotionalIndicators = {
      revengeTradingDetected: false,
      revengeTradingInstances: 0,
      overtradingDetected: false,
      overtradingInstances: 0,
      fomoTradingDetected: false,
      fomoInstances: 0,
      fearBasedExitsDetected: false,
      fearExitInstances: 0
    };
    
    // 5.1 Revenge Trading Detection
    const revengeAnalysis = this.detectRevengeTrading(trades);
    emotionalIndicators.revengeTradingDetected = revengeAnalysis.detected;
    emotionalIndicators.revengeTradingInstances = revengeAnalysis.instances;
    emotionalIndicators.revengePatterns = revengeAnalysis.patterns;
    
    // 5.2 Overtrading Detection
    const overtradingAnalysis = this.detectOvertrading(trades);
    emotionalIndicators.overtradingDetected = overtradingAnalysis.detected;
    emotionalIndicators.overtradingInstances = overtradingAnalysis.instances;
    emotionalIndicators.avgTradesPerSession = overtradingAnalysis.avgTradesPerSession;
    
    // 5.3 FOMO Trading Detection
    const fomoAnalysis = this.detectFOMOTrading(trades);
    emotionalIndicators.fomoTradingDetected = fomoAnalysis.detected;
    emotionalIndicators.fomoInstances = fomoAnalysis.instances;
    
    // 5.4 Fear-Based Exit Detection
    const fearAnalysis = this.detectFearBasedExits(trades);
    emotionalIndicators.fearBasedExitsDetected = fearAnalysis.detected;
    emotionalIndicators.fearExitInstances = fearAnalysis.instances;
    emotionalIndicators.avgWinHoldTime = fearAnalysis.avgWinHoldTime;
    emotionalIndicators.avgLossHoldTime = fearAnalysis.avgLossHoldTime;
    
    // 5.5 Emotional Score (0-100)
    const emotionalScore = this.calculateEmotionalScore({
      ...emotionalIndicators,
      trades,
      financialFlow
    });
    
    return {
      ...emotionalIndicators,
      emotionalScore,
      emotionalStability: this.classifyEmotionalStability(emotionalScore),
      majorFactors: this.identifyMajorEmotionalFactors(emotionalIndicators, trades)
    };
  }
  
  getEmptyEmotionalAnalysis() {
    return {
      revengeTradingDetected: false, revengeTradingInstances: 0, revengePatterns: [],
      overtradingDetected: false, overtradingInstances: 0, avgTradesPerSession: 0,
      fomoTradingDetected: false, fomoInstances: 0,
      fearBasedExitsDetected: false, fearExitInstances: 0,
      avgWinHoldTime: 0, avgLossHoldTime: 0,
      emotionalScore: 50, emotionalStability: 'unknown', majorFactors: []
    };
  }
  
  detectRevengeTrading(trades) {
    let instances = 0;
    const patterns = [];
    
    for (let i = 1; i < trades.length; i++) {
      const prevTrade = trades[i - 1];
      const currTrade = trades[i];
      
      // Check if previous trade was a loss
      if (prevTrade.profit < 0) {
        const timeDiff = (currTrade.purchase_time - prevTrade.sell_time) * 1000; // ms
        const stakeIncrease = currTrade.buy_price > prevTrade.buy_price * 1.3; // 30% increase
        const quickReentry = timeDiff < 60000; // Within 1 minute
        
        if (stakeIncrease && quickReentry) {
          instances++;
          patterns.push({
            index: i,
            previousLoss: prevTrade.profit,
            stakeIncrease: ((currTrade.buy_price - prevTrade.buy_price) / prevTrade.buy_price) * 100,
            timeBetween: timeDiff / 1000
          });
        }
      }
    }
    
    return {
      detected: instances >= 2,
      instances,
      patterns
    };
  }
  
  detectOvertrading(trades) {
    // Group trades by session (1-hour windows)
    const sessions = {};
    trades.forEach(t => {
      const sessionKey = Math.floor(t.purchase_time / 3600); // Hour bucket
      if (!sessions[sessionKey]) sessions[sessionKey] = [];
      sessions[sessionKey].push(t);
    });
    
    const sessionCounts = Object.values(sessions).map(s => s.length);
    const avgTradesPerSession = sessionCounts.length > 0
      ? sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length
      : 0;
    
    // Overtrading = more than 10 trades in an hour, multiple times
    const overtradingInstances = sessionCounts.filter(c => c > 10).length;
    
    return {
      detected: overtradingInstances >= 2 || avgTradesPerSession > 8,
      instances: overtradingInstances,
      avgTradesPerSession
    };
  }
  
  detectFOMOTrading(trades) {
    let instances = 0;
    
    // FOMO indicators:
    // 1. Very short trade duration (under 30 seconds for tick trades)
    // 2. Trades placed in rapid succession without analysis time
    // 3. High-risk contract types during volatile periods
    
    for (let i = 1; i < trades.length; i++) {
      const prevTrade = trades[i - 1];
      const currTrade = trades[i];
      
      const timeBetween = (currTrade.purchase_time - prevTrade.sell_time);
      const veryQuick = timeBetween < 5; // Less than 5 seconds between trades
      
      if (veryQuick && currTrade.buy_price > prevTrade.buy_price) {
        instances++;
      }
    }
    
    return {
      detected: instances >= 3,
      instances
    };
  }
  
  detectFearBasedExits(trades) {
    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit < 0);
    
    // Calculate hold times
    const winHoldTimes = wins.map(t => t.sell_time - t.purchase_time);
    const lossHoldTimes = losses.map(t => t.sell_time - t.purchase_time);
    
    const avgWinHoldTime = winHoldTimes.length > 0
      ? winHoldTimes.reduce((a, b) => a + b, 0) / winHoldTimes.length
      : 0;
    const avgLossHoldTime = lossHoldTimes.length > 0
      ? lossHoldTimes.reduce((a, b) => a + b, 0) / lossHoldTimes.length
      : 0;
    
    // Fear-based exits: Cutting winners too early (hold time much shorter than losers)
    // AND small average wins but larger losses
    const avgWinAmount = wins.length > 0 ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0;
    const avgLossAmount = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.profit, 0) / losses.length) : 0;
    
    const fearBased = avgWinHoldTime < avgLossHoldTime * 0.5 && avgWinAmount < avgLossAmount * 0.5;
    
    return {
      detected: fearBased,
      instances: fearBased ? wins.filter(w => (w.sell_time - w.purchase_time) < avgWinHoldTime * 0.3).length : 0,
      avgWinHoldTime,
      avgLossHoldTime
    };
  }
  
  calculateEmotionalScore(data) {
    let score = 100; // Start with perfect score, deduct for issues
    
    // Revenge trading (-25 max)
    score -= Math.min(25, data.revengeTradingInstances * 8);
    
    // Overtrading (-20 max)
    score -= Math.min(20, data.overtradingInstances * 5);
    if (data.avgTradesPerSession > 15) score -= 10;
    
    // FOMO (-15 max)
    score -= Math.min(15, data.fomoInstances * 3);
    
    // Fear-based exits (-15 max)
    if (data.fearBasedExitsDetected) score -= 15;
    
    // Stake volatility indicator (from trades)
    if (data.trades && data.trades.length > 5) {
      const stakes = data.trades.map(t => t.buy_price);
      const avgStake = stakes.reduce((a, b) => a + b, 0) / stakes.length;
      const stakeVolatility = this.calculateStandardDeviation(stakes) / avgStake;
      if (stakeVolatility > 0.5) score -= 10;
    }
    
    // Late night trading penalty
    if (data.trades) {
      const nightTrades = data.trades.filter(t => {
        const hour = new Date(t.purchase_time * 1000).getHours();
        return hour >= 22 || hour < 6;
      });
      if (nightTrades.length > data.trades.length * 0.3) score -= 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  classifyEmotionalStability(score) {
    if (score >= 80) return 'stable';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'unstable';
    return 'critical';
  }
  
  identifyMajorEmotionalFactors(indicators, trades) {
    const factors = [];
    
    if (indicators.revengeTradingInstances > 2) {
      factors.push('Stake increases after losses (revenge trading)');
    }
    if (indicators.overtradingDetected) {
      factors.push('Too many trades in short periods (overtrading)');
    }
    if (indicators.fomoInstances > 3) {
      factors.push('Rapid entries without analysis (FOMO)');
    }
    if (indicators.fearBasedExitsDetected) {
      factors.push('Cutting winners early, holding losers (fear-based)');
    }
    
    // Check for late-night trading
    if (trades && trades.length > 0) {
      const nightTrades = trades.filter(t => {
        const hour = new Date(t.purchase_time * 1000).getHours();
        return hour >= 22 || hour < 6;
      });
      if (nightTrades.length > trades.length * 0.25) {
        factors.push('Significant late-night trading activity');
      }
    }
    
    return factors;
  }
  
  // ========== 6. ACCOUNT HEALTH SCORE ==========
  
  /**
   * Calculate overall account health score (0-100)
   * @param {Object} params - All analytics data
   * @returns {Object} Account health analysis
   */
  calculateAccountHealth({
    tradePerformance,
    riskAnalysis,
    emotionalAnalysis,
    financialFlow,
    timePatterns
  }) {
    const weights = {
      winRate: 0.15,
      profitFactor: 0.15,
      drawdown: 0.15,
      riskPercent: 0.10,
      emotionalScore: 0.20,
      fundingStability: 0.10,
      consistency: 0.15
    };
    
    let score = 0;
    const breakdown = {};
    
    // Win Rate component (0-100)
    const winRateScore = Math.min(100, (tradePerformance?.winRate || 0) * 1.5);
    score += winRateScore * weights.winRate;
    breakdown.winRate = { score: winRateScore, weight: weights.winRate };
    
    // Profit Factor component (0-100)
    const pfScore = Math.min(100, ((tradePerformance?.profitFactor || 0) / 2) * 100);
    score += pfScore * weights.profitFactor;
    breakdown.profitFactor = { score: pfScore, weight: weights.profitFactor };
    
    // Drawdown component (inverse - lower is better)
    const ddScore = Math.max(0, 100 - (riskAnalysis?.maxDrawdown || 0) * 2);
    score += ddScore * weights.drawdown;
    breakdown.drawdown = { score: ddScore, weight: weights.drawdown };
    
    // Risk % component (inverse - lower is better)
    const riskScore = Math.max(0, 100 - (riskAnalysis?.avgRiskPercent || 0) * 5);
    score += riskScore * weights.riskPercent;
    breakdown.riskPercent = { score: riskScore, weight: weights.riskPercent };
    
    // Emotional Score component
    const emotionScore = emotionalAnalysis?.emotionalScore || 50;
    score += emotionScore * weights.emotionalScore;
    breakdown.emotionalScore = { score: emotionScore, weight: weights.emotionalScore };
    
    // Funding Stability component
    const fundingScore = financialFlow?.fundingStabilityScore || 50;
    score += fundingScore * weights.fundingStability;
    breakdown.fundingStability = { score: fundingScore, weight: weights.fundingStability };
    
    // Consistency component (based on stake volatility)
    const consistencyScore = Math.max(0, 100 - (riskAnalysis?.stakeVolatilityRatio || 0) * 100);
    score += consistencyScore * weights.consistency;
    breakdown.consistency = { score: consistencyScore, weight: weights.consistency };
    
    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    
    if (winRateScore >= 70) strengths.push('Good win rate');
    else if (winRateScore < 40) weaknesses.push('Low win rate');
    
    if (pfScore >= 70) strengths.push('Strong profit factor');
    else if (pfScore < 30) weaknesses.push('Poor profit factor');
    
    if (ddScore >= 70) strengths.push('Well-controlled drawdown');
    else if (ddScore < 40) weaknesses.push('High drawdown');
    
    if (riskScore >= 70) strengths.push('Conservative risk management');
    else if (riskScore < 40) weaknesses.push('Excessive risk per trade');
    
    if (emotionScore >= 70) strengths.push('Emotional discipline');
    else if (emotionScore < 40) weaknesses.push('Emotional trading issues');
    
    if (fundingScore >= 70) strengths.push('Deposit discipline');
    else if (fundingScore < 40) weaknesses.push('Erratic funding behavior');
    
    if (consistencyScore >= 70) strengths.push('Consistent position sizing');
    else if (consistencyScore < 40) weaknesses.push('Inconsistent stake sizes');
    
    // Night trading check
    if (timePatterns?.nightTradingLossRate > 60) {
      weaknesses.push('High loss rate during night trading');
    }
    
    return {
      score: Math.round(score),
      grade: this.getHealthGrade(score),
      breakdown,
      strengths,
      weaknesses
    };
  }
  
  getHealthGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
  
  // ========== 7. AI-POWERED RECOMMENDATIONS ==========
  
  /**
   * Generate personalized AI recommendations
   * @param {Object} allAnalytics - Complete analytics data
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(allAnalytics) {
    const recommendations = [];
    const { tradePerformance, riskAnalysis, emotionalAnalysis, timePatterns, financialFlow } = allAnalytics;
    
    // Streak-based recommendations
    if (tradePerformance?.currentStreakType === 'loss' && tradePerformance?.currentStreak >= 3) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `You're on a ${tradePerformance.currentStreak}-loss streak. Consider taking a break before your next trade.`,
        action: 'Stop trading after 3 consecutive losses'
      });
    }
    
    // Contract type recommendations
    if (tradePerformance?.contractTypePerformance) {
      const types = Object.entries(tradePerformance.contractTypePerformance);
      const bestType = types.reduce((best, curr) => 
        curr[1].winRate > (best?.[1]?.winRate || 0) ? curr : best, null);
      const worstType = types.reduce((worst, curr) => 
        curr[1].winRate < (worst?.[1]?.winRate || 100) && curr[1].trades >= 5 ? curr : worst, null);
      
      if (bestType && bestType[1].winRate > 60) {
        recommendations.push({
          type: 'insight',
          priority: 'medium',
          message: `Your win rate is highest with ${bestType[0]} (${bestType[1].winRate.toFixed(1)}%). Focus more on this contract type.`,
          action: `Prioritize ${bestType[0]} trades`
        });
      }
      
      if (worstType && worstType[1].winRate < 40) {
        recommendations.push({
          type: 'warning',
          priority: 'medium',
          message: `Avoid ${worstType[0]} contracts. Your win rate is only ${worstType[1].winRate.toFixed(1)}%.`,
          action: `Reduce or eliminate ${worstType[0]} trades`
        });
      }
    }
    
    // Time-based recommendations
    if (timePatterns?.dangerousHours?.length > 0) {
      const hours = timePatterns.dangerousHours.map(h => `${h}:00`).join(', ');
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `You have poor performance during: ${hours}. Consider avoiding trading during these hours.`,
        action: 'Adjust trading schedule'
      });
    }
    
    if (timePatterns?.nightTradingLossRate > 60) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `You lose ${timePatterns.nightTradingLossRate.toFixed(0)}% of trades at night (10PM-6AM). Fatigue may be affecting your decisions.`,
        action: 'Reduce stake size or avoid night trading'
      });
    }
    
    // Emotional recommendations
    if (emotionalAnalysis?.revengeTradingDetected) {
      recommendations.push({
        type: 'critical',
        priority: 'high',
        message: 'Revenge trading detected: You increase stakes immediately after losses.',
        action: 'Implement a mandatory 5-minute break after any loss'
      });
    }
    
    if (emotionalAnalysis?.overtradingDetected) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `Overtrading detected: Average ${emotionalAnalysis.avgTradesPerSession?.toFixed(1)} trades per hour.`,
        action: 'Limit yourself to maximum 5 trades per hour'
      });
    }
    
    if (emotionalAnalysis?.fearBasedExitsDetected) {
      recommendations.push({
        type: 'insight',
        priority: 'medium',
        message: 'You tend to exit winning trades too early. Your avg win is smaller than your avg loss.',
        action: 'Hold winning trades longer to increase average profit'
      });
    }
    
    // Risk recommendations
    if (riskAnalysis?.avgRiskPercent > 10) {
      recommendations.push({
        type: 'critical',
        priority: 'high',
        message: `High risk: You're averaging ${riskAnalysis.avgRiskPercent.toFixed(1)}% of balance per trade.`,
        action: 'Reduce stake to 1-2% of account balance per trade'
      });
    }
    
    if (riskAnalysis?.maxDrawdown > 30) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `Your maximum drawdown is ${riskAnalysis.maxDrawdown.toFixed(1)}%. This indicates high risk exposure.`,
        action: 'Implement stricter stop-loss rules'
      });
    }
    
    // Profit factor recommendation
    if (tradePerformance?.profitFactor < 1 && tradePerformance?.totalTrades > 10) {
      recommendations.push({
        type: 'critical',
        priority: 'high',
        message: `Your profit factor is ${tradePerformance.profitFactor.toFixed(2)}. You're losing money long-term.`,
        action: 'Review and adjust your trading strategy immediately'
      });
    }
    
    // Win rate vs profit paradox
    if (tradePerformance?.winRate > 50 && tradePerformance?.totalProfit < 0) {
      recommendations.push({
        type: 'insight',
        priority: 'high',
        message: `Despite a ${tradePerformance.winRate.toFixed(1)}% win rate, you're still losing money. Your losses are larger than your wins.`,
        action: 'Cut losses quicker or hold winners longer'
      });
    }
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return recommendations;
  }
  
  // ========== UTILITY FUNCTIONS ==========
  
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
  
  // ========== MAIN ANALYSIS FUNCTION ==========
  
  /**
   * Run complete analytics on all data
   * @param {Object} data - { trades, statements, accountBalance }
   * @returns {Object} Complete analytics results
   */
  runFullAnalysis({ trades = [], statements = [], accountBalance = 0 }) {
    // 1. Financial Flow Analysis
    const financialFlow = this.analyzeFinancialFlow(statements);
    
    // 2. Trade Performance Analysis
    const tradePerformance = this.analyzeTradePerformance(trades);
    
    // 3. Risk Management Analysis
    const riskAnalysis = this.analyzeRiskManagement(trades, accountBalance);
    
    // 4. Time Pattern Analysis
    const timePatterns = this.analyzeTimePatterns(trades);
    
    // 5. Emotional Trading Analysis
    const emotionalAnalysis = this.analyzeEmotionalTrading(trades, financialFlow);
    
    // 6. Account Health Score
    const accountHealth = this.calculateAccountHealth({
      tradePerformance,
      riskAnalysis,
      emotionalAnalysis,
      financialFlow,
      timePatterns
    });
    
    // 7. AI Recommendations
    const recommendations = this.generateRecommendations({
      tradePerformance,
      riskAnalysis,
      emotionalAnalysis,
      timePatterns,
      financialFlow
    });
    
    return {
      financialFlow,
      tradePerformance,
      riskAnalysis,
      timePatterns,
      emotionalAnalysis,
      accountHealth,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;

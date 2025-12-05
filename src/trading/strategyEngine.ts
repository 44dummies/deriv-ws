/**
 * Strategy Engine - Core Trading Strategies
 * 
 * Analyzes last 100 ticks to generate trading signals
 * Each strategy returns confidence score (0-1)
 * Signals are aggregated for final decision
 */

import {
  TickData,
  DigitStats,
  StrategySignal,
  StrategyName,
  AggregatedSignal,
  StrategyConfig,
  CONFIDENCE_THRESHOLD,
} from './types';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract digit statistics from tick buffer
 */
export function calculateDigitStats(ticks: TickData[]): DigitStats {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let evenCount = 0;
  let oddCount = 0;
  
  const digits = ticks.map(t => t.digit);
  
  digits.forEach(d => {
    counts[d]++;
    if (d % 2 === 0) evenCount++;
    else oddCount++;
  });
  
  // Calculate streaks
  let evenStreak = 0;
  let oddStreak = 0;
  let risingStreak = 0;
  let fallingStreak = 0;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] % 2 === 0) {
      if (evenStreak === digits.length - 1 - i) evenStreak++;
      else break;
    }
  }
  
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] % 2 === 1) {
      if (oddStreak === digits.length - 1 - i) oddStreak++;
      else break;
    }
  }
  
  for (let i = digits.length - 1; i > 0; i--) {
    if (digits[i] > digits[i - 1]) {
      risingStreak++;
    } else break;
  }
  
  for (let i = digits.length - 1; i > 0; i--) {
    if (digits[i] < digits[i - 1]) {
      fallingStreak++;
    } else break;
  }
  
  return {
    counts,
    evenCount,
    oddCount,
    lastNDigits: digits.slice(-20), // Last 20 for pattern matching
    streaks: { even: evenStreak, odd: oddStreak, rising: risingStreak, falling: fallingStreak },
  };
}

/**
 * Get transition probabilities between digits
 */
function getTransitionMatrix(digits: number[]): number[][] {
  const matrix: number[][] = Array(10).fill(null).map(() => Array(10).fill(0));
  const fromCounts: number[] = Array(10).fill(0);
  
  for (let i = 0; i < digits.length - 1; i++) {
    const from = digits[i];
    const to = digits[i + 1];
    matrix[from][to]++;
    fromCounts[from]++;
  }
  
  // Convert to probabilities
  for (let i = 0; i < 10; i++) {
    if (fromCounts[i] > 0) {
      for (let j = 0; j < 10; j++) {
        matrix[i][j] /= fromCounts[i];
      }
    }
  }
  
  return matrix;
}

// ============================================
// STRATEGY IMPLEMENTATIONS
// ============================================

/**
 * DFPM - Digit Frequency Pattern Matcher
 * Analyzes digit frequency distribution and identifies underrepresented digits
 */
export function strategyDFPM(ticks: TickData[]): StrategySignal {
  const stats = calculateDigitStats(ticks);
  const expectedFreq = ticks.length / 10;
  
  // Find most overdue digits
  let mostOverdue = 0;
  let lowestCount = Infinity;
  
  for (let d = 0; d <= 9; d++) {
    if (stats.counts[d] < lowestCount) {
      lowestCount = stats.counts[d];
      mostOverdue = d;
    }
  }
  
  // Calculate deviation from expected
  const deviation = (expectedFreq - lowestCount) / expectedFreq;
  const confidence = Math.min(0.95, Math.max(0, deviation * 0.8));
  
  // For Even/Odd based on overdue digit
  const direction = mostOverdue % 2 === 0 ? 'EVEN' : 'ODD';
  
  return {
    strategy: 'DFPM',
    direction,
    confidence,
    timestamp: Date.now(),
    reasoning: `Digit ${mostOverdue} is ${((expectedFreq - lowestCount) / expectedFreq * 100).toFixed(1)}% underrepresented`,
  };
}

/**
 * VCS - Velocity-Crossover Strategy
 * Analyzes rate of change in digit values
 */
export function strategyVCS(ticks: TickData[]): StrategySignal {
  if (ticks.length < 20) {
    return { strategy: 'VCS', direction: 'CALL', confidence: 0, timestamp: Date.now(), reasoning: 'Insufficient data' };
  }
  
  const digits = ticks.map(t => t.digit);
  
  // Calculate short-term and long-term moving averages of digits
  const shortWindow = 5;
  const longWindow = 20;
  
  const shortMA = digits.slice(-shortWindow).reduce((a, b) => a + b, 0) / shortWindow;
  const longMA = digits.slice(-longWindow).reduce((a, b) => a + b, 0) / longWindow;
  
  // Previous MAs
  const prevShortMA = digits.slice(-(shortWindow + 1), -1).reduce((a, b) => a + b, 0) / shortWindow;
  const prevLongMA = digits.slice(-(longWindow + 1), -1).reduce((a, b) => a + b, 0) / longWindow;
  
  // Detect crossover
  const currentDiff = shortMA - longMA;
  const prevDiff = prevShortMA - prevLongMA;
  
  let direction: 'CALL' | 'PUT' | 'EVEN' | 'ODD';
  let confidence: number;
  let reasoning: string;
  
  if (prevDiff <= 0 && currentDiff > 0) {
    // Bullish crossover - digits trending up
    direction = 'CALL';
    confidence = Math.min(0.9, Math.abs(currentDiff) / 3);
    reasoning = `Bullish crossover: Short MA (${shortMA.toFixed(2)}) crossed above Long MA (${longMA.toFixed(2)})`;
  } else if (prevDiff >= 0 && currentDiff < 0) {
    // Bearish crossover - digits trending down
    direction = 'PUT';
    confidence = Math.min(0.9, Math.abs(currentDiff) / 3);
    reasoning = `Bearish crossover: Short MA (${shortMA.toFixed(2)}) crossed below Long MA (${longMA.toFixed(2)})`;
  } else {
    // No crossover - use current trend
    direction = currentDiff > 0 ? 'CALL' : 'PUT';
    confidence = Math.min(0.6, Math.abs(currentDiff) / 5);
    reasoning = `Trend continuation: ${direction === 'CALL' ? 'Upward' : 'Downward'} momentum`;
  }
  
  return { strategy: 'VCS', direction, confidence, timestamp: Date.now(), reasoning };
}

/**
 * DER - Digit Even/Odd Ratio
 * Analyzes even/odd distribution and predicts correction
 */
export function strategyDER(ticks: TickData[]): StrategySignal {
  const stats = calculateDigitStats(ticks);
  const total = stats.evenCount + stats.oddCount;
  
  const evenRatio = stats.evenCount / total;
  const oddRatio = stats.oddCount / total;
  
  // Expected is 50/50
  const deviation = Math.abs(evenRatio - 0.5);
  
  let direction: 'EVEN' | 'ODD';
  let reasoning: string;
  
  if (evenRatio > 0.5) {
    // More evens than expected - predict odd
    direction = 'ODD';
    reasoning = `Even ratio ${(evenRatio * 100).toFixed(1)}% - expecting correction to ODD`;
  } else {
    // More odds than expected - predict even
    direction = 'EVEN';
    reasoning = `Odd ratio ${(oddRatio * 100).toFixed(1)}% - expecting correction to EVEN`;
  }
  
  // Confidence based on deviation
  const confidence = Math.min(0.85, deviation * 2);
  
  return { strategy: 'DER', direction, confidence, timestamp: Date.now(), reasoning };
}

/**
 * TPC - Trend Prediction by Clustering
 * Groups recent digits into clusters and predicts next cluster
 */
export function strategyTPC(ticks: TickData[]): StrategySignal {
  const digits = ticks.map(t => t.digit);
  
  // Define clusters: Low (0-3), Mid (4-6), High (7-9)
  const clusters = digits.map(d => {
    if (d <= 3) return 'low';
    if (d <= 6) return 'mid';
    return 'high';
  });
  
  // Count recent cluster distribution
  const recent = clusters.slice(-30);
  const clusterCounts = { low: 0, mid: 0, high: 0 };
  recent.forEach(c => clusterCounts[c]++);
  
  // Find underrepresented cluster
  const minCluster = Object.entries(clusterCounts).reduce((a, b) => a[1] < b[1] ? a : b)[0] as 'low' | 'mid' | 'high';
  
  // Map cluster to direction
  let direction: 'CALL' | 'PUT' | 'EVEN' | 'ODD';
  
  if (minCluster === 'low') {
    direction = 'PUT'; // Low digits correlate with falling prices
  } else if (minCluster === 'high') {
    direction = 'CALL'; // High digits correlate with rising prices
  } else {
    // Mid is neutral - use even/odd as fallback
    const lastDigit = digits[digits.length - 1];
    direction = lastDigit % 2 === 0 ? 'ODD' : 'EVEN';
  }
  
  const expectedCount = 30 / 3;
  const deviation = (expectedCount - clusterCounts[minCluster]) / expectedCount;
  const confidence = Math.min(0.8, deviation * 0.7);
  
  return {
    strategy: 'TPC',
    direction,
    confidence,
    timestamp: Date.now(),
    reasoning: `Cluster '${minCluster}' underrepresented (${clusterCounts[minCluster]}/30 vs expected 10)`,
  };
}

/**
 * DTP - Digit Transition Probability
 * Uses Markov chain to predict next digit based on transition probabilities
 */
export function strategyDTP(ticks: TickData[]): StrategySignal {
  const digits = ticks.map(t => t.digit);
  
  if (digits.length < 10) {
    return { strategy: 'DTP', direction: 'EVEN', confidence: 0, timestamp: Date.now(), reasoning: 'Insufficient data' };
  }
  
  const matrix = getTransitionMatrix(digits);
  const lastDigit = digits[digits.length - 1];
  
  // Get probabilities for next digit from last digit
  const probs = matrix[lastDigit];
  
  // Find most likely next digit
  let mostLikely = 0;
  let maxProb = 0;
  
  for (let d = 0; d <= 9; d++) {
    if (probs[d] > maxProb) {
      maxProb = probs[d];
      mostLikely = d;
    }
  }
  
  // Calculate even vs odd probability
  let evenProb = 0;
  let oddProb = 0;
  
  for (let d = 0; d <= 9; d++) {
    if (d % 2 === 0) evenProb += probs[d];
    else oddProb += probs[d];
  }
  
  const direction = evenProb > oddProb ? 'EVEN' : 'ODD';
  const confidence = Math.abs(evenProb - oddProb);
  
  return {
    strategy: 'DTP',
    direction,
    confidence: Math.min(0.9, confidence * 1.5),
    timestamp: Date.now(),
    reasoning: `From digit ${lastDigit}: Even prob ${(evenProb * 100).toFixed(1)}%, Odd prob ${(oddProb * 100).toFixed(1)}%`,
  };
}

/**
 * DPB - Digit Pattern Breakout
 * Detects when current pattern deviates from historical patterns
 */
export function strategyDPB(ticks: TickData[]): StrategySignal {
  const digits = ticks.map(t => t.digit);
  
  if (digits.length < 50) {
    return { strategy: 'DPB', direction: 'EVEN', confidence: 0, timestamp: Date.now(), reasoning: 'Insufficient data' };
  }
  
  // Look for repeating patterns
  const patternLengths = [3, 4, 5];
  let bestPatternMatch = 0;
  let predictedDirection: 'EVEN' | 'ODD' = 'EVEN';
  
  for (const len of patternLengths) {
    const recentPattern = digits.slice(-len);
    let matchCount = 0;
    let nextDigitSum = 0;
    let predictions = 0;
    
    // Search for this pattern in history
    for (let i = 0; i < digits.length - len - 1; i++) {
      const historicalPattern = digits.slice(i, i + len);
      if (JSON.stringify(historicalPattern) === JSON.stringify(recentPattern)) {
        matchCount++;
        nextDigitSum += digits[i + len];
        predictions++;
      }
    }
    
    if (matchCount > bestPatternMatch && predictions > 0) {
      bestPatternMatch = matchCount;
      const avgNextDigit = nextDigitSum / predictions;
      predictedDirection = Math.round(avgNextDigit) % 2 === 0 ? 'EVEN' : 'ODD';
    }
  }
  
  const confidence = Math.min(0.85, bestPatternMatch / 10);
  
  return {
    strategy: 'DPB',
    direction: predictedDirection,
    confidence,
    timestamp: Date.now(),
    reasoning: `Found ${bestPatternMatch} historical pattern matches`,
  };
}

/**
 * MTD - Mean/Trend Divergence
 * Detects divergence between mean reversion and trend following
 */
export function strategyMTD(ticks: TickData[]): StrategySignal {
  const digits = ticks.map(t => t.digit);
  
  if (digits.length < 30) {
    return { strategy: 'MTD', direction: 'EVEN', confidence: 0, timestamp: Date.now(), reasoning: 'Insufficient data' };
  }
  
  // Calculate mean
  const mean = digits.reduce((a, b) => a + b, 0) / digits.length;
  
  // Recent trend (last 10)
  const recent = digits.slice(-10);
  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  
  // Trend direction
  const trendUp = recent[recent.length - 1] > recent[0];
  
  // Divergence: mean reversion vs trend continuation
  const distanceFromMean = recentMean - mean;
  
  let direction: 'CALL' | 'PUT';
  let confidence: number;
  let reasoning: string;
  
  if (Math.abs(distanceFromMean) > 1.5) {
    // Mean reversion expected
    direction = distanceFromMean > 0 ? 'PUT' : 'CALL';
    confidence = Math.min(0.8, Math.abs(distanceFromMean) / 3);
    reasoning = `Mean reversion: Recent avg (${recentMean.toFixed(1)}) deviates from mean (${mean.toFixed(1)})`;
  } else {
    // Trend continuation
    direction = trendUp ? 'CALL' : 'PUT';
    confidence = Math.min(0.6, 0.3 + (Math.abs(recent[recent.length - 1] - recent[0]) / 10));
    reasoning = `Trend continuation: ${trendUp ? 'Upward' : 'Downward'} momentum near mean`;
  }
  
  return { strategy: 'MTD', direction, confidence, timestamp: Date.now(), reasoning };
}

/**
 * RDS - Recent Digit Streak
 * Analyzes consecutive digit patterns (streaks)
 */
export function strategyRDS(ticks: TickData[]): StrategySignal {
  const stats = calculateDigitStats(ticks);
  const { streaks } = stats;
  
  let direction: 'EVEN' | 'ODD';
  let confidence: number;
  let reasoning: string;
  
  // Check for significant streaks
  if (streaks.even >= 4) {
    // Long even streak - expect odd
    direction = 'ODD';
    confidence = Math.min(0.9, 0.5 + (streaks.even * 0.1));
    reasoning = `Even streak of ${streaks.even} - expecting ODD break`;
  } else if (streaks.odd >= 4) {
    // Long odd streak - expect even
    direction = 'EVEN';
    confidence = Math.min(0.9, 0.5 + (streaks.odd * 0.1));
    reasoning = `Odd streak of ${streaks.odd} - expecting EVEN break`;
  } else {
    // No significant streak - use frequency
    const evenRatio = stats.evenCount / (stats.evenCount + stats.oddCount);
    direction = evenRatio > 0.5 ? 'ODD' : 'EVEN';
    confidence = Math.abs(evenRatio - 0.5) * 1.2;
    reasoning = `No significant streak - using frequency analysis`;
  }
  
  return { strategy: 'RDS', direction, confidence, timestamp: Date.now(), reasoning };
}

// ============================================
// STRATEGY AGGREGATOR
// ============================================

const DEFAULT_STRATEGY_CONFIGS: StrategyConfig[] = [
  { name: 'DFPM', enabled: true, weight: 1.0, parameters: {} },
  { name: 'VCS', enabled: true, weight: 0.8, parameters: {} },
  { name: 'DER', enabled: true, weight: 1.2, parameters: {} },
  { name: 'TPC', enabled: true, weight: 0.7, parameters: {} },
  { name: 'DTP', enabled: true, weight: 1.0, parameters: {} },
  { name: 'DPB', enabled: true, weight: 0.9, parameters: {} },
  { name: 'MTD', enabled: true, weight: 0.8, parameters: {} },
  { name: 'RDS', enabled: true, weight: 1.1, parameters: {} },
];

/**
 * Run all enabled strategies and get individual signals
 */
export function runAllStrategies(
  ticks: TickData[],
  configs: StrategyConfig[] = DEFAULT_STRATEGY_CONFIGS
): StrategySignal[] {
  const strategies: Record<StrategyName, (ticks: TickData[]) => StrategySignal> = {
    DFPM: strategyDFPM,
    VCS: strategyVCS,
    DER: strategyDER,
    TPC: strategyTPC,
    DTP: strategyDTP,
    DPB: strategyDPB,
    MTD: strategyMTD,
    RDS: strategyRDS,
  };
  
  const signals: StrategySignal[] = [];
  
  for (const config of configs) {
    if (config.enabled && strategies[config.name]) {
      const signal = strategies[config.name](ticks);
      signals.push(signal);
    }
  }
  
  return signals;
}

/**
 * Aggregate signals using weighted voting
 */
export function aggregateSignals(
  signals: StrategySignal[],
  configs: StrategyConfig[] = DEFAULT_STRATEGY_CONFIGS
): AggregatedSignal {
  if (signals.length === 0) {
    return {
      direction: null,
      confidence: 0,
      signals: [],
      shouldTrade: false,
      timestamp: Date.now(),
    };
  }
  
  // Create weight map
  const weights = new Map<StrategyName, number>();
  configs.forEach(c => weights.set(c.name, c.weight));
  
  // Group signals by direction type
  const evenOddVotes: { EVEN: number; ODD: number } = { EVEN: 0, ODD: 0 };
  const callPutVotes: { CALL: number; PUT: number } = { CALL: 0, PUT: 0 };
  
  let totalWeight = 0;
  
  for (const signal of signals) {
    const weight = weights.get(signal.strategy) || 1.0;
    const weightedConfidence = signal.confidence * weight;
    totalWeight += weight;
    
    if (signal.direction === 'EVEN' || signal.direction === 'ODD') {
      evenOddVotes[signal.direction] += weightedConfidence;
    } else if (signal.direction === 'CALL' || signal.direction === 'PUT') {
      callPutVotes[signal.direction] += weightedConfidence;
    }
  }
  
  // Determine winning direction
  let finalDirection: 'CALL' | 'PUT' | 'EVEN' | 'ODD' | null = null;
  let maxVote = 0;
  
  for (const [dir, vote] of Object.entries({ ...evenOddVotes, ...callPutVotes })) {
    if (vote > maxVote) {
      maxVote = vote;
      finalDirection = dir as 'CALL' | 'PUT' | 'EVEN' | 'ODD';
    }
  }
  
  // Calculate final confidence
  const totalVotes = evenOddVotes.EVEN + evenOddVotes.ODD + callPutVotes.CALL + callPutVotes.PUT;
  const confidence = totalVotes > 0 ? maxVote / totalVotes : 0;
  
  // Normalize confidence to 0-1 range
  const normalizedConfidence = Math.min(1, confidence);
  
  return {
    direction: finalDirection,
    confidence: normalizedConfidence,
    signals,
    shouldTrade: normalizedConfidence >= CONFIDENCE_THRESHOLD,
    timestamp: Date.now(),
  };
}

/**
 * Main entry point - analyze ticks and get trading signal
 */
export function analyzeTicksForSignal(
  ticks: TickData[],
  configs?: StrategyConfig[]
): AggregatedSignal {
  if (ticks.length < 20) {
    return {
      direction: null,
      confidence: 0,
      signals: [],
      shouldTrade: false,
      timestamp: Date.now(),
    };
  }
  
  const signals = runAllStrategies(ticks, configs);
  return aggregateSignals(signals, configs);
}

// ============================================
// EXPORTS
// ============================================

export { DEFAULT_STRATEGY_CONFIGS };

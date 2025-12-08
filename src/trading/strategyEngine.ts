/**
 * Strategy Engine - 8 Trading Strategies for Digit Analysis
 * 
 * Each strategy analyzes tick history and returns a trading signal
 * with contract type, prediction, and confidence level
 */

import { CONTRACT_TYPE, STRATEGY } from './constants';

// Tick type is used implicitly in function parameters

interface Signal {
  strategy: string;
  contractType: string;  // Union type would be too restrictive here
  prediction: number | null;
  confidence: number;
  reasoning: string;
}

interface GroupedSignal {
  contractType: string;
  prediction: number | null;
  signals: Signal[];
  total: number;
}

/**
 * Calculate digit statistics from tick array
 */
export function calculateDigitStats(ticks) {
  if (!ticks || ticks.length === 0) return null;

  const digits = ticks.map(t => {
    const priceStr = t.quote.toString();
    return parseInt(priceStr[priceStr.length - 1]);
  });

  const counts = new Array(10).fill(0);
  digits.forEach(d => counts[d]++);

  const frequencies = counts.map(c => c / digits.length);

  // Calculate streaks
  const streaks = {};
  let currentDigit = digits[0];
  let streak = 1;

  for (let i = 1; i < digits.length; i++) {
    if (digits[i] === currentDigit) {
      streak++;
    } else {
      streaks[currentDigit] = Math.max(streaks[currentDigit] || 0, streak);
      currentDigit = digits[i];
      streak = 1;
    }
  }
  streaks[currentDigit] = Math.max(streaks[currentDigit] || 0, streak);

  // Calculate transitions
  const transitions = {};
  for (let i = 0; i < digits.length - 1; i++) {
    const key = `${digits[i]}_${digits[i + 1]}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }

  return {
    digits,
    counts,
    frequencies,
    streaks,
    transitions,
    lastDigit: digits[digits.length - 1],
    lastDigits: digits.slice(-10)
  };
}

/**
 * Calculate Shannon entropy
 */
function calculateEntropy(frequencies) {
  return -frequencies
    .filter(f => f > 0)
    .reduce((sum, f) => sum + f * Math.log2(f), 0);
}

/**
 * Detect volatility regime (low/medium/high)
 */
function detectVolatilityRegime(ticks) {
  if (ticks.length < 20) return 'unknown';

  const prices = ticks.map(t => t.quote);
  const returns = [];

  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.abs(prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length
  );

  if (stdDev < 0.001) return 'low';
  if (stdDev < 0.003) return 'medium';
  return 'high';
}

/**
 * DFPM - Digit Frequency Pattern Matching
 * Finds underrepresented digits that are statistically "due"
 */
export function runDFPM(ticks) {
  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const expected = 0.1;
  let maxDeviation = 0;
  let targetDigit = -1;

  stats.frequencies.forEach((freq, digit) => {
    const deviation = expected - freq;
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      targetDigit = digit;
    }
  });

  const confidence = Math.min(maxDeviation * 10, 1) * 100;
  if (targetDigit === -1 || confidence < 30) return null;

  // Check even/odd balance
  const evenSum = [0, 2, 4, 6, 8].reduce((s, d) => s + stats.frequencies[d], 0);

  let contractType: string = CONTRACT_TYPE.DIGITMATCH;
  let prediction: number | null = targetDigit;

  if (Math.abs(evenSum - 0.5) > 0.1) {
    contractType = evenSum < 0.5 ? CONTRACT_TYPE.DIGITEVEN : CONTRACT_TYPE.DIGITODD;
    prediction = null;
  }

  return {
    strategy: STRATEGY.DFPM,
    contractType,
    prediction,
    confidence,
    reasoning: `Digit ${targetDigit} underrepresented by ${(maxDeviation * 100).toFixed(1)}%`
  };
}

/**
 * VCS - Volatility Cluster Strategy
 * Uses volatility clustering to predict direction
 */
export function runVCS(ticks) {
  if (ticks.length < 30) return null;

  const regime = detectVolatilityRegime(ticks);
  const prices = ticks.map(t => t.quote);

  const shortMA = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const longMA = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const momentum = (shortMA - longMA) / longMA;

  let contractType, confidence;

  if (regime === 'high') {
    if (Math.abs(momentum) < 0.001) return null;
    contractType = momentum > 0 ? CONTRACT_TYPE.CALL : CONTRACT_TYPE.PUT;
    confidence = Math.min(Math.abs(momentum) * 5000, 85);
  } else if (regime === 'low') {
    if (Math.abs(momentum) < 0.0005) return null;
    contractType = momentum > 0 ? CONTRACT_TYPE.PUT : CONTRACT_TYPE.CALL;
    confidence = Math.min(Math.abs(momentum) * 3000, 70);
  } else {
    if (Math.abs(momentum) < 0.0008) return null;
    contractType = momentum > 0 ? CONTRACT_TYPE.CALL : CONTRACT_TYPE.PUT;
    confidence = Math.min(Math.abs(momentum) * 4000, 60);
  }

  return {
    strategy: STRATEGY.VCS,
    contractType,
    prediction: null,
    confidence,
    reasoning: `${regime} volatility with ${momentum > 0 ? 'bullish' : 'bearish'} momentum`
  };
}

/**
 * DER - Digit Entropy and Randomness
 * Uses entropy to detect non-random patterns
 */
export function runDER(ticks) {
  if (ticks.length < 50) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const entropy = calculateEntropy(stats.frequencies);
  const maxEntropy = Math.log2(10);
  const normalized = entropy / maxEntropy;

  if (normalized > 0.95) return null;

  const deviations = stats.frequencies.map(f => Math.abs(f - 0.1));
  const maxIdx = deviations.indexOf(Math.max(...deviations));
  const isOver = stats.frequencies[maxIdx] > 0.1;

  const contractType = isOver ? CONTRACT_TYPE.DIGITDIFF : CONTRACT_TYPE.DIGITMATCH;
  const confidence = (1 - normalized) * 80;

  if (confidence < 25) return null;

  return {
    strategy: STRATEGY.DER,
    contractType,
    prediction: maxIdx,
    confidence,
    reasoning: `Entropy ${(normalized * 100).toFixed(1)}% - digit ${maxIdx} ${isOver ? 'over' : 'under'}represented`
  };
}

/**
 * TPC - Temporal Pattern Cycle
 * Detects cyclical patterns in digit sequences
 */
export function runTPC(ticks) {
  if (ticks.length < 40) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const digits = stats.digits;
  const patternScores = {};

  for (let len = 2; len <= 5; len++) {
    const pattern = digits.slice(-len);

    for (let i = 0; i <= digits.length - len * 2; i++) {
      const historical = digits.slice(i, i + len);
      if (JSON.stringify(pattern) === JSON.stringify(historical)) {
        const next = digits[i + len];
        if (next !== undefined) {
          patternScores[next] = (patternScores[next] || 0) + 1;
        }
      }
    }
  }

  const entries = Object.entries(patternScores) as [string, number][];
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  const [predicted, matches] = entries[0];
  const total = entries.reduce((s, [_, c]) => s + c, 0);
  const confidence = (matches / total) * (Math.min(total, 10) / 10) * 100;

  if (confidence < 30) return null;

  return {
    strategy: STRATEGY.TPC,
    contractType: CONTRACT_TYPE.DIGITMATCH,
    prediction: parseInt(predicted),
    confidence,
    reasoning: `Pattern predicts digit ${predicted} (${matches}/${total} matches)`
  };
}

/**
 * DTP - Digit Transition Probability
 * Uses Markov chain transitions
 */
export function runDTP(ticks) {
  if (ticks.length < 50) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const last = stats.lastDigit;
  const fromLast: Record<number, number> = {};
  let total = 0;

  (Object.entries(stats.transitions) as [string, number][]).forEach(([key, count]) => {
    const [from, to] = key.split('_').map(Number);
    if (from === last) {
      fromLast[to] = count;
      total += count;
    }
  });

  if (total < 5) return null;

  let maxProb = 0;
  let predicted = -1;

  (Object.entries(fromLast) as [string, number][]).forEach(([digit, count]) => {
    const prob = count / total;
    if (prob > maxProb) {
      maxProb = prob;
      predicted = parseInt(digit);
    }
  });

  if (predicted === -1) return null;

  const confidence = Math.min((maxProb / 0.1 - 1) * 50 + 40, 85);
  if (confidence < 30) return null;

  return {
    strategy: STRATEGY.DTP,
    contractType: CONTRACT_TYPE.DIGITMATCH,
    prediction: predicted,
    confidence,
    reasoning: `After ${last}, digit ${predicted} has ${(maxProb * 100).toFixed(1)}% probability`
  };
}

/**
 * DPB - Digit Pair Breakout
 * Looks for breakout from digit clusters
 */
export function runDPB(ticks) {
  if (ticks.length < 30) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const last5 = stats.lastDigits.slice(-5);
  const unique = new Set(last5).size;

  if (unique <= 2) {
    // Low diversity - expect breakout
    const counts: Record<number, number> = {};
    last5.forEach(d => counts[d] = (counts[d] || 0) + 1);
    const sortedCounts = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1]);
    const dominant = sortedCounts[0][0];

    return {
      strategy: STRATEGY.DPB,
      contractType: CONTRACT_TYPE.DIGITDIFF,
      prediction: parseInt(dominant),
      confidence: Math.min(60 + (5 - unique) * 15, 80),
      reasoning: `Run of digit ${dominant} - expecting breakout`
    };
  }

  if (unique >= 4) {
    // High diversity - expect consolidation
    const least = stats.frequencies.indexOf(Math.min(...stats.frequencies));

    return {
      strategy: STRATEGY.DPB,
      contractType: CONTRACT_TYPE.DIGITMATCH,
      prediction: least,
      confidence: 45,
      reasoning: `High diversity - expecting digit ${least}`
    };
  }

  return null;
}

/**
 * MTD - Mean Time Between Digits
 * Finds overdue digits based on average intervals
 */
export function runMTD(ticks) {
  if (ticks.length < 60) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const digits = stats.digits;
  const intervals = {};
  const lastSeen = {};

  digits.forEach((d, i) => {
    if (lastSeen[d] !== undefined) {
      if (!intervals[d]) intervals[d] = [];
      intervals[d].push(i - lastSeen[d]);
    }
    lastSeen[d] = i;
  });

  let maxOverdue = 0;
  let overdueDigit = -1;

  for (let d = 0; d <= 9; d++) {
    if (intervals[d] && intervals[d].length >= 3) {
      const mean = intervals[d].reduce((a, b) => a + b, 0) / intervals[d].length;
      const ticksSince = digits.length - lastSeen[d];
      const ratio = ticksSince / mean;

      if (ratio > maxOverdue && ratio > 1.5) {
        maxOverdue = ratio;
        overdueDigit = d;
      }
    }
  }

  if (overdueDigit === -1) return null;

  return {
    strategy: STRATEGY.MTD,
    contractType: CONTRACT_TYPE.DIGITMATCH,
    prediction: overdueDigit,
    confidence: Math.min((maxOverdue - 1) * 30 + 30, 75),
    reasoning: `Digit ${overdueDigit} is ${maxOverdue.toFixed(1)}x overdue`
  };
}

/**
 * RDS - Regime Detection Strategy
 * Combines multiple indicators
 */
export function runRDS(ticks) {
  if (ticks.length < 50) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  const regime = detectVolatilityRegime(ticks);
  const entropy = calculateEntropy(stats.frequencies);
  const normalized = entropy / Math.log2(10);

  // Even/odd analysis
  const evenCount = [0, 2, 4, 6, 8].reduce((s, d) => s + stats.counts[d], 0);
  const evenRatio = evenCount / stats.digits.length;

  // Over/under from last 10
  const avg10 = stats.lastDigits.reduce((a, b) => a + b, 0) / stats.lastDigits.length;

  let contractType, prediction = null, confidence, reasoning;

  if (regime === 'high' && (avg10 < 4 || avg10 > 6)) {
    contractType = avg10 < 4 ? CONTRACT_TYPE.DIGITOVER : CONTRACT_TYPE.DIGITUNDER;
    prediction = avg10 < 4 ? 4 : 5;
    confidence = 60;
    reasoning = `High volatility with ${avg10 < 4 ? 'over' : 'under'} signal`;
  } else if (regime === 'low' && Math.abs(evenRatio - 0.5) > 0.1) {
    contractType = evenRatio < 0.5 ? CONTRACT_TYPE.DIGITEVEN : CONTRACT_TYPE.DIGITODD;
    confidence = 55;
    reasoning = `Low volatility favoring ${evenRatio < 0.5 ? 'even' : 'odd'}`;
  } else if (normalized < 0.9) {
    const minDigit = stats.frequencies.indexOf(Math.min(...stats.frequencies));
    contractType = CONTRACT_TYPE.DIGITMATCH;
    prediction = minDigit;
    confidence = (1 - normalized) * 80;
    reasoning = `Low entropy - digit ${minDigit} underrepresented`;
  } else {
    return null;
  }

  if (confidence < 30) return null;

  return {
    strategy: STRATEGY.RDS,
    contractType,
    prediction,
    confidence,
    reasoning
  };
}

/**
 * Run all strategies and return signals
 */
export function runAllStrategies(ticks) {
  const strategies = [runDFPM, runVCS, runDER, runTPC, runDTP, runDPB, runMTD, runRDS];
  const signals = [];

  for (const fn of strategies) {
    try {
      const signal = fn(ticks);
      if (signal && signal.confidence >= 30) {
        signals.push(signal);
      }
    } catch (err) {
      console.error('Strategy error:', err);
    }
  }

  return signals;
}

/**
 * Aggregate multiple signals into best trade recommendation
 */
export function aggregateSignals(signals: Signal[]): Signal | null {
  if (!signals || signals.length === 0) return null;

  const grouped: Record<string, GroupedSignal> = {};

  signals.forEach(s => {
    const key = `${s.contractType}:${s.prediction ?? 'null'}`;
    if (!grouped[key]) {
      grouped[key] = { contractType: s.contractType, prediction: s.prediction, signals: [], total: 0 };
    }
    grouped[key].signals.push(s);
    grouped[key].total += s.confidence;
  });

  const sortedGroups = Object.values(grouped).sort((a, b) => b.total - a.total);
  const best = sortedGroups[0];
  const avgConf = best.total / best.signals.length;
  const bonus = Math.min((best.signals.length - 1) * 5, 20);

  return {
    strategy: best.signals.map(s => s.strategy).join('+'),
    contractType: best.contractType,
    prediction: best.prediction,
    confidence: Math.min(avgConf + bonus, 95),
    reasoning: best.signals.map(s => `${s.strategy}: ${s.reasoning}`).join('; ')
  };
}

/**
 * Main analysis function
 */
export function analyzeForSignal(ticks, preferredStrategy = null) {
  if (!ticks || ticks.length < 20) {
    return { shouldTrade: false, reason: 'Need at least 20 ticks' };
  }

  if (preferredStrategy && preferredStrategy !== 'ALL') {
    const strategyMap = {
      DFPM: runDFPM, VCS: runVCS, DER: runDER, TPC: runTPC,
      DTP: runDTP, DPB: runDPB, MTD: runMTD, RDS: runRDS
    };

    const fn = strategyMap[preferredStrategy];
    if (!fn) return { shouldTrade: false, reason: `Unknown strategy: ${preferredStrategy}` };

    const signal = fn(ticks);
    if (!signal) return { shouldTrade: false, reason: 'No signal from strategy' };
    if (signal.confidence < 40) return { shouldTrade: false, reason: 'Low confidence', signal };

    return { shouldTrade: true, signal };
  }

  const signals = runAllStrategies(ticks);
  if (signals.length === 0) return { shouldTrade: false, reason: 'No valid signals' };

  const aggregated = aggregateSignals(signals);
  if (!aggregated) return { shouldTrade: false, reason: 'Could not aggregate' };
  if (aggregated.confidence < 50) return { shouldTrade: false, reason: 'Low aggregated confidence', signal: aggregated };

  return { shouldTrade: true, signal: aggregated, allSignals: signals };
}

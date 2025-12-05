/**
 * Strategy Engine - Backend implementation of 8 trading strategies
 * 
 * Strategies:
 * 1. DFPM - Digit Frequency Pattern Matching
 * 2. VCS - Volatility Cluster Strategy
 * 3. DER - Digit Entropy and Randomness
 * 4. TPC - Temporal Pattern Cycle
 * 5. DTP - Digit Transition Probability
 * 6. DPB - Digit Pair Breakout
 * 7. MTD - Mean Time Between Digits
 * 8. RDS - Regime Detection Strategy
 */

// ==================== Constants ====================

const STRATEGY_NAMES = {
  DFPM: 'Digit Frequency Pattern Matching',
  VCS: 'Volatility Cluster Strategy',
  DER: 'Digit Entropy and Randomness',
  TPC: 'Temporal Pattern Cycle',
  DTP: 'Digit Transition Probability',
  DPB: 'Digit Pair Breakout',
  MTD: 'Mean Time Between Digits',
  RDS: 'Regime Detection Strategy',
};

const CONTRACT_TYPES = {
  DIGITEVEN: 'DIGITEVEN',
  DIGITODD: 'DIGITODD',
  DIGITOVER: 'DIGITOVER',
  DIGITUNDER: 'DIGITUNDER',
  DIGITMATCH: 'DIGITMATCH',
  DIGITDIFF: 'DIGITDIFF',
  CALL: 'CALL',
  PUT: 'PUT',
};

// ==================== Utility Functions ====================

/**
 * Calculate digit statistics from tick history
 */
function calculateDigitStats(ticks) {
  const digitCounts = new Array(10).fill(0);
  const digits = ticks.map(t => t.digit);
  
  digits.forEach(d => digitCounts[d]++);
  
  const total = digits.length;
  const frequencies = digitCounts.map(c => c / total);
  
  // Calculate streaks
  const streaks = {};
  let currentDigit = digits[0];
  let currentStreak = 1;
  
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] === currentDigit) {
      currentStreak++;
    } else {
      if (!streaks[currentDigit] || currentStreak > streaks[currentDigit]) {
        streaks[currentDigit] = currentStreak;
      }
      currentDigit = digits[i];
      currentStreak = 1;
    }
  }
  
  // Calculate transitions
  const transitions = {};
  for (let i = 0; i < digits.length - 1; i++) {
    const key = `${digits[i]}-${digits[i + 1]}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }
  
  return {
    digitCounts,
    frequencies,
    streaks,
    transitions,
    total,
    lastDigit: digits[digits.length - 1],
    lastDigits: digits.slice(-10),
  };
}

/**
 * Calculate entropy of digit distribution
 */
function calculateEntropy(frequencies) {
  return -frequencies
    .filter(f => f > 0)
    .reduce((sum, f) => sum + f * Math.log2(f), 0);
}

/**
 * Detect volatility regime
 */
function detectVolatilityRegime(ticks) {
  if (ticks.length < 20) return 'unknown';
  
  const prices = ticks.map(t => t.quote);
  const returns = [];
  
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.abs(prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  
  if (stdDev < 0.001) return 'low';
  if (stdDev < 0.003) return 'medium';
  return 'high';
}

// ==================== Strategy Implementations ====================

/**
 * DFPM - Digit Frequency Pattern Matching
 * Looks for underrepresented digits that are "due" to appear
 */
function runDFPMStrategy(ticks) {
  const stats = calculateDigitStats(ticks);
  const expectedFreq = 0.1; // Each digit should appear 10% of the time
  
  // Find most underrepresented digit
  let maxDeviation = 0;
  let targetDigit = -1;
  
  stats.frequencies.forEach((freq, digit) => {
    const deviation = expectedFreq - freq;
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      targetDigit = digit;
    }
  });
  
  // Calculate confidence based on deviation magnitude
  const confidence = Math.min(maxDeviation * 10, 1) * 100;
  
  if (targetDigit === -1 || confidence < 30) {
    return null;
  }
  
  // Determine contract type based on target digit
  let contractType = CONTRACT_TYPES.DIGITMATCH;
  let prediction = targetDigit;
  
  // Consider even/odd if multiple digits are underrepresented
  const evenSum = stats.frequencies.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const oddSum = stats.frequencies.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  
  if (Math.abs(evenSum - 0.5) > 0.1) {
    if (evenSum < 0.5) {
      contractType = CONTRACT_TYPES.DIGITEVEN;
      prediction = null;
    } else {
      contractType = CONTRACT_TYPES.DIGITODD;
      prediction = null;
    }
  }
  
  return {
    strategy: 'DFPM',
    contractType,
    prediction,
    confidence,
    reasoning: `Digit ${targetDigit} underrepresented by ${(maxDeviation * 100).toFixed(1)}%`,
    stats: {
      targetDigit,
      deviation: maxDeviation,
      frequencies: stats.frequencies,
    },
  };
}

/**
 * VCS - Volatility Cluster Strategy
 * Uses volatility clustering to predict price direction
 */
function runVCSStrategy(ticks) {
  if (ticks.length < 30) return null;
  
  const regime = detectVolatilityRegime(ticks);
  const prices = ticks.map(t => t.quote);
  
  // Calculate short-term and long-term moving averages
  const shortMA = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const longMA = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  
  // Calculate momentum
  const momentum = (shortMA - longMA) / longMA;
  
  let contractType;
  let confidence;
  
  if (regime === 'high') {
    // High volatility - follow the trend
    if (momentum > 0.001) {
      contractType = CONTRACT_TYPES.CALL;
      confidence = Math.min(Math.abs(momentum) * 5000, 85);
    } else if (momentum < -0.001) {
      contractType = CONTRACT_TYPES.PUT;
      confidence = Math.min(Math.abs(momentum) * 5000, 85);
    } else {
      return null;
    }
  } else if (regime === 'low') {
    // Low volatility - expect mean reversion
    if (momentum > 0.0005) {
      contractType = CONTRACT_TYPES.PUT;
      confidence = Math.min(Math.abs(momentum) * 3000, 70);
    } else if (momentum < -0.0005) {
      contractType = CONTRACT_TYPES.CALL;
      confidence = Math.min(Math.abs(momentum) * 3000, 70);
    } else {
      return null;
    }
  } else {
    // Medium volatility - be more cautious
    if (Math.abs(momentum) < 0.0008) {
      return null;
    }
    contractType = momentum > 0 ? CONTRACT_TYPES.CALL : CONTRACT_TYPES.PUT;
    confidence = Math.min(Math.abs(momentum) * 4000, 60);
  }
  
  return {
    strategy: 'VCS',
    contractType,
    prediction: null,
    confidence,
    reasoning: `${regime} volatility regime with ${momentum > 0 ? 'bullish' : 'bearish'} momentum`,
    stats: {
      regime,
      momentum,
      shortMA,
      longMA,
    },
  };
}

/**
 * DER - Digit Entropy and Randomness
 * Uses entropy analysis to detect non-random patterns
 */
function runDERStrategy(ticks) {
  if (ticks.length < 50) return null;
  
  const stats = calculateDigitStats(ticks);
  const entropy = calculateEntropy(stats.frequencies);
  
  // Maximum entropy for 10 digits = log2(10) ≈ 3.32
  const maxEntropy = Math.log2(10);
  const normalizedEntropy = entropy / maxEntropy;
  
  // Low entropy suggests pattern
  if (normalizedEntropy > 0.95) {
    // Very random distribution - no clear signal
    return null;
  }
  
  // Find the digit with highest deviation from expected
  const deviations = stats.frequencies.map(f => Math.abs(f - 0.1));
  const maxDeviationIndex = deviations.indexOf(Math.max(...deviations));
  
  // Determine if digit is over or under represented
  const isOverrepresented = stats.frequencies[maxDeviationIndex] > 0.1;
  
  let contractType;
  let prediction;
  
  if (isOverrepresented) {
    // Expect different digit next
    contractType = CONTRACT_TYPES.DIGITDIFF;
    prediction = maxDeviationIndex;
  } else {
    // Expect this digit
    contractType = CONTRACT_TYPES.DIGITMATCH;
    prediction = maxDeviationIndex;
  }
  
  const confidence = (1 - normalizedEntropy) * 100 * 0.8;
  
  if (confidence < 25) return null;
  
  return {
    strategy: 'DER',
    contractType,
    prediction,
    confidence,
    reasoning: `Entropy ${(normalizedEntropy * 100).toFixed(1)}% - digit ${maxDeviationIndex} ${isOverrepresented ? 'overrepresented' : 'underrepresented'}`,
    stats: {
      entropy,
      normalizedEntropy,
      targetDigit: maxDeviationIndex,
      deviation: deviations[maxDeviationIndex],
    },
  };
}

/**
 * TPC - Temporal Pattern Cycle
 * Detects cyclical patterns in digit sequences
 */
function runTPCStrategy(ticks) {
  if (ticks.length < 40) return null;
  
  const digits = ticks.map(t => t.digit);
  
  // Look for patterns of different lengths (2-6)
  const patternScores = {};
  
  for (let patternLen = 2; patternLen <= 6; patternLen++) {
    const recentPattern = digits.slice(-patternLen);
    let matches = 0;
    
    // Count how many times this pattern appeared in history
    for (let i = 0; i <= digits.length - patternLen * 2; i++) {
      const historicalPattern = digits.slice(i, i + patternLen);
      if (JSON.stringify(recentPattern) === JSON.stringify(historicalPattern)) {
        // Check what came next
        const nextDigit = digits[i + patternLen];
        if (nextDigit !== undefined) {
          patternScores[nextDigit] = (patternScores[nextDigit] || 0) + 1;
          matches++;
        }
      }
    }
    
    if (matches >= 2) break; // Found enough pattern matches
  }
  
  // Find most likely next digit
  const entries = Object.entries(patternScores);
  if (entries.length === 0) return null;
  
  entries.sort((a, b) => b[1] - a[1]);
  const [predictedDigit, matchCount] = entries[0];
  
  const totalMatches = entries.reduce((sum, [_, count]) => sum + count, 0);
  const confidence = (matchCount / totalMatches) * (Math.min(totalMatches, 10) / 10) * 100;
  
  if (confidence < 30) return null;
  
  const digit = parseInt(predictedDigit);
  
  return {
    strategy: 'TPC',
    contractType: CONTRACT_TYPES.DIGITMATCH,
    prediction: digit,
    confidence,
    reasoning: `Pattern suggests digit ${digit} next (${matchCount}/${totalMatches} matches)`,
    stats: {
      predictedDigit: digit,
      matchCount,
      totalMatches,
      patternScores,
    },
  };
}

/**
 * DTP - Digit Transition Probability
 * Uses Markov chain transition probabilities
 */
function runDTPStrategy(ticks) {
  if (ticks.length < 50) return null;
  
  const stats = calculateDigitStats(ticks);
  const lastDigit = stats.lastDigit;
  
  // Build transition probabilities from last digit
  const transitionsFromLast = {};
  let totalFromLast = 0;
  
  Object.entries(stats.transitions).forEach(([key, count]) => {
    const [from, to] = key.split('-').map(Number);
    if (from === lastDigit) {
      transitionsFromLast[to] = count;
      totalFromLast += count;
    }
  });
  
  if (totalFromLast < 5) return null;
  
  // Find most likely next digit
  let maxProb = 0;
  let predictedDigit = -1;
  
  Object.entries(transitionsFromLast).forEach(([digit, count]) => {
    const prob = count / totalFromLast;
    if (prob > maxProb) {
      maxProb = prob;
      predictedDigit = parseInt(digit);
    }
  });
  
  if (predictedDigit === -1) return null;
  
  // Confidence based on probability strength
  const expectedProb = 0.1;
  const confidence = Math.min((maxProb / expectedProb - 1) * 50 + 40, 85);
  
  if (confidence < 30) return null;
  
  return {
    strategy: 'DTP',
    contractType: CONTRACT_TYPES.DIGITMATCH,
    prediction: predictedDigit,
    confidence,
    reasoning: `After digit ${lastDigit}, digit ${predictedDigit} has ${(maxProb * 100).toFixed(1)}% probability`,
    stats: {
      lastDigit,
      predictedDigit,
      probability: maxProb,
      transitions: transitionsFromLast,
    },
  };
}

/**
 * DPB - Digit Pair Breakout
 * Looks for breakout patterns in digit pairs
 */
function runDPBStrategy(ticks) {
  if (ticks.length < 30) return null;
  
  const digits = ticks.map(t => t.digit);
  const last5 = digits.slice(-5);
  
  // Check for runs
  const uniqueInLast5 = new Set(last5).size;
  
  if (uniqueInLast5 <= 2) {
    // Low diversity - expect breakout
    const dominantDigit = last5.reduce((acc, d) => {
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    
    const dominant = Object.entries(dominantDigit).sort((a, b) => b[1] - a[1])[0][0];
    
    // Predict different digit
    const confidence = Math.min(60 + (5 - uniqueInLast5) * 15, 80);
    
    return {
      strategy: 'DPB',
      contractType: CONTRACT_TYPES.DIGITDIFF,
      prediction: parseInt(dominant),
      confidence,
      reasoning: `Run of digit ${dominant} detected - expecting breakout`,
      stats: {
        uniqueDigits: uniqueInLast5,
        dominantDigit: parseInt(dominant),
        last5,
      },
    };
  }
  
  if (uniqueInLast5 >= 4) {
    // High diversity - expect consolidation
    const stats = calculateDigitStats(ticks);
    const leastCommon = stats.frequencies.indexOf(Math.min(...stats.frequencies));
    
    const confidence = 45;
    
    return {
      strategy: 'DPB',
      contractType: CONTRACT_TYPES.DIGITMATCH,
      prediction: leastCommon,
      confidence,
      reasoning: `High diversity - expecting consolidation around digit ${leastCommon}`,
      stats: {
        uniqueDigits: uniqueInLast5,
        targetDigit: leastCommon,
        last5,
      },
    };
  }
  
  return null;
}

/**
 * MTD - Mean Time Between Digits
 * Analyzes time between same digit occurrences
 */
function runMTDStrategy(ticks) {
  if (ticks.length < 60) return null;
  
  const digits = ticks.map(t => t.digit);
  
  // Calculate mean time between occurrences for each digit
  const intervals = {};
  const lastSeen = {};
  
  digits.forEach((d, i) => {
    if (lastSeen[d] !== undefined) {
      if (!intervals[d]) intervals[d] = [];
      intervals[d].push(i - lastSeen[d]);
    }
    lastSeen[d] = i;
  });
  
  // Find digit that's "overdue"
  const currentIndex = digits.length;
  let maxOverdue = 0;
  let overdueDigit = -1;
  
  for (let d = 0; d <= 9; d++) {
    if (intervals[d] && intervals[d].length >= 3) {
      const meanInterval = intervals[d].reduce((a, b) => a + b, 0) / intervals[d].length;
      const ticksSinceLast = currentIndex - lastSeen[d];
      const overdueRatio = ticksSinceLast / meanInterval;
      
      if (overdueRatio > maxOverdue && overdueRatio > 1.5) {
        maxOverdue = overdueRatio;
        overdueDigit = d;
      }
    }
  }
  
  if (overdueDigit === -1) return null;
  
  const confidence = Math.min((maxOverdue - 1) * 30 + 30, 75);
  
  return {
    strategy: 'MTD',
    contractType: CONTRACT_TYPES.DIGITMATCH,
    prediction: overdueDigit,
    confidence,
    reasoning: `Digit ${overdueDigit} is ${maxOverdue.toFixed(1)}x overdue`,
    stats: {
      overdueDigit,
      overdueRatio: maxOverdue,
      intervals: intervals[overdueDigit],
    },
  };
}

/**
 * RDS - Regime Detection Strategy
 * Combines multiple indicators to detect market regime
 */
function runRDSStrategy(ticks) {
  if (ticks.length < 50) return null;
  
  const stats = calculateDigitStats(ticks);
  const regime = detectVolatilityRegime(ticks);
  const entropy = calculateEntropy(stats.frequencies);
  const normalizedEntropy = entropy / Math.log2(10);
  
  // Combine signals
  const signals = {
    evenOdd: null,
    overUnder: null,
    specific: null,
  };
  
  // Even/Odd analysis
  const evenDigits = [0, 2, 4, 6, 8];
  const evenCount = evenDigits.reduce((sum, d) => sum + stats.digitCounts[d], 0);
  const evenRatio = evenCount / stats.total;
  
  if (Math.abs(evenRatio - 0.5) > 0.1) {
    signals.evenOdd = evenRatio < 0.5 ? 'even' : 'odd';
  }
  
  // Over/Under analysis based on last 10 digits
  const avgLast10 = stats.lastDigits.reduce((a, b) => a + b, 0) / 10;
  if (avgLast10 < 4) {
    signals.overUnder = { type: 'over', barrier: 4 };
  } else if (avgLast10 > 6) {
    signals.overUnder = { type: 'under', barrier: 5 };
  }
  
  // Determine best signal
  let contractType;
  let prediction = null;
  let confidence;
  let reasoning;
  
  if (regime === 'high' && signals.overUnder) {
    contractType = signals.overUnder.type === 'over' 
      ? CONTRACT_TYPES.DIGITOVER 
      : CONTRACT_TYPES.DIGITUNDER;
    prediction = signals.overUnder.barrier;
    confidence = 60;
    reasoning = `High volatility regime with ${signals.overUnder.type} signal`;
  } else if (regime === 'low' && signals.evenOdd) {
    contractType = signals.evenOdd === 'even' 
      ? CONTRACT_TYPES.DIGITEVEN 
      : CONTRACT_TYPES.DIGITODD;
    confidence = 55;
    reasoning = `Low volatility regime favoring ${signals.evenOdd} digits`;
  } else if (normalizedEntropy < 0.9) {
    // Low entropy - specific digit prediction
    const minFreqDigit = stats.frequencies.indexOf(Math.min(...stats.frequencies));
    contractType = CONTRACT_TYPES.DIGITMATCH;
    prediction = minFreqDigit;
    confidence = (1 - normalizedEntropy) * 80;
    reasoning = `Low entropy (${(normalizedEntropy * 100).toFixed(1)}%) - digit ${minFreqDigit} underrepresented`;
  } else {
    return null;
  }
  
  if (confidence < 30) return null;
  
  return {
    strategy: 'RDS',
    contractType,
    prediction,
    confidence,
    reasoning,
    stats: {
      regime,
      entropy: normalizedEntropy,
      signals,
      evenRatio,
      avgLast10,
    },
  };
}

// ==================== Main Strategy Functions ====================

/**
 * Run all strategies and collect signals
 */
function runAllStrategies(ticks) {
  const strategies = [
    runDFPMStrategy,
    runVCSStrategy,
    runDERStrategy,
    runTPCStrategy,
    runDTPStrategy,
    runDPBStrategy,
    runMTDStrategy,
    runRDSStrategy,
  ];
  
  const signals = [];
  
  for (const strategy of strategies) {
    try {
      const signal = strategy(ticks);
      if (signal && signal.confidence >= 30) {
        signals.push(signal);
      }
    } catch (error) {
      console.error(`Error running strategy:`, error);
    }
  }
  
  return signals;
}

/**
 * Aggregate signals from multiple strategies
 */
function aggregateSignals(signals) {
  if (signals.length === 0) return null;
  
  // Group by contract type
  const byContractType = {};
  
  signals.forEach(signal => {
    const key = `${signal.contractType}:${signal.prediction ?? 'null'}`;
    if (!byContractType[key]) {
      byContractType[key] = {
        contractType: signal.contractType,
        prediction: signal.prediction,
        signals: [],
        totalConfidence: 0,
      };
    }
    byContractType[key].signals.push(signal);
    byContractType[key].totalConfidence += signal.confidence;
  });
  
  // Find best aggregated signal
  const entries = Object.values(byContractType);
  entries.sort((a, b) => b.totalConfidence - a.totalConfidence);
  
  const best = entries[0];
  
  // Calculate final confidence (average of contributing strategies, capped)
  const avgConfidence = best.totalConfidence / best.signals.length;
  const strategyBonus = Math.min((best.signals.length - 1) * 5, 20);
  const finalConfidence = Math.min(avgConfidence + strategyBonus, 95);
  
  return {
    contractType: best.contractType,
    prediction: best.prediction,
    confidence: finalConfidence,
    contributingStrategies: best.signals.map(s => s.strategy),
    reasoning: best.signals.map(s => `${s.strategy}: ${s.reasoning}`).join('; '),
  };
}

/**
 * Analyze ticks and generate trading signal
 */
function analyzeTicksForSignal(ticks, preferredStrategy = null) {
  if (ticks.length < 20) {
    return {
      shouldTrade: false,
      reason: 'Insufficient tick data (need at least 20 ticks)',
    };
  }
  
  // If preferred strategy specified, run only that one
  if (preferredStrategy && preferredStrategy !== 'ALL') {
    const strategyMap = {
      DFPM: runDFPMStrategy,
      VCS: runVCSStrategy,
      DER: runDERStrategy,
      TPC: runTPCStrategy,
      DTP: runDTPStrategy,
      DPB: runDPBStrategy,
      MTD: runMTDStrategy,
      RDS: runRDSStrategy,
    };
    
    const strategyFn = strategyMap[preferredStrategy];
    if (!strategyFn) {
      return {
        shouldTrade: false,
        reason: `Unknown strategy: ${preferredStrategy}`,
      };
    }
    
    const signal = strategyFn(ticks);
    if (!signal) {
      return {
        shouldTrade: false,
        reason: `${preferredStrategy} strategy did not generate a signal`,
      };
    }
    
    if (signal.confidence < 40) {
      return {
        shouldTrade: false,
        reason: `Confidence too low: ${signal.confidence.toFixed(1)}%`,
        signal,
      };
    }
    
    return {
      shouldTrade: true,
      signal,
    };
  }
  
  // Run all strategies
  const signals = runAllStrategies(ticks);
  
  if (signals.length === 0) {
    return {
      shouldTrade: false,
      reason: 'No strategies generated valid signals',
    };
  }
  
  // Aggregate signals
  const aggregated = aggregateSignals(signals);
  
  if (!aggregated) {
    return {
      shouldTrade: false,
      reason: 'Could not aggregate signals',
    };
  }
  
  if (aggregated.confidence < 50) {
    return {
      shouldTrade: false,
      reason: `Aggregated confidence too low: ${aggregated.confidence.toFixed(1)}%`,
      signal: aggregated,
    };
  }
  
  return {
    shouldTrade: true,
    signal: aggregated,
    allSignals: signals,
  };
}

// ==================== Exports ====================

module.exports = {
  // Constants
  STRATEGY_NAMES,
  CONTRACT_TYPES,
  
  // Utility functions
  calculateDigitStats,
  calculateEntropy,
  detectVolatilityRegime,
  
  // Individual strategies
  runDFPMStrategy,
  runVCSStrategy,
  runDERStrategy,
  runTPCStrategy,
  runDTPStrategy,
  runDPBStrategy,
  runMTDStrategy,
  runRDSStrategy,
  
  // Main functions
  runAllStrategies,
  aggregateSignals,
  analyzeTicksForSignal,
};

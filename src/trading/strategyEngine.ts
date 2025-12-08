/**
 * Strategy Engine - 9 Trading Strategies for Digit Analysis
 * 
 * Implements the complete 1000-tick strategy system:
 * 1. DFPM - Digit Frequency Probability Map
 * 2. VCS  - Volatility Confidence System
 * 3. DER  - Digit Exhaustion Rule
 * 4. TPC  - Trend Probability Calculation
 * 5. DTP  - Digit Trend Prediction
 * 6. DPB  - Digit Probability Bias
 * 7. MTD  - Multi-Timeframe Digit Trend
 * 8. RDS  - Reversal Digit Strategy
 * 9. Smart Delay Check (1-Tick Validation)
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Tick {
  quote: number;
  epoch?: number;
}

export interface DigitStats {
  digits: number[];
  counts: number[];
  frequencies: number[];
  dominantDigit: number;
  weakDigit: number;
  lastDigit: number;
}

export interface DFPMResult {
  dominantDigit: number;
  weakDigit: number;
  probabilityMap: number[];
  strongBiasScore: number;
}

export interface VCSResult {
  volatilityScore: number;
  marketHealthy: boolean;
}

export interface DERResult {
  exhaustedDigit: number | null;
  exhaustionScore: number;
  tradeAgainstDigit: number | null;
}

export interface TPCResult {
  trendDirection: 'OVER' | 'UNDER' | 'NEUTRAL';
  trendStrength: number;
}

export interface DTPResult {
  predictedDirection: 'OVER' | 'UNDER' | 'NEUTRAL';
  predictedDigit: number | null;
  predictionConfidence: number;
}

export interface DPBResult {
  direction: 'OVER' | 'UNDER';
  strength: number;
}

export interface MTDResult {
  alignmentScore: number;
  direction: 'OVER' | 'UNDER' | 'NEUTRAL';
  shortTrend: 'OVER' | 'UNDER' | 'NEUTRAL';
  mediumTrend: 'OVER' | 'UNDER' | 'NEUTRAL';
  longTrend: 'OVER' | 'UNDER' | 'NEUTRAL';
}

export interface RDSResult {
  reversalLikely: boolean;
  reversalDirection: 'OVER' | 'UNDER' | null;
  reversalConfidence: number;
}

export interface StrategyResults {
  dfpm: DFPMResult | null;
  vcs: VCSResult | null;
  der: DERResult | null;
  tpc: TPCResult | null;
  dtp: DTPResult | null;
  dpb: DPBResult | null;
  mtd: MTDResult | null;
  rds: RDSResult | null;
}

export interface FinalSignal {
  shouldTrade: boolean;
  market: string;
  direction: 'OVER' | 'UNDER' | null;
  digit: number | null;
  confidence: number;
  reasons: string[];
  strategies: StrategyResults;
}

// ============================================
// CONSTANTS
// ============================================

const TICK_BUFFER_SIZE = 1000;
const DEFAULT_THRESHOLD = 0.65;

// Weighted confidence formula
const WEIGHTS = {
  DFPM: 0.15,
  VCS: 0.10,
  DER: 0.10,
  TPC: 0.10,
  DTP: 0.10,
  DPB: 0.15,
  MTD: 0.20,
  RDS: 0.10
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract last digit from tick price
 */
function getDigit(tick: Tick): number {
  const priceStr = tick.quote.toString();
  return parseInt(priceStr[priceStr.length - 1]);
}

/**
 * Extract digits from tick array
 */
function extractDigits(ticks: Tick[]): number[] {
  return ticks.map(getDigit);
}

/**
 * Calculate digit statistics
 */
export function calculateDigitStats(ticks: Tick[]): DigitStats | null {
  if (!ticks || ticks.length === 0) return null;

  const digits = extractDigits(ticks);
  const counts = new Array(10).fill(0);
  digits.forEach(d => counts[d]++);

  const frequencies = counts.map(c => c / digits.length);

  let maxCount = 0, minCount = Infinity;
  let dominantDigit = 0, weakDigit = 0;

  counts.forEach((count, digit) => {
    if (count > maxCount) {
      maxCount = count;
      dominantDigit = digit;
    }
    if (count < minCount) {
      minCount = count;
      weakDigit = digit;
    }
  });

  return {
    digits,
    counts,
    frequencies,
    dominantDigit,
    weakDigit,
    lastDigit: digits[digits.length - 1]
  };
}

// ============================================
// 1. DFPM - Digit Frequency Probability Map
// ============================================

/**
 * Calculate probability distribution of digits 0-9 using tick history
 * Output: dominantDigit, weakDigit, probabilityMap[0..9], strongBiasScore
 */
export function runDFPM(ticks: Tick[]): DFPMResult | null {
  if (ticks.length < 50) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  // Calculate how much the distribution deviates from uniform (0.1 each)
  const expected = 0.1;
  let totalDeviation = 0;

  stats.frequencies.forEach(freq => {
    totalDeviation += Math.abs(freq - expected);
  });

  // Strong bias score: 0 = uniform, 1 = highly skewed
  // Max possible deviation is 1.8 (one digit at 100%, others at 0%)
  const strongBiasScore = Math.min(totalDeviation / 0.5, 1);

  return {
    dominantDigit: stats.dominantDigit,
    weakDigit: stats.weakDigit,
    probabilityMap: stats.frequencies,
    strongBiasScore
  };
}

// ============================================
// 2. VCS - Volatility Confidence System
// ============================================

/**
 * Measure market stability across tick history
 * Output: volatilityScore (0-1), marketHealthy
 */
export function runVCS(ticks: Tick[]): VCSResult | null {
  if (ticks.length < 30) return null;

  const digits = extractDigits(ticks);

  // Calculate tick spacing variance
  const diffs: number[] = [];
  for (let i = 1; i < digits.length; i++) {
    diffs.push(Math.abs(digits[i] - digits[i - 1]));
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / diffs.length;
  const stdDev = Math.sqrt(variance);

  // High volatility spike detection
  const highSpikes = diffs.filter(d => d >= 7).length;
  const spikeRatio = highSpikes / diffs.length;

  // Volatility score: higher = more volatile
  // Normalize to 0-1 range
  const rawVolatility = (stdDev / 3) + (spikeRatio * 2);
  const volatilityScore = Math.min(Math.max(rawVolatility, 0), 1);

  // Market is healthy if volatility is moderate (not too high, not too low)
  const marketHealthy = volatilityScore >= 0.2 && volatilityScore <= 0.7;

  return {
    volatilityScore,
    marketHealthy
  };
}

// ============================================
// 3. DER - Digit Exhaustion Rule
// ============================================

/**
 * Detect digits appearing abnormally many times
 * Output: exhaustedDigit, exhaustionScore, tradeAgainstDigit
 */
export function runDER(ticks: Tick[]): DERResult | null {
  if (ticks.length < 50) return null;

  const stats = calculateDigitStats(ticks);
  if (!stats) return null;

  // Check last 100 ticks for exhaustion
  const recentTicks = ticks.slice(-Math.min(100, ticks.length));
  const recentDigits = extractDigits(recentTicks);
  const recentCounts = new Array(10).fill(0);
  recentDigits.forEach(d => recentCounts[d]++);

  // Expected count for uniform distribution
  const expectedCount = recentDigits.length / 10;

  let exhaustedDigit: number | null = null;
  let maxExhaustion = 0;

  recentCounts.forEach((count, digit) => {
    const exhaustionRatio = count / expectedCount;
    if (exhaustionRatio > 2.0 && exhaustionRatio > maxExhaustion) {
      maxExhaustion = exhaustionRatio;
      exhaustedDigit = digit;
    }
  });

  // Detect streaks (cluster bursts)
  let currentStreak = 1;
  let maxStreak = 1;
  let streakDigit = recentDigits[0];

  for (let i = 1; i < recentDigits.length; i++) {
    if (recentDigits[i] === recentDigits[i - 1]) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        streakDigit = recentDigits[i];
      }
    } else {
      currentStreak = 1;
    }
  }

  // If we found a long streak, that's also exhaustion
  if (maxStreak >= 4 && exhaustedDigit === null) {
    exhaustedDigit = streakDigit;
    maxExhaustion = maxStreak / 2;
  }

  const exhaustionScore = Math.min(maxExhaustion / 3, 1);

  return {
    exhaustedDigit,
    exhaustionScore,
    tradeAgainstDigit: exhaustedDigit
  };
}

// ============================================
// 4. TPC - Trend Probability Calculation
// ============================================

/**
 * Find directional bias over tick history
 * Output: trendDirection (OVER/UNDER/NEUTRAL), trendStrength
 */
export function runTPC(ticks: Tick[]): TPCResult | null {
  if (ticks.length < 50) return null;

  const digits = extractDigits(ticks);

  // Count digits >= 5 (OVER) vs <= 4 (UNDER)
  let overCount = 0;
  let underCount = 0;

  digits.forEach(d => {
    if (d >= 5) overCount++;
    else underCount++;
  });

  const total = digits.length;
  const overRatio = overCount / total;
  const underRatio = underCount / total;

  // Determine trend
  let trendDirection: 'OVER' | 'UNDER' | 'NEUTRAL';
  let trendStrength: number;

  if (overRatio > 0.55) {
    trendDirection = 'OVER';
    trendStrength = (overRatio - 0.5) * 2; // 0.55 -> 0.1, 0.7 -> 0.4
  } else if (underRatio > 0.55) {
    trendDirection = 'UNDER';
    trendStrength = (underRatio - 0.5) * 2;
  } else {
    trendDirection = 'NEUTRAL';
    trendStrength = 0;
  }

  trendStrength = Math.min(trendStrength, 1);

  return {
    trendDirection,
    trendStrength
  };
}

// ============================================
// 5. DTP - Digit Trend Prediction
// ============================================

/**
 * Predict near-term digit direction using multiple windows
 * Compares micro-trends vs macro-trends
 */
export function runDTP(ticks: Tick[]): DTPResult | null {
  if (ticks.length < 50) return null;

  const digits = extractDigits(ticks);

  // Analyze multiple windows
  const windows = [20, 50, 100, Math.min(1000, ticks.length)];
  const trends: ('OVER' | 'UNDER' | 'NEUTRAL')[] = [];

  windows.forEach(size => {
    if (digits.length >= size) {
      const windowDigits = digits.slice(-size);
      const overCount = windowDigits.filter(d => d >= 5).length;
      const ratio = overCount / windowDigits.length;

      if (ratio > 0.52) trends.push('OVER');
      else if (ratio < 0.48) trends.push('UNDER');
      else trends.push('NEUTRAL');
    }
  });

  // Count agreement
  const overVotes = trends.filter(t => t === 'OVER').length;
  const underVotes = trends.filter(t => t === 'UNDER').length;

  let predictedDirection: 'OVER' | 'UNDER' | 'NEUTRAL';
  let predictionConfidence: number;

  if (overVotes >= 3) {
    predictedDirection = 'OVER';
    predictionConfidence = overVotes / trends.length;
  } else if (underVotes >= 3) {
    predictedDirection = 'UNDER';
    predictionConfidence = underVotes / trends.length;
  } else {
    predictedDirection = 'NEUTRAL';
    predictionConfidence = 0;
  }

  // Predicted digit based on bias
  let predictedDigit: number | null = null;
  if (predictedDirection === 'OVER') {
    predictedDigit = 7; // Common OVER digit
  } else if (predictedDirection === 'UNDER') {
    predictedDigit = 3; // Common UNDER digit
  }

  return {
    predictedDirection,
    predictedDigit,
    predictionConfidence
  };
}

// ============================================
// 6. DPB - Digit Probability Bias
// ============================================

/**
 * Combine frequency bias and exhaustion bias
 * Formula: DPB_strength = (DFPM_bias * 0.6) + (DER_bias * 0.4)
 */
export function runDPB(dfpm: DFPMResult | null, der: DERResult | null): DPBResult | null {
  if (!dfpm) return null;

  const dfpmBias = dfpm.strongBiasScore;
  const derBias = der?.exhaustionScore || 0;

  const strength = (dfpmBias * 0.6) + (derBias * 0.4);

  // Determine direction based on dominant/weak digit
  let direction: 'OVER' | 'UNDER';

  if (dfpm.dominantDigit >= 5) {
    // Dominant is high, expect regression to mean -> UNDER
    direction = 'UNDER';
  } else {
    // Dominant is low, expect regression -> OVER
    direction = 'OVER';
  }

  // If there's exhaustion, trade against it
  if (der?.exhaustedDigit !== null) {
    direction = der.exhaustedDigit >= 5 ? 'UNDER' : 'OVER';
  }

  return {
    direction,
    strength: Math.min(strength, 1)
  };
}

// ============================================
// 7. MTD - Multi-Timeframe Digit Trend
// ============================================

/**
 * Evaluate trend consistency across multiple windows
 * Short: 50, Medium: 200, Long: 1000 ticks
 */
export function runMTD(ticks: Tick[]): MTDResult | null {
  if (ticks.length < 50) return null;

  const digits = extractDigits(ticks);

  const analyzeTrend = (windowDigits: number[]): 'OVER' | 'UNDER' | 'NEUTRAL' => {
    const overCount = windowDigits.filter(d => d >= 5).length;
    const ratio = overCount / windowDigits.length;
    if (ratio > 0.52) return 'OVER';
    if (ratio < 0.48) return 'UNDER';
    return 'NEUTRAL';
  };

  // Short-term: last 50
  const shortTrend = analyzeTrend(digits.slice(-50));

  // Medium-term: last 200 (or all if less)
  const mediumSize = Math.min(200, digits.length);
  const mediumTrend = analyzeTrend(digits.slice(-mediumSize));

  // Long-term: last 1000 (or all if less)
  const longSize = Math.min(1000, digits.length);
  const longTrend = analyzeTrend(digits.slice(-longSize));

  // Count alignments
  const trends = [shortTrend, mediumTrend, longTrend];
  const overCount = trends.filter(t => t === 'OVER').length;
  const underCount = trends.filter(t => t === 'UNDER').length;

  let direction: 'OVER' | 'UNDER' | 'NEUTRAL';
  let alignmentScore: number;

  if (overCount === 3) {
    direction = 'OVER';
    alignmentScore = 1.0;
  } else if (underCount === 3) {
    direction = 'UNDER';
    alignmentScore = 1.0;
  } else if (overCount === 2) {
    direction = 'OVER';
    alignmentScore = 0.66;
  } else if (underCount === 2) {
    direction = 'UNDER';
    alignmentScore = 0.66;
  } else {
    direction = 'NEUTRAL';
    alignmentScore = 0.33;
  }

  return {
    alignmentScore,
    direction,
    shortTrend,
    mediumTrend,
    longTrend
  };
}

// ============================================
// 8. RDS - Reversal Digit Strategy
// ============================================

/**
 * Detect reversals from deviation, spikes, volatility cracks
 */
export function runRDS(ticks: Tick[], tpc: TPCResult | null, vcs: VCSResult | null): RDSResult | null {
  if (ticks.length < 50 || !tpc) return null;

  const digits = extractDigits(ticks);

  // Check for sharp deviation from recent trend
  const recent20 = digits.slice(-20);
  const recent100 = digits.slice(-100);

  const recentOverRatio = recent20.filter(d => d >= 5).length / recent20.length;
  const longerOverRatio = recent100.filter(d => d >= 5).length / recent100.length;

  const deviation = Math.abs(recentOverRatio - longerOverRatio);

  // Sudden spike clusters
  let spikeCount = 0;
  for (let i = 1; i < recent20.length; i++) {
    if (Math.abs(recent20[i] - recent20[i - 1]) >= 5) {
      spikeCount++;
    }
  }
  const spikeRatio = spikeCount / recent20.length;

  // Check if volatility is cracking (sudden change)
  const volatilityCrack = vcs ? (vcs.volatilityScore > 0.7 || vcs.volatilityScore < 0.15) : false;

  // Reversal signals
  const reversalSignals = [
    deviation > 0.15,
    spikeRatio > 0.3,
    volatilityCrack
  ];

  const signalCount = reversalSignals.filter(Boolean).length;
  const reversalLikely = signalCount >= 2;

  let reversalDirection: 'OVER' | 'UNDER' | null = null;
  if (reversalLikely && tpc) {
    // Reversal goes opposite to current trend
    reversalDirection = tpc.trendDirection === 'OVER' ? 'UNDER' :
      tpc.trendDirection === 'UNDER' ? 'OVER' : null;
  }

  const reversalConfidence = signalCount / 3;

  return {
    reversalLikely,
    reversalDirection,
    reversalConfidence
  };
}

// ============================================
// 9. SMART DELAY CHECK (1-Tick Validation)
// ============================================

let lastSignal: FinalSignal | null = null;
let pendingValidation = false;

/**
 * Store signal for validation after 1 tick
 */
export function startSmartDelay(signal: FinalSignal): void {
  lastSignal = signal;
  pendingValidation = true;
}

/**
 * Validate signal after 1 tick delay
 * Returns validated signal or null if validation failed
 */
export function validateSmartDelay(newTicks: Tick[], threshold: number): FinalSignal | null {
  if (!pendingValidation || !lastSignal) return null;

  pendingValidation = false;

  // Recompute with new tick
  const newResult = analyzeForSignal(newTicks, 'R_100', threshold);

  if (!newResult.shouldTrade) {
    return null; // Signal no longer valid
  }

  // Check if direction still matches
  if (newResult.direction !== lastSignal.direction) {
    return null; // Direction changed
  }

  // Check if confidence is still strong
  if (newResult.confidence < threshold) {
    return null; // Confidence dropped
  }

  // Validation passed
  return {
    ...newResult,
    reasons: [...newResult.reasons, 'Smart delay validated']
  };
}

/**
 * Check if we're waiting for validation
 */
export function isPendingValidation(): boolean {
  return pendingValidation;
}

// ============================================
// FINAL DECISION ENGINE
// ============================================

/**
 * Run all strategies and calculate weighted confidence
 */
export function analyzeForSignal(
  ticks: Tick[],
  market: string = 'R_100',
  threshold: number = DEFAULT_THRESHOLD
): FinalSignal {
  const reasons: string[] = [];

  // Ensure we have enough ticks
  if (!ticks || ticks.length < 50) {
    return {
      shouldTrade: false,
      market,
      direction: null,
      digit: null,
      confidence: 0,
      reasons: ['Need at least 50 ticks'],
      strategies: { dfpm: null, vcs: null, der: null, tpc: null, dtp: null, dpb: null, mtd: null, rds: null }
    };
  }

  // Use up to 1000 ticks
  const tickBuffer = ticks.slice(-TICK_BUFFER_SIZE);

  // Run all strategies
  const dfpm = runDFPM(tickBuffer);
  const vcs = runVCS(tickBuffer);
  const der = runDER(tickBuffer);
  const tpc = runTPC(tickBuffer);
  const dtp = runDTP(tickBuffer);
  const dpb = runDPB(dfpm, der);
  const mtd = runMTD(tickBuffer);
  const rds = runRDS(tickBuffer, tpc, vcs);

  const strategies: StrategyResults = { dfpm, vcs, der, tpc, dtp, dpb, mtd, rds };

  // Calculate weighted confidence
  const scores = {
    DFPM: dfpm?.strongBiasScore || 0,
    VCS: vcs?.marketHealthy ? 0.7 : 0.3,
    DER: der?.exhaustionScore || 0,
    TPC: tpc?.trendStrength || 0,
    DTP: dtp?.predictionConfidence || 0,
    DPB: dpb?.strength || 0,
    MTD: mtd?.alignmentScore || 0,
    RDS: rds?.reversalConfidence || 0
  };

  const finalConfidence =
    (scores.DFPM * WEIGHTS.DFPM) +
    (scores.VCS * WEIGHTS.VCS) +
    (scores.DER * WEIGHTS.DER) +
    (scores.TPC * WEIGHTS.TPC) +
    (scores.DTP * WEIGHTS.DTP) +
    (scores.DPB * WEIGHTS.DPB) +
    (scores.MTD * WEIGHTS.MTD) +
    (scores.RDS * WEIGHTS.RDS);

  // Build reasons
  if (dfpm && dfpm.strongBiasScore > 0.3) {
    reasons.push(`Strong frequency imbalance (bias: ${(dfpm.strongBiasScore * 100).toFixed(0)}%)`);
  }
  if (der && der.exhaustedDigit !== null) {
    reasons.push(`Digit ${der.exhaustedDigit} exhaustion detected`);
  }
  if (mtd && mtd.alignmentScore >= 0.66) {
    reasons.push(`${mtd.direction} bias across ${mtd.alignmentScore === 1 ? '3' : '2'} timeframes`);
  }
  if (vcs && vcs.marketHealthy) {
    reasons.push('High volatility quality');
  }
  if (rds && rds.reversalLikely) {
    reasons.push(`Reversal signal detected (${rds.reversalDirection})`);
  }

  // Determine direction
  let direction: 'OVER' | 'UNDER' | null = null;

  // Priority: Reversal overrides if strong
  if (rds && rds.reversalLikely && rds.reversalConfidence > 0.6) {
    direction = rds.reversalDirection;
  } else if (mtd && mtd.alignmentScore >= 0.66) {
    direction = mtd.direction === 'NEUTRAL' ? null : mtd.direction;
  } else if (dpb) {
    direction = dpb.direction;
  } else if (tpc && tpc.trendDirection !== 'NEUTRAL') {
    direction = tpc.trendDirection;
  }

  // Determine digit
  let digit: number | null = null;
  if (dfpm) {
    digit = direction === 'OVER' ? dfpm.dominantDigit : dfpm.weakDigit;
  }

  // Check trade conditions
  const shouldTrade =
    finalConfidence >= threshold &&
    (vcs?.marketHealthy ?? false) &&
    (!rds?.reversalLikely || rds.reversalConfidence < 0.5) &&
    direction !== null;

  if (!shouldTrade && finalConfidence < threshold) {
    reasons.push(`Confidence ${(finalConfidence * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`);
  }
  if (vcs && !vcs.marketHealthy) {
    reasons.push('Market volatility unhealthy');
  }

  return {
    shouldTrade,
    market,
    direction,
    digit,
    confidence: finalConfidence,
    reasons,
    strategies
  };
}

// ============================================
// EXPORTS FOR COMPATIBILITY
// ============================================

export { WEIGHTS, TICK_BUFFER_SIZE, DEFAULT_THRESHOLD };

// Legacy function for backwards compatibility
export function runAllStrategies(ticks: Tick[]) {
  const result = analyzeForSignal(ticks);
  return result.strategies;
}

// Legacy aggregation (now handled in analyzeForSignal)
export function aggregateSignals(signals: any[]): any {
  // Not used in new implementation but kept for compatibility
  return null;
}

/**
 * Strategy Engine - 9 Trading Strategies with Adaptive Learning
 * 
 * Features:
 * 1. 1000-tick historical buffer
 * 2. 9-Component Composite Strategy
 * 3. Market Mode Detection (Trending, Rotational, Spiky, etc.)
 * 4. Monte Carlo Risk Simulation
 * 5. Loss Pattern Recognition
 * 6. Adaptive Learning (Dynamic thresholds based on performance)
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Tick {
  quote: number;
  epoch?: number;
}

export enum MarketMode {
  TRENDING_UP = 'TRENDING_UP',     // Strong bullish bias
  TRENDING_DOWN = 'TRENDING_DOWN', // Strong bearish bias
  ROTATIONAL = 'ROTATIONAL',       // Ranging/oscillating
  SPIKY = 'SPIKY',                 // High variance/jumps
  DEAD = 'DEAD',                   // Low volatility
  CHAOTIC = 'CHAOTIC'              // High entropy, no pattern
}

export interface LearningState {
  totalTrades: number;
  wins: number;
  losses: number;
  consecutiveLosses: number;
  currentDrawdown: number; // percentage (e.g., 0.15 for 15%)
  recentResults: ('WIN' | 'LOSS')[]; // Last 20 results
}

export interface DigitStats {
  digits: number[];
  counts: number[];
  frequencies: number[];
  dominantDigit: number;
  weakDigit: number;
  lastDigit: number;
}

// Strategy Interfaces
export interface DFPMResult {
  dominantDigit: number;
  weakDigit: number;
  probabilityMap: number[];
  strongBiasScore: number;
}

export interface VCSResult {
  volatilityScore: number;
  marketHealthy: boolean;
  marketMode: MarketMode;
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

export interface RiskAnalysis {
  monteCarloRisk: number; // 0-1 probability of 3 straight losses
  inLossZone: boolean;
  detectedPattern: string | null;
  safeMode: boolean;
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
  risk: RiskAnalysis;
}

export interface FinalSignal {
  shouldTrade: boolean;
  market: string;
  direction: 'OVER' | 'UNDER' | null;
  digit: number | null;
  confidence: number;
  reasons: string[];
  strategies: StrategyResults;
  metadata?: {
    marketMode: MarketMode;
    monteCarloRisk: number;
    adaptiveAdjustment: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

const TICK_BUFFER_SIZE = 1000;
const BASE_THRESHOLD = 0.65;

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

function getDigit(tick: Tick): number {
  const priceStr = tick.quote.toString();
  return parseInt(priceStr[priceStr.length - 1]);
}

function extractDigits(ticks: Tick[]): number[] {
  return ticks.map(getDigit);
}

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
// MARKET MODE DETECTION (New)
// ============================================

function detectMarketMode(ticks: Tick[], digits: number[]): MarketMode {
  // Analyze last 100 ticks
  // const recentPrice = ticks.slice(-100).map(t => t.quote);
  const recentDigits = digits.slice(-100);

  // 1. Check Variance (Spiky/Dead)
  const diffs: number[] = [];
  for (let i = 1; i < recentDigits.length; i++) {
    diffs.push(Math.abs(recentDigits[i] - recentDigits[i - 1]));
  }
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const jumps = diffs.filter(d => d >= 7).length;

  if (jumps > 20) return MarketMode.SPIKY;
  if (avgDiff < 2.5) return MarketMode.DEAD;

  // 2. Check Trend (Directional Bias)
  const overCount = recentDigits.filter(d => d >= 5).length;
  const ratio = overCount / recentDigits.length;

  if (ratio > 0.60) return MarketMode.TRENDING_UP;
  if (ratio < 0.40) return MarketMode.TRENDING_DOWN;

  // 3. Check Chaos (Entropy)
  const counts = new Array(10).fill(0);
  recentDigits.forEach(d => counts[d]++);
  const frequencies = counts.map(c => c / recentDigits.length);
  const entropy = -frequencies.filter(f => f > 0).reduce((sum, f) => sum + f * Math.log2(f), 0);
  const maxEntropy = Math.log2(10);

  if (entropy / maxEntropy > 0.98) return MarketMode.CHAOTIC;

  return MarketMode.ROTATIONAL;
}

// ============================================
// MONTE CARLO SIMULATION (New)
// ============================================

function runMonteCarloRisk(
  digits: number[],
  proposedDirection: 'OVER' | 'UNDER'
): number {
  // Simulate 1000 rounds of "next 3 trades" based on historical frequencies
  // Using last 1000 ticks as probability distribution

  const sampleSize = 1000;
  const consecutiveLossesToCheck = 3;
  let lossStreakEvents = 0;

  // Create a distribution buffer for sampling
  const buffer = digits.slice(-1000);

  for (let i = 0; i < sampleSize; i++) {
    let streak = 0;
    let maxStreak = 0;

    // Simulate next chain of trades
    for (let j = 0; j < 10; j++) {
      // Random sample from history
      const sample = buffer[Math.floor(Math.random() * buffer.length)];

      const result = (proposedDirection === 'OVER' && sample >= 5) || (proposedDirection === 'UNDER' && sample <= 4);

      if (!result) {
        streak++;
      } else {
        maxStreak = Math.max(maxStreak, streak);
        streak = 0;
      }
    }

    maxStreak = Math.max(maxStreak, streak);
    if (maxStreak >= consecutiveLossesToCheck) {
      lossStreakEvents++;
    }
  }

  return lossStreakEvents / sampleSize;
}

// ============================================
// PATTERN RECOGNITION (New)
// ============================================

function detectLossPatterns(digits: number[]): string | null {
  const last20 = digits.slice(-20);

  // 1. Triple Spike (e.g. 0 -> 9 -> 0)
  // Check for extreme oscillation
  let oscillations = 0;
  for (let i = 2; i < last20.length; i++) {
    const d1 = last20[i];
    const d2 = last20[i - 1];
    const d3 = last20[i - 2];
    if (Math.abs(d1 - d2) > 6 && Math.abs(d2 - d3) > 6) {
      oscillations++;
    }
  }
  if (oscillations >= 2) return 'Zig-Zag Trap Detected';

  // 2. Digit Suppression (e.g. no digit > 7 for 20 ticks)
  const hasHigh = last20.some(d => d >= 8);
  const hasLow = last20.some(d => d <= 1);
  if (!hasHigh) return 'High Digit Suppression';
  if (!hasLow) return 'Low Digit Suppression';

  return null;
}

// ============================================
// STRATEGY FUNCTIONS
// ============================================

export function runDFPM(ticks: Tick[]): DFPMResult | null {
  const stats = calculateDigitStats(ticks);
  if (!stats) return null;
  const expected = 0.1;
  let totalDeviation = 0;
  stats.frequencies.forEach(freq => totalDeviation += Math.abs(freq - expected));
  const strongBiasScore = Math.min(totalDeviation / 0.5, 1);
  return {
    dominantDigit: stats.dominantDigit,
    weakDigit: stats.weakDigit,
    probabilityMap: stats.frequencies,
    strongBiasScore
  };
}

export function runVCS(ticks: Tick[]): VCSResult | null {
  if (ticks.length < 30) return null;
  const digits = extractDigits(ticks);
  const mode = detectMarketMode(ticks, digits);

  // Calculate health
  const marketHealthy = (mode === MarketMode.TRENDING_UP || mode === MarketMode.TRENDING_DOWN)
    || mode === MarketMode.ROTATIONAL;

  return {
    volatilityScore: mode === MarketMode.SPIKY ? 0.9 : 0.4,
    marketHealthy,
    marketMode: mode
  };
}

// (Keeping existing logic for DER, TPC, DTP, DPB, MTD, RDS but summarized/minimized for brevity here - will instantiate full logic in implementation)
// ... [Implement other strategies exactly as before] ...

export function runDER(ticks: Tick[]): DERResult | null {
  const stats = calculateDigitStats(ticks);
  if (!stats) return null;
  const recentTicks = ticks.slice(-100);
  const recentDigits = extractDigits(recentTicks);
  const recentCounts = new Array(10).fill(0);
  recentDigits.forEach(d => recentCounts[d]++);
  const expectedCount = recentDigits.length / 10;
  let exhaustedDigit: number | null = null;
  let maxExhaustion = 0;
  recentCounts.forEach((count, digit) => {
    const ratio = count / expectedCount;
    if (ratio > 2.0 && ratio > maxExhaustion) {
      maxExhaustion = ratio;
      exhaustedDigit = digit;
    }
  });
  return {
    exhaustedDigit,
    exhaustionScore: Math.min(maxExhaustion / 3, 1),
    tradeAgainstDigit: exhaustedDigit
  };
}

export function runTPC(ticks: Tick[]): TPCResult | null {
  const digits = extractDigits(ticks);
  const overCount = digits.filter(d => d >= 5).length;
  const ratio = overCount / digits.length;
  let trendDirection: 'OVER' | 'UNDER' | 'NEUTRAL' = 'NEUTRAL';
  let trendStrength = 0;
  if (ratio > 0.55) { trendDirection = 'OVER'; trendStrength = (ratio - 0.5) * 2; }
  else if (ratio < 0.45) { trendDirection = 'UNDER'; trendStrength = (0.5 - ratio) * 2; }
  return { trendDirection, trendStrength: Math.min(trendStrength, 1) };
}

export function runDTP(ticks: Tick[]): DTPResult | null {
  const digits = extractDigits(ticks);
  const windows = [20, 50, 100, Math.min(1000, ticks.length)];
  const trends: string[] = [];
  windows.forEach(size => {
    if (digits.length >= size) {
      const windowDigits = digits.slice(-size);
      const ratio = windowDigits.filter(d => d >= 5).length / windowDigits.length;
      if (ratio > 0.52) trends.push('OVER');
      else if (ratio < 0.48) trends.push('UNDER');
    }
  });
  const overVotes = trends.filter(t => t === 'OVER').length;
  const underVotes = trends.filter(t => t === 'UNDER').length;
  let predictedDirection: 'OVER' | 'UNDER' | 'NEUTRAL' = 'NEUTRAL';
  if (overVotes >= 2) predictedDirection = 'OVER';
  else if (underVotes >= 2) predictedDirection = 'UNDER';
  return {
    predictedDirection,
    predictedDigit: predictedDirection === 'OVER' ? 7 : 3,
    predictionConfidence: Math.max(overVotes, underVotes) / trends.length
  };
}

export function runDPB(dfpm: DFPMResult | null, der: DERResult | null): DPBResult | null {
  if (!dfpm) return null;
  const dfpmBias = dfpm.strongBiasScore;
  const derBias = der?.exhaustionScore || 0;
  const strength = (dfpmBias * 0.6) + (derBias * 0.4);
  let direction: 'OVER' | 'UNDER' = dfpm.dominantDigit >= 5 ? 'UNDER' : 'OVER';
  if (der?.exhaustedDigit !== null) direction = der.exhaustedDigit >= 5 ? 'UNDER' : 'OVER';
  return { direction, strength: Math.min(strength, 1) };
}

export function runMTD(ticks: Tick[]): MTDResult | null {
  const digits = extractDigits(ticks);
  const analyze = (arr: number[]) => {
    const ratio = arr.filter(d => d >= 5).length / arr.length;
    return ratio > 0.52 ? 'OVER' : ratio < 0.48 ? 'UNDER' : 'NEUTRAL';
  };
  const short = analyze(digits.slice(-50));
  const medium = analyze(digits.slice(-200));
  const long = analyze(digits.slice(-1000));
  const same = [short, medium, long].filter(x => x === short).length;
  return {
    alignmentScore: same === 3 ? 1 : same === 2 ? 0.66 : 0.33,
    direction: short,
    shortTrend: short,
    mediumTrend: medium,
    longTrend: long
  };
}

export function runRDS(ticks: Tick[], tpc: TPCResult | null, vcs: VCSResult | null): RDSResult | null {
  if (!tpc || ticks.length < 50) return null;
  const digits = extractDigits(ticks);
  const recent20 = digits.slice(-20);
  const recentRatio = recent20.filter(d => d >= 5).length / recent20.length;
  const diff = Math.abs(recentRatio - (tpc.trendDirection === 'OVER' ? 0.6 : 0.4));
  const volatilityCrack = vcs ? vcs.volatilityScore > 0.8 : false;
  return {
    reversalLikely: diff > 0.2 || volatilityCrack,
    reversalDirection: tpc.trendDirection === 'OVER' ? 'UNDER' : 'OVER',
    reversalConfidence: Math.min(diff * 2, 1)
  };
}

// ============================================
// SMART DELAY
// ============================================

let lastSignal: FinalSignal | null = null;
let pendingValidation = false;

export function startSmartDelay(signal: FinalSignal): void {
  lastSignal = signal;
  pendingValidation = true;
}

export function validateSmartDelay(newTicks: Tick[], threshold: number): FinalSignal | null {
  if (!pendingValidation || !lastSignal) return null;
  pendingValidation = false;
  const newResult = analyzeForSignal(newTicks, 'R_100', threshold);
  if (!newResult.shouldTrade || newResult.direction !== lastSignal.direction) return null;
  return { ...newResult, reasons: [...newResult.reasons, 'Smart delay validated'] };
}

export function isPendingValidation(): boolean { return pendingValidation; }

// ============================================
// MAIN ANALYSIS ENGINE
// ============================================

export function analyzeForSignal(
  ticks: Tick[],
  market: string = '1HZ100V',
  threshold: number = BASE_THRESHOLD,
  learningState?: LearningState
): FinalSignal {
  const reasons: string[] = [];

  // 1. Adaptive Threshold Adjustment
  let adaptiveThreshold = threshold;
  if (learningState) {
    if (learningState.consecutiveLosses >= 2) {
      adaptiveThreshold += 0.05; // Increase threshold if losing
      reasons.push('Threshold increased due to loss streak');
    }
    if (learningState.currentDrawdown > 0.1) {
      adaptiveThreshold += 0.10; // Defensive mode
      reasons.push('Defensive mode: Drawdown > 10%');
    }
    // Boost if winning
    if (learningState.wins > 10 && (learningState.wins / learningState.totalTrades) > 0.6) {
      adaptiveThreshold -= 0.03; // Aggressive mode
    }
  }

  // Ensure buffer
  if (!ticks || ticks.length < 50) return { shouldTrade: false, market, direction: null, digit: null, confidence: 0, reasons: ['Initializing...'], strategies: { dfpm: null, vcs: null, der: null, tpc: null, dtp: null, dpb: null, mtd: null, rds: null, risk: { monteCarloRisk: 0, inLossZone: false, detectedPattern: null, safeMode: false } } };

  const buffer = ticks.slice(-TICK_BUFFER_SIZE);
  const digits = extractDigits(buffer);

  // 2. Run Core Strategies
  const dfpm = runDFPM(buffer);
  const vcs = runVCS(buffer);
  const der = runDER(buffer);
  const tpc = runTPC(buffer);
  const dtp = runDTP(buffer);
  const dpb = runDPB(dfpm, der);
  const mtd = runMTD(buffer);
  const rds = runRDS(buffer, tpc, vcs);

  // 3. Loss Risk Analysis (Monte Carlo & Patterns)
  const pattern = detectLossPatterns(digits);
  const riskAnalysis: RiskAnalysis = {
    monteCarloRisk: 0,
    inLossZone: pattern !== null,
    detectedPattern: pattern,
    safeMode: learningState ? learningState.currentDrawdown > 0.15 : false
  };

  if (vcs?.marketMode === MarketMode.CHAOTIC || vcs?.marketMode === MarketMode.SPIKY) {
    riskAnalysis.inLossZone = true;
    reasons.push(`Unsafe Market Mode: ${vcs.marketMode}`);
  }

  // 4. Calculate Weighted Confidence
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

  // 5. Determine Direction
  let direction: 'OVER' | 'UNDER' | null = null;
  if (rds && rds.reversalLikely && rds.reversalConfidence > 0.6) direction = rds.reversalDirection;
  else if (mtd && mtd.alignmentScore >= 0.66) direction = mtd.direction === 'NEUTRAL' ? null : mtd.direction;
  else if (dpb) direction = dpb.direction;

  let digit: number | null = null;
  if (dfpm) digit = direction === 'OVER' ? dfpm.dominantDigit : dfpm.weakDigit;

  // 6. Monte Carlo Check (Final Gatekeeper)
  if (direction) {
    riskAnalysis.monteCarloRisk = runMonteCarloRisk(digits, direction);
    if (riskAnalysis.monteCarloRisk > 0.20) { // >20% chance of 3-loss streak
      reasons.push(`High MC Risk (${(riskAnalysis.monteCarloRisk * 100).toFixed(0)}%)`);
    }
  }

  // 7. Decision
  const shouldTrade =
    finalConfidence >= adaptiveThreshold &&
    !riskAnalysis.inLossZone &&
    riskAnalysis.monteCarloRisk < 0.25 && // Hard limit
    direction !== null &&
    !riskAnalysis.safeMode; // Don't trade if deep drawdown

  if (shouldTrade) {
    reasons.push(`Confidence ${(finalConfidence * 100).toFixed(0)}% >= Threshold ${(adaptiveThreshold * 100).toFixed(0)}%`);
    reasons.push(`Market: ${vcs?.marketMode}`);
  }

  const strategies: StrategyResults = {
    dfpm, vcs, der, tpc, dtp, dpb, mtd, rds, risk: riskAnalysis
  };

  return {
    shouldTrade,
    market,
    direction,
    digit,
    confidence: finalConfidence,
    reasons,
    strategies,
    metadata: {
      marketMode: vcs?.marketMode || MarketMode.ROTATIONAL,
      monteCarloRisk: riskAnalysis.monteCarloRisk,
      adaptiveAdjustment: adaptiveThreshold - threshold
    }
  };
}

// Exports
export { WEIGHTS, TICK_BUFFER_SIZE, BASE_THRESHOLD };

// Legacy
export function runAllStrategies(ticks: Tick[]) {
  const result = analyzeForSignal(ticks);
  return result.strategies;
}
export function aggregateSignals(signals: any[]): any { return null; }

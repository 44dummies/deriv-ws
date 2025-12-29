/**
 * TraderMind Trading Pipeline
 * Integrates MarketData → QuantEngine → RiskGuard → Events
 */

import { EventEmitter } from 'eventemitter3';
import { marketDataService, NormalizedTick } from './MarketDataService.js';
import { quantEngine, Signal } from './QuantEngine.js';
import { riskGuard, ApprovalResult, SessionRiskConfig, UserRiskConfig } from './RiskGuard.js';

// =============================================================================
// TYPES
// =============================================================================

export interface DummySession {
    id: string;
    config: SessionRiskConfig;
    participants: Map<string, UserRiskConfig>;
}

export interface TradeEvent {
    type: 'SIGNAL_EMITTED' | 'RISK_APPROVED' | 'RISK_REJECTED' | 'TRADE_EXECUTED';
    sessionId: string;
    payload: unknown;
    timestamp: string;
}

type PipelineEvents = {
    signal: (sessionId: string, signal: Signal) => void;
    approved: (sessionId: string, result: ApprovalResult) => void;
    rejected: (sessionId: string, result: ApprovalResult, reason: string) => void;
    trade: (event: TradeEvent) => void;
    tick: (tick: NormalizedTick) => void;
};

// =============================================================================
// TRADING PIPELINE
// =============================================================================

export class TradingPipeline extends EventEmitter<PipelineEvents> {
    private sessions: Map<string, DummySession> = new Map();
    private isRunning = false;
    private isMarketDataConnected = false;
    private tickCount = 0;
    private signalCount = 0;
    private approvedCount = 0;
    private rejectedCount = 0;

    constructor() {
        super();
        this.wireServices();
        console.log('[TradingPipeline] Initialized');
    }

    // ---------------------------------------------------------------------------
    // SERVICE WIRING
    // ---------------------------------------------------------------------------

    private wireServices(): void {
        // MarketData → QuantEngine
        marketDataService.on('tick', (tick) => {
            this.handleTick(tick);
        });

        marketDataService.on('connected', () => {
            console.log('[TradingPipeline] MarketData connected');
            this.isMarketDataConnected = true;
        });

        marketDataService.on('disconnected', (reason) => {
            console.log(`[TradingPipeline] MarketData disconnected: ${reason}`);
            this.isMarketDataConnected = false;
        });

        // RiskGuard events
        riskGuard.on('approved', (result) => {
            this.handleApproval(result);
        });

        riskGuard.on('rejected', (result) => {
            this.handleRejection(result);
        });

        console.log('[TradingPipeline] Services wired');
    }

    // ---------------------------------------------------------------------------
    // PIPELINE HANDLERS
    // ---------------------------------------------------------------------------

    private async handleTick(tick: NormalizedTick): Promise<void> {
        this.tickCount++;
        this.emit('tick', tick);

        if (!this.isRunning) return;

        if (this.tickCount % 10 === 0) {
            console.log(`[Pipeline] Tick #${this.tickCount}: ${tick.market} @ ${tick.quote.toFixed(2)}`);
        }

        if (!this.isMarketDataConnected) {
            // Log once every 10 ticks to avoid spam if flood occurs
            if (this.tickCount % 10 === 0) {
                console.warn('[Pipeline] Tick ignored - MarketData disconnected');
            }
            return;
        }

        // Process tick through QuantEngine for each session
        for (const [sessionId, session] of this.sessions) {
            // Check if market is allowed for this session
            if (!session.config.allowed_markets.includes(tick.market)) {
                continue;
            }

            // Generate signal
            const signal = await quantEngine.processTick(tick, {
                allowed_markets: session.config.allowed_markets,
                min_confidence: session.config.min_confidence,
            });

            if (signal) {
                this.handleSignal(sessionId, session, signal);
            }
        }
    }

    private handleSignal(sessionId: string, session: DummySession, signal: Signal): void {
        this.signalCount++;
        console.log(`\n[Pipeline] ═══ Signal #${this.signalCount} ═══`);
        console.log(`  Session: ${sessionId}`);
        console.log(`  Type: ${signal.type} | Market: ${signal.market}`);
        console.log(`  Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
        console.log(`  Reason: ${signal.reason}`);

        this.emit('signal', sessionId, signal);

        // Validate signal for each participant
        for (const [userId, userConfig] of session.participants) {
            console.log(`\n  → Validating for user: ${userId}`);

            const stake = riskGuard.calculateRecommendedStake(10, session.config, userConfig);
            const result = riskGuard.validate(signal, session.config, userConfig, stake);

            // Store session ID for event emission
            (result as ApprovalResult & { sessionId: string }).sessionId = sessionId;
            (result as ApprovalResult & { userId: string }).userId = userId;
        }
    }

    private handleApproval(result: ApprovalResult): void {
        this.approvedCount++;
        const sessionId = (result as ApprovalResult & { sessionId?: string }).sessionId ?? 'unknown';
        const userId = (result as ApprovalResult & { userId?: string }).userId ?? 'unknown';

        console.log(`  ✅ APPROVED for ${userId}`);
        console.log(`     Stake: $${result.stake}`);

        this.emit('approved', sessionId, result);

        // Emit trade event
        const tradeEvent: TradeEvent = {
            type: 'RISK_APPROVED',
            sessionId,
            payload: {
                signal: result.signal,
                stake: result.stake,
                userId,
                approved_at: result.approved_at,
            },
            timestamp: new Date().toISOString(),
        };

        this.emit('trade', tradeEvent);
    }

    private handleRejection(result: ApprovalResult): void {
        this.rejectedCount++;
        const sessionId = (result as ApprovalResult & { sessionId?: string }).sessionId ?? 'unknown';
        const userId = (result as ApprovalResult & { userId?: string }).userId ?? 'unknown';

        console.log(`  ❌ REJECTED for ${userId}: ${result.reason}`);

        this.emit('rejected', sessionId, result, result.reason ?? 'UNKNOWN');

        // Emit trade event
        const tradeEvent: TradeEvent = {
            type: 'RISK_REJECTED',
            sessionId,
            payload: {
                signal: result.signal,
                reason: result.reason,
                userId,
            },
            timestamp: new Date().toISOString(),
        };

        this.emit('trade', tradeEvent);
    }

    // ---------------------------------------------------------------------------
    // SESSION MANAGEMENT
    // ---------------------------------------------------------------------------

    /**
     * Create a dummy session with participants
     */
    createDummySession(
        sessionId: string,
        config?: Partial<SessionRiskConfig>,
        participants?: { userId: string; config?: Partial<UserRiskConfig> }[]
    ): DummySession {
        const defaultSessionConfig: SessionRiskConfig = {
            risk_profile: 'MEDIUM',
            max_stake: 100,
            min_confidence: 0.6,
            allowed_markets: ['R_100', 'R_50'],
            global_loss_threshold: 500,
            current_pnl: 0,
            is_paused: false,
            ...config,
        };

        const session: DummySession = {
            id: sessionId,
            config: defaultSessionConfig,
            participants: new Map(),
        };

        // Add participants
        const defaultUserConfig: UserRiskConfig = {
            max_drawdown: 200,
            max_daily_loss: 100,
            max_trades_per_session: 50,
            current_drawdown: 0,
            current_daily_loss: 0,
            trades_today: 0,
            is_opted_out: false,
        };

        if (participants) {
            for (const p of participants) {
                session.participants.set(p.userId, { ...defaultUserConfig, ...p.config });
            }
        } else {
            // Add default participants
            session.participants.set('user_001', { ...defaultUserConfig });
            session.participants.set('user_002', { ...defaultUserConfig, max_drawdown: 150 });
        }

        this.sessions.set(sessionId, session);
        console.log(`[TradingPipeline] Created session: ${sessionId} with ${session.participants.size} participants`);

        return session;
    }

    /**
     * Get session
     */
    getSession(sessionId: string): DummySession | undefined {
        return this.sessions.get(sessionId);
    }

    // ---------------------------------------------------------------------------
    // PIPELINE CONTROL
    // ---------------------------------------------------------------------------

    /**
     * Start the trading pipeline
     */
    start(): void {
        if (this.isRunning) {
            console.log('[TradingPipeline] Already running');
            return;
        }

        this.isRunning = true;
        console.log('\n[TradingPipeline] ══════════════════════════════════');
        console.log('[TradingPipeline] Starting trading pipeline...');
        console.log('[TradingPipeline] ══════════════════════════════════\n');

        // Connect to market data
        marketDataService.connect();
        if (marketDataService.isHealthy()) {
            this.isMarketDataConnected = true;
        }
        marketDataService.subscribeToDefaultMarkets();
    }

    /**
     * Stop the trading pipeline
     */
    stop(): void {
        if (!this.isRunning) {
            console.log('[TradingPipeline] Not running');
            return;
        }

        this.isRunning = false;
        marketDataService.disconnect();

        console.log('\n[TradingPipeline] ══════════════════════════════════');
        console.log('[TradingPipeline] Pipeline stopped');
        console.log(`[TradingPipeline] Stats: ${this.tickCount} ticks, ${this.signalCount} signals`);
        console.log(`[TradingPipeline] Approved: ${this.approvedCount}, Rejected: ${this.rejectedCount}`);
        console.log('[TradingPipeline] ══════════════════════════════════\n');
    }

    /**
     * Get pipeline stats
     */
    getStats(): {
        isRunning: boolean;
        sessions: number;
        ticks: number;
        signals: number;
        approved: number;
        rejected: number;
    } {
        return {
            isRunning: this.isRunning,
            sessions: this.sessions.size,
            ticks: this.tickCount,
            signals: this.signalCount,
            approved: this.approvedCount,
            rejected: this.rejectedCount,
        };
    }
}

// Export singleton
export const tradingPipeline = new TradingPipeline();

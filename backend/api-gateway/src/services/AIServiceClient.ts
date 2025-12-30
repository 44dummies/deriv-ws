/**
 * TraderMind AI Service Client
 * HTTP client for communicating with the Python AI layer
 */

import { EventEmitter } from 'eventemitter3';
import { IndicatorValues, Signal, SignalType, SignalReason } from './QuantEngine.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AIFeatureVector {
    rsi: number;
    ema_fast: number;
    ema_slow: number;
    sma_fast: number;
    sma_slow: number;
    momentum: number;
    volatility: number;
    atr: number;
    market: string;
}

export interface AIInferenceRequest {
    features: AIFeatureVector;
    session_id: string;
}

export interface AIInferenceResponse {
    signal_bias: 'CALL' | 'PUT' | 'NEUTRAL';
    confidence: number;
    reason: string;
    model_version: string;
    request_hash: string;
    mode?: 'LIVE' | 'SHADOW';
    market_regime?: string;
}

type AIClientEvents = {
    inference_success: (response: AIInferenceResponse) => void;
    inference_error: (error: Error) => void;
    fallback_triggered: (reason: string) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_AI_URL = 'http://localhost:8001';
const DEFAULT_TIMEOUT_MS = 5000;

// =============================================================================
// AI SERVICE CLIENT
// =============================================================================

export class AIServiceClient extends EventEmitter<AIClientEvents> {
    private baseUrl: string;
    private timeoutMs: number;
    private enabled: boolean;
    private failureCount = 0;
    private lastFailure: number | null = null;

    constructor(config: { baseUrl?: string; timeoutMs?: number; enabled?: boolean } = {}) {
        super();
        this.baseUrl = config.baseUrl ?? process.env.AI_LAYER_URL ?? DEFAULT_AI_URL;
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.enabled = config.enabled ?? false;

        console.log(`[AIServiceClient] Initialized (enabled: ${this.enabled}, url: ${this.baseUrl})`);
    }

    // ---------------------------------------------------------------------------
    // CONFIGURATION
    // ---------------------------------------------------------------------------

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        console.log(`[AIServiceClient] ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    // ---------------------------------------------------------------------------
    // INFERENCE
    // ---------------------------------------------------------------------------

    async infer(
        indicators: IndicatorValues,
        market: string,
        sessionId: string,
        modelId?: string,
        inputHash?: string
    ): Promise<AIInferenceResponse | null> {
        if (!this.enabled) {
            return null;
        }

        const features: AIFeatureVector = {
            rsi: indicators.rsi,
            ema_fast: indicators.emaFast,
            ema_slow: indicators.emaSlow,
            sma_fast: indicators.smaFast,
            sma_slow: indicators.smaSlow,
            momentum: indicators.momentum,
            volatility: indicators.volatility,
            atr: indicators.atr,
            market,
        };

        const request: AIInferenceRequest = {
            features,
            session_id: sessionId,
            model_id: modelId,
            input_hash: inputHash
        };

        try {
            const response = await this.callInferEndpoint(request);
            this.failureCount = 0;
            this.emit('inference_success', response);
            return response;
        } catch (error) {
            this.handleError(error as Error);
            return null;
        }
    }

    private async callInferEndpoint(request: AIInferenceRequest): Promise<AIInferenceResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(`${this.baseUrl}/infer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`AI inference failed: ${response.status} ${response.statusText}`);
            }

            return await response.json() as AIInferenceResponse;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private handleError(error: Error): void {
        this.failureCount++;
        this.lastFailure = Date.now();

        console.warn(`[AIServiceClient] Inference failed: ${error.message}`);
        this.emit('inference_error', error);
        this.emit('fallback_triggered', error.message);
    }

    // ---------------------------------------------------------------------------
    // SIGNAL CONVERSION
    // ---------------------------------------------------------------------------

    convertToSignal(
        aiResponse: AIInferenceResponse,
        market: string
    ): Signal | null {
        if (aiResponse.signal_bias === 'NEUTRAL') {
            return null;
        }

        const type: SignalType = aiResponse.signal_bias;

        // Map AI reason to our SignalReason type
        const reason = this.mapAIReason(aiResponse.reason);

        const now = new Date();
        const expiry = new Date(now.getTime() + 60000);

        return {
            type,
            confidence: aiResponse.confidence,
            reason,
            market,
            timestamp: now.toISOString(),
            expiry: expiry.toISOString(),
        };
    }

    private mapAIReason(aiReason: string): SignalReason {
        // Map AI reasons to our signal reasons
        if (aiReason.includes('RSI_OVERSOLD')) return 'RSI_OVERSOLD';
        if (aiReason.includes('RSI_OVERBOUGHT')) return 'RSI_OVERBOUGHT';
        if (aiReason.includes('EMA_BULLISH') || aiReason.includes('EMA_CROSS_UP')) return 'EMA_CROSS_UP';
        if (aiReason.includes('EMA_BEARISH') || aiReason.includes('EMA_CROSS_DOWN')) return 'EMA_CROSS_DOWN';
        if (aiReason.includes('SMA_BULLISH') || aiReason.includes('SMA_CROSS_UP')) return 'SMA_CROSS_UP';
        if (aiReason.includes('SMA_BEARISH') || aiReason.includes('SMA_CROSS_DOWN')) return 'SMA_CROSS_DOWN';
        if (aiReason.includes('MOMENTUM')) return 'MOMENTUM_SHIFT';
        if (aiReason.includes('VOLATILITY')) return 'VOLATILITY_SPIKE';
        return 'NO_SIGNAL';
    }

    // ---------------------------------------------------------------------------
    // HEALTH
    // ---------------------------------------------------------------------------

    async checkHealth(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`${this.baseUrl}/health`, {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }

    getStats(): { enabled: boolean; failureCount: number; lastFailure: number | null } {
        return {
            enabled: this.enabled,
            failureCount: this.failureCount,
            lastFailure: this.lastFailure,
        };
    }
}

// Export singleton
export const aiServiceClient = new AIServiceClient();

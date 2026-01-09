
import { createClient } from "@supabase/supabase-js";
import { quantEngine } from "./QuantEngine.js";
import { AIInferenceResponse } from "./AIServiceClient.js";
import { logger } from '../utils/logger.js';

// Initialize Admin Client (Bypass RLS for system logging)
const getSupabaseAdmin = () => {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseServiceKey) {
        logger.warn('[ShadowLogger] Missing Supabase credentials. Shadow signals will NOT be persisted.');
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

export class ShadowLogger {
    constructor() {
        logger.info('[ShadowLogger] Initialized');
        this.setupListeners();
    }

    private setupListeners() {
        quantEngine.on('shadow_signal', this.handleShadowSignal.bind(this));
    }

    private async handleShadowSignal(
        modelId: string,
        aiResponse: AIInferenceResponse,
        inputHash: string,
        market: string,
        sessionId: string
    ) {
        try {
            const supabaseAdmin = getSupabaseAdmin();
            if (!supabaseAdmin) return;

            const { error } = await supabaseAdmin
                .from('shadow_signals')
                .insert({
                    session_id: sessionId,
                    market: market,
                    model_id: modelId,
                    signal_bias: aiResponse.signal_bias,
                    confidence: aiResponse.confidence,
                    input_hash: inputHash,
                    metadata: aiResponse as any, // Store full response
                    created_at: new Date().toISOString()
                });

            if (error) {
                logger.error(`[ShadowLogger] Failed to log signal (${modelId})`, { errorMessage: error.message });
            }
        } catch (err) {
            logger.error('[ShadowLogger] Unexpected error', undefined, err instanceof Error ? err : new Error(String(err)));
        }
    }
}

// Singleton instance
export const shadowLogger = new ShadowLogger();

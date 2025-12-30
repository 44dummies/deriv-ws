
import { createClient } from "@supabase/supabase-js";
import { quantEngine, AIInferenceResponse } from "./QuantEngine.js";

// Initialize Admin Client (Bypass RLS for system logging)
const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[ShadowLogger] Missing Supabase credentials. Shadow signals will NOT be persisted.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export class ShadowLogger {
    constructor() {
        console.log('[ShadowLogger] Initialized');
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
                console.error(`[ShadowLogger] Failed to log signal (${modelId}): ${error.message}`);
            }
        } catch (err) {
            console.error('[ShadowLogger] Unexpected error:', err);
        }
    }
}

// Singleton instance
export const shadowLogger = new ShadowLogger();


import { AIOutput, AIInput } from '@tradermind/schemas';

export class AIServiceAdapter {
    private readonly AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

    /**
     * Get inference from AI Layer.
     * Returns null if service is down or errors (Safe Fallback).
     */
    public async getInference(features: AIInput['features']): Promise<AIOutput | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout

            const response = await fetch(`${this.AI_SERVICE_URL}/infer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ features }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`[AIService] Inference failed: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            return data as AIOutput;

        } catch (error) {
            console.error('[AIService] Inference error (fallback enabled):', error);
            // Circuit breaker / Fallback: Return null to allow rule-based signal to proceed
            return null;
        }
    }
}

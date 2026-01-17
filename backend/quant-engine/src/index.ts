/**
 * TraderMind QuantEngine Entry Point
 * Starts the full trading pipeline
 * 
 * INTEGRATION: Forwards approved trades to API Gateway via HTTP
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { tradingPipeline, TradeEvent } from './services/TradingPipeline.js';
import { logger } from './utils/logger.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'http://localhost:3000';
const ENABLE_API_FORWARDING = process.env['ENABLE_API_FORWARDING'] !== 'false';

// =============================================================================
// SETUP
// =============================================================================

logger.info('Starting Quant Engine... // Trigger Deployment');

logger.info('TraderMind QuantEngine v1.1', {
    flow: 'MarketData -> QuantEngine -> RiskGuard -> Events',
    config: {
        apiGateway: API_GATEWAY_URL,
        apiForwarding: ENABLE_API_FORWARDING ? 'ENABLED' : 'DISABLED'
    }
});
logger.info('QuantEngine ready. Use /start endpoint to begin trading.');

// =============================================================================
// API GATEWAY INTEGRATION
// =============================================================================

/**
 * Forward approved trades to API Gateway for execution
 */
async function forwardTradeToGateway(event: TradeEvent): Promise<void> {
    if (!ENABLE_API_FORWARDING) {
        logger.debug(`Skipping forward (disabled): ${event.type}`);
        return;
    }

    if (event.type !== 'RISK_APPROVED') {
        // Only forward approved trades
        return;
    }

    const payload = event.payload as {
        signal: unknown;
        stake: number;
        userId: string;
        approved_at: string;
    };

    try {
        const response = await fetch(`${API_GATEWAY_URL}/api/v1/trades/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'quant-engine',
                'X-Session-Id': event.sessionId,
            },
            body: JSON.stringify({
                sessionId: event.sessionId,
                userId: payload.userId,
                signal: payload.signal,
                stake: payload.stake,
                source: 'QUANT_ENGINE',
                approved_at: payload.approved_at,
            }),
            signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (response.ok) {
            const result = await response.json() as { tradeId?: string };
            logger.info('Trade forwarded to Gateway', { tradeId: result.tradeId || 'pending' });
        } else {
            const error = await response.text();
            logger.error('Gateway rejected trade', { status: response.status, error });
        }
    } catch (err) {
        logger.error('Failed to reach Gateway', { error: err instanceof Error ? err.message : err });
    }
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

tradingPipeline.on('trade', (event) => {
    logger.info(`Event: ${event.type}`, {
        session: event.sessionId,
        payload: event.payload,
        timestamp: event.timestamp
    });

    // Forward approved trades to API Gateway
    void forwardTradeToGateway(event);
});

// =============================================================================
// HTTP SERVER (Health & Stats & Control)
// =============================================================================

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const setCors = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
    };

    if (req.url === '/health') {
        setCors();
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'quant-engine',
            apiGateway: API_GATEWAY_URL,
            apiForwarding: ENABLE_API_FORWARDING,
            pipeline: tradingPipeline.getStats(),
        }));
    } else if (req.url === '/stats') {
        setCors();
        res.writeHead(200);
        res.end(JSON.stringify(tradingPipeline.getStats()));
    } else if (req.url === '/start' && req.method === 'POST' || req.url === '/start') {
        tradingPipeline.start();
        setCors();
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Pipeline started' }));
    } else if (req.url === '/stop' && req.method === 'POST' || req.url === '/stop') {
        tradingPipeline.stop();
        setCors();
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Pipeline stopped', stats: tradingPipeline.getStats() }));
    } else {
        setCors();
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// =============================================================================
// START
// =============================================================================

const PORT = process.env['PORT'] ?? 3001;
server.listen(PORT, () => {
    logger.info(`QuantEngine HTTP server running on port ${PORT}`, {
        endpoints: ['/health', '/stats', '/start', '/stop']
    });
    logger.info('Ready for connections. Pipeline must be started manually via /start');
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
    logger.info('Shutting down...');
    tradingPipeline.stop();
    server.close();
    process.exit(0);
});

export { tradingPipeline, server };


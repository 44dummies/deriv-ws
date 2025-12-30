/**
 * TraderMind QuantEngine Entry Point
 * Starts the full trading pipeline
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { tradingPipeline } from './services/TradingPipeline.js';

// =============================================================================
// SETUP
// =============================================================================

console.log('═══════════════════════════════════════════════');
console.log('  TraderMind QuantEngine v1.0');
console.log('  MarketData → QuantEngine → RiskGuard → Events');
console.log('═══════════════════════════════════════════════\n');

// Create dummy session with participants
console.log('[Main] Creating demo session...');
const session = tradingPipeline.createDummySession('demo_session_001', {
    risk_profile: 'MEDIUM',
    min_confidence: 0.5, // Lower for demo
    allowed_markets: ['R_100', 'R_50'],
}, [
    { userId: 'trader_alice', config: { max_drawdown: 200 } },
    { userId: 'trader_bob', config: { max_drawdown: 150, current_drawdown: 50 } },
]);

console.log(`[Main] Session: ${session.id}`);
console.log(`[Main] Participants: ${Array.from(session.participants.keys()).join(', ')}`);
console.log(`[Main] Markets: ${session.config.allowed_markets.join(', ')}`);
console.log(`[Main] Risk Profile: ${session.config.risk_profile}\n`);

// =============================================================================
// EVENT LISTENERS
// =============================================================================

tradingPipeline.on('trade', (event) => {
    console.log(`\n[Event] ${event.type} @ ${event.timestamp}`);
    console.log(`  Session: ${event.sessionId}`);
    console.log(`  Payload: ${JSON.stringify(event.payload).slice(0, 100)}...`);
});

// =============================================================================
// HTTP SERVER (Health & Stats)
// =============================================================================

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'quant-engine',
            pipeline: tradingPipeline.getStats(),
        }));
    } else if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tradingPipeline.getStats()));
    } else if (req.url === '/start') {
        tradingPipeline.start();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Pipeline started' }));
    } else if (req.url === '/stop') {
        tradingPipeline.stop();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Pipeline stopped', stats: tradingPipeline.getStats() }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// =============================================================================
// START
// =============================================================================

const PORT = process.env['PORT'] ?? 3001;
server.listen(PORT, () => {
    console.log(`[Main] QuantEngine HTTP server on port ${PORT}`);
    console.log('[Main] Endpoints: /health, /stats, /start, /stop');
    console.log('\n[Main] Starting trading pipeline in 2 seconds...\n');

    // Auto-start pipeline after 2 seconds
    setTimeout(() => {
        tradingPipeline.start();
    }, 2000);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
    console.log('\n[Main] Shutting down...');
    tradingPipeline.stop();
    server.close();
    process.exit(0);
});

export { tradingPipeline, server };

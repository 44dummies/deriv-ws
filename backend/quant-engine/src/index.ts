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

// PRODUCTION READY: No auto-start
// Sessions and pipeline start are managed via API endpoints
console.log('[Main] QuantEngine ready. Use /start endpoint to begin trading.');
console.log('[Main] Production mode: Auto-start disabled.\n');

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
    console.log('[Main] Ready for connections. Pipeline must be started manually via /start\n');
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

/**
 * Sessions Routes (SIMPLIFIED)
 * Each user creates and owns their own session. No participants concept.
 */

import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateSessionCreation, validatePagination } from '../middleware/validation.js';
import { sessionRegistry, SessionState } from '../services/SessionRegistry.js';
import { marketDataService } from '../services/MarketDataService.js';
import { quantAdapter } from '../services/QuantEngineAdapter.js';
import { integrateWSWithSessions } from '../services/WSIntegration.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Simplified session serialization - no participants
function serializeSession(session: SessionState) {
    return {
        id: session.id,
        status: session.status,
        config_json: session.config_json,
        created_at: session.created_at,
        started_at: session.started_at,
        completed_at: session.completed_at,
        owner_id: session.admin_id
    };
}

async function upsertSession(session: SessionState): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('sessions')
        .upsert({
            id: session.id,
            status: session.status,
            config_json: session.config_json,
            created_at: session.created_at,
            started_at: session.started_at,
            completed_at: session.completed_at,
            admin_id: session.admin_id
        }, { onConflict: 'id' });

    if (error) {
        logger.error('Sessions DB upsert failed', { error, sessionId: session.id });
    }
}

function ensurePipelineStarted(config?: SessionState['config_json']): void {
    try {
        integrateWSWithSessions();

        if (!marketDataService.isHealthy()) {
            marketDataService.start();
        }

        if (!quantAdapter.isRunning()) {
            quantAdapter.start(config);
        } else if (config) {
            quantAdapter.updateConfig(config);
        }

        const allowedMarkets = config?.allowed_markets;
        if (allowedMarkets && allowedMarkets.length > 0) {
            allowedMarkets.forEach((market) => marketDataService.subscribe(market));
        } else {
            marketDataService.subscribeToDefaults();
        }
    } catch (error) {
        logger.error('Pipeline start failed', { error });
        throw error;
    }
}

function maybeStopPipeline(): void {
    const activeSessions = sessionRegistry.getActiveSessions();
    if (activeSessions.length === 0) {
        quantAdapter.stop();
        marketDataService.stop();
    }
}

// =============================================================================
// USER ROUTES - Each user manages their own session
// =============================================================================

// GET /sessions - List user's own sessions only
router.get('/', requireAuth, validatePagination, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';

        let sessions = sessionRegistry.listSessions();

        // Non-admin users only see their own sessions
        if (!isAdmin) {
            sessions = sessions.filter(s => s.admin_id === userId);
        }

        res.json({
            sessions: sessions.map(serializeSession),
            total: sessions.length,
            message: 'Sessions retrieved successfully',
        });
    } catch (error) {
        logger.error('Sessions list error', { error });
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

// GET /sessions/active - Get user's active session
router.get('/active', requireAuth, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        const allSessions = sessionRegistry.listSessions();
        const activeSession = allSessions.find((s) => {
            const isOwner = s.admin_id === userId;
            const isActive = s.status === 'ACTIVE' || s.status === 'RUNNING' || s.status === 'PAUSED';
            return isActive && isOwner;
        });

        if (!activeSession) {
            res.status(404).json({ error: 'No active session found' });
            return;
        }

        res.json(serializeSession(activeSession));
    } catch (error) {
        logger.error('Active sessions error', { error });
        res.status(500).json({ error: 'Failed to get active sessions' });
    }
});

// GET /sessions/:id - Get specific session (only if owner or admin)
router.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    try {
        const session = sessionRegistry.getSessionState(id);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        // Only owner or admin can view
        if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json(serializeSession(session));
    } catch (_error) {
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

// POST /sessions - Create new session for current user
router.post('/', requireAuth, validateSessionCreation, (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { config, id } = req.body;
        const sessionId = id || `sess_${randomUUID().slice(0, 8)}`;

        const session = sessionRegistry.createSession({
            id: sessionId,
            config_json: config || {},
            admin_id: req.user.id  // User is the owner
        });

        void upsertSession(session);

        res.status(201).json({
            success: true,
            session: serializeSession(session),
            message: 'Session created successfully'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// POST /sessions/:id/start - Start session (owner only)
router.post('/:id/start', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    // Only owner can start
    if (session.admin_id !== req.user?.id) {
        res.status(403).json({ error: 'Only session owner can start this session' });
        return;
    }

    try {
        const nextStatus = session.status === 'PAUSED' ? 'RUNNING' : 'ACTIVE';
        const updatedSession = session.status === nextStatus
            ? session
            : sessionRegistry.updateSessionStatus(id, nextStatus);

        ensurePipelineStarted(updatedSession.config_json);
        void upsertSession(updatedSession);

        res.json({
            success: true,
            session: serializeSession(updatedSession),
            message: 'Session started'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// POST /sessions/:id/resume - Resume paused session
router.post('/:id/resume', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id) {
        res.status(403).json({ error: 'Only session owner can resume this session' });
        return;
    }

    try {
        const updatedSession = sessionRegistry.updateSessionStatus(id, 'RUNNING');
        ensurePipelineStarted(updatedSession.config_json);
        void upsertSession(updatedSession);
        res.json({
            success: true,
            session: serializeSession(updatedSession),
            message: 'Session resumed'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// POST /sessions/:id/pause - Pause session (owner only)
router.post('/:id/pause', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id) {
        res.status(403).json({ error: 'Only session owner can pause this session' });
        return;
    }

    try {
        const updatedSession = sessionRegistry.updateSessionStatus(id, 'PAUSED');
        void upsertSession(updatedSession);
        maybeStopPipeline();
        res.json({
            success: true,
            session: serializeSession(updatedSession),
            message: 'Session paused'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// POST /sessions/:id/stop - Stop session (owner only)
router.post('/:id/stop', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id) {
        res.status(403).json({ error: 'Only session owner can stop this session' });
        return;
    }

    try {
        const updatedSession = sessionRegistry.updateSessionStatus(id, 'COMPLETED');
        void upsertSession(updatedSession);
        maybeStopPipeline();
        res.json({
            success: true,
            session: serializeSession(updatedSession),
            message: 'Session completed'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /sessions/:id - Delete session (owner only)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only session owner can delete this session' });
        return;
    }

    try {
        const success = sessionRegistry.deleteSession(id);
        if (!success) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (supabase) {
            await supabase.from('sessions').delete().eq('id', id);
        }
        maybeStopPipeline();
        res.json({ success: true, message: 'Session deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;

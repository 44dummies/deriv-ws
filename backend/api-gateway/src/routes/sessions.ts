/**
 * Sessions Routes
 * Real session management integrated with SessionRegistry
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

function serializeSession(session: SessionState) {
    return {
        id: session.id,
        status: session.status,
        config_json: session.config_json,
        created_at: session.created_at,
        started_at: session.started_at,
        completed_at: session.completed_at,
        participants: Array.from(session.participants.values()),
        participant_count: session.participants.size,
        admin_id: session.admin_id
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

async function upsertParticipant(sessionId: string, userId: string, status: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('participants')
        .upsert({
            session_id: sessionId,
            user_id: userId,
            status,
            joined_at: new Date().toISOString()
        }, { onConflict: 'user_id,session_id' });

    if (error) {
        logger.error('Participants DB upsert failed', { error, sessionId, userId });
    }
}

async function updateParticipantStatus(sessionId: string, userId: string, status: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('participants')
        .update({ status })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

    if (error) {
        logger.error('Participants DB update failed', { error, sessionId, userId });
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
// PUBLIC / USER ROUTES
// =============================================================================

// GET /sessions - List all visible sessions
// Protected: Only authenticated users needed
router.get('/', requireAuth, validatePagination, (_req: AuthRequest, res: Response) => {
    try {
        const sessions = sessionRegistry.listSessions().map(serializeSession);
        res.json({
            sessions,
            total: sessions.length,
            message: 'Sessions retrieved successfully',
        });
    } catch (error) {
        logger.error('Sessions list error', { error });
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

// GET /sessions/active - Get active/running sessions for current user
router.get('/active', requireAuth, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        const allSessions = sessionRegistry.listSessions();
        const activeSession = allSessions.find((s: any) => {
            const isParticipant = s.participants instanceof Map
                ? s.participants.has(userId)
                : s.participants?.some((p: any) => p.user_id === userId);
            const isActive = s.status === 'ACTIVE' || s.status === 'RUNNING' || s.status === 'PAUSED';
            return isActive && (s.admin_id === userId || isParticipant);
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

// GET /sessions/:id - Get specific session details
router.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }
    try {
        const session = sessionRegistry.getSessionState(id);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json(serializeSession(session));
    } catch (_error) {
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

// POST /sessions/:id/join - User joins session
router.post('/:id/join', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized: No user ID.' });
        return;
    }

    try {
        const participant = sessionRegistry.addParticipant(id, req.user.id);
        void upsertParticipant(id, req.user.id, participant.status);
        res.json({
            success: true,
            participant,
            message: 'Joined session successfully'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// POST /sessions/:id/leave - User leaves session
router.post('/:id/leave', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const success = sessionRegistry.removeParticipant(id, req.user.id);
        if (!success) {
            res.status(400).json({ error: 'User not in session' });
            return;
        }
        void updateParticipantStatus(id, req.user.id, 'REMOVED');
        res.json({ success: true, message: 'Left session successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// =============================================================================
// ADMIN ROUTES (RBAC) - Now also allows authenticated users
// =============================================================================

// POST /sessions - Create new session (Now allows any authenticated user)
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
            admin_id: req.user.id  // Creator becomes the session admin
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

// POST /sessions/:id/start - Start session (owner or admin)
router.post('/:id/start', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    // Check if user is session owner or admin
    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only session owner or admin can start this session' });
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

    if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only session owner or admin can resume this session' });
        return;
    }

    try {
        // Resume transitions PAUSED -> RUNNING
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

// POST /sessions/:id/pause - Pause session (owner or admin)
router.post('/:id/pause', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only session owner or admin can pause this session' });
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

// POST /sessions/:id/stop - Stop session (owner or admin)
router.post('/:id/stop', requireAuth, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only session owner or admin can stop this session' });
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

// DELETE /sessions/:id - Delete session (owner or admin)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    if (!id) { res.status(400).json({ error: 'Missing ID' }); return; }

    const session = sessionRegistry.getSessionState(id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (session.admin_id !== req.user?.id && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only session owner or admin can delete this session' });
        return;
    }

    try {
        const success = sessionRegistry.deleteSession(id);
        if (!success) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (supabase) {
            await supabase.from('participants').delete().eq('session_id', id);
            await supabase.from('sessions').delete().eq('id', id);
        }
        maybeStopPipeline();
        res.json({ success: true, message: 'Session deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;

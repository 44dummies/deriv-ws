/**
 * Sessions Routes
 * Real session management integrated with SessionRegistry
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { sessionRegistry } from '../services/SessionRegistry.js';
import { randomUUID } from 'crypto';

const router = Router();

// =============================================================================
// PUBLIC / USER ROUTES
// =============================================================================

// GET /sessions - List all visible sessions
// Protected: Only authenticated users needed
router.get('/', requireAuth, (_req: AuthRequest, res: Response) => {
    try {
        const sessions = sessionRegistry.listSessions();
        res.json({
            sessions,
            total: sessions.length,
            message: 'Sessions retrieved successfully',
        });
    } catch (error) {
        console.error('[Sessions] List error:', error);
        res.status(500).json({ error: 'Failed to list sessions' });
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
        res.json(session);
    } catch (error) {
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
        res.json({ success: true, message: 'Left session successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// =============================================================================
// ADMIN ROUTES (RBAC) - Now also allows authenticated users
// =============================================================================

// POST /sessions - Create new session (Now allows any authenticated user)
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
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

        res.status(201).json({
            success: true,
            session,
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
        const updatedSession = sessionRegistry.updateSessionStatus(id, 'ACTIVE');
        res.json({
            success: true,
            session: updatedSession,
            message: 'Session started'
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
        res.json({
            success: true,
            session: updatedSession,
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
        res.json({
            success: true,
            session: updatedSession,
            message: 'Session completed'
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /sessions/:id - Delete session (owner or admin)
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
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
        res.json({ success: true, message: 'Session deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;

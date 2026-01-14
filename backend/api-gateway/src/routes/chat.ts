import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// AI layer has been removed from this codebase
// This endpoint is kept for backwards compatibility but returns unavailable
router.post('/', requireAuth, async (req, res) => {
    logger.warn('Chat endpoint called but AI layer is not available');
    res.status(503).json({ 
        response: 'AI chat functionality is currently unavailable. The AI layer has been removed from this version.'
    });
});

export default router;

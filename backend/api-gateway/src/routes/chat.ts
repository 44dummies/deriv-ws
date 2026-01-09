import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const AI_LAYER_URL = process.env.AI_LAYER_URL || 'http://localhost:8001';
const AI_LAYER_ENABLED = process.env.ENABLE_AI_LAYER === 'true';

router.post('/', requireAuth, async (req, res) => {
    try {
        if (!AI_LAYER_ENABLED) {
            res.status(503).json({ response: 'AI layer is disabled.' });
            return;
        }

        const { message, role, context } = req.body;

        const response = await fetch(`${AI_LAYER_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, role, context })
        });

        if (!response.ok) {
            throw new Error(`AI Layer responded with ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        logger.error('Chat Proxy Error', { error });
        res.status(503).json({
            response: "AI layer is currently unavailable."
        });
    }
});

export default router;

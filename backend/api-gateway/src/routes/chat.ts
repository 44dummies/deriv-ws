import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

const AI_LAYER_URL = process.env.AI_LAYER_URL || 'http://localhost:8001';

router.post('/', async (req, res) => {
    try {
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
            response: "Connection to TraderMind AI (Ollama) is currently unavailable."
        });
    }
});

export default router;

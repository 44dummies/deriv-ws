/**
 * Admin Routes Index
 * Combines all admin routes
 */

const express = require('express');
const router = express.Router();

const sessionsRouter = require('./sessions');
const botRouter = require('./bot');
const notificationsRouter = require('./notifications');
const statsRouter = require('./stats');
const logsRouter = require('./logs');

// Mount all admin routes
router.use('/sessions', sessionsRouter);
router.use('/bot', botRouter);
router.use('/notifications', notificationsRouter);
router.use('/stats', statsRouter);
router.use('/logs', logsRouter);

module.exports = router;

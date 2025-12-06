/**
 * User Routes Index
 * Combines all user routes
 */

const express = require('express');
const router = express.Router();

const dashboardRouter = require('./dashboard');
const tpslRouter = require('./tpsl');
const sessionsRouter = require('./sessions');
const notificationsRouter = require('./notifications');
const statsRouter = require('./stats');

// Mount all user routes
router.use('/dashboard', dashboardRouter);
router.use('/tpsl', tpslRouter);
router.use('/sessions', sessionsRouter);
router.use('/notifications', notificationsRouter);
router.use('/stats', statsRouter);

module.exports = router;

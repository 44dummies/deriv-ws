/**
 * Bot Engine Service
 * Main trading bot that orchestrates tick collection, analysis, and trade execution
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../db/supabase');
const { tickCollector } = require('./tickCollector');
const { analyzeForSignal } = require('./analysisEngine');
const { tradeExecutor } = require('./tradeExecutor');
const { sessionManager } = require('./sessionManager');

// Bot states
const BOT_STATE = {
    STOPPED: 'stopped',
    STARTING: 'starting',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPING: 'stopping'
};

class BotEngine extends EventEmitter {
    constructor() {
        super();
        this.state = BOT_STATE.STOPPED;
        this.activeSessionId = null;
        this.lastSignal = null;
        this.tradesExecuted = 0;
        this.startTime = null;
        this.isProcessing = false;
        this.config = {
            minConfidence: 55,
            smartDelay: true,
            delayTicks: 1,
            maxTradesPerHour: 60
        };
        this.tradeCountThisHour = 0;
        this.hourResetInterval = null;
    }

    /**
     * Start the trading bot
     */
    async start(sessionId, config = {}) {
        if (this.state !== BOT_STATE.STOPPED) {
            throw new Error('Bot is already running or in transition');
        }

        this.state = BOT_STATE.STARTING;
        this.activeSessionId = sessionId;
        this.config = { ...this.config, ...config };

        try {
            // Verify session exists
            const session = await sessionManager.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            // Start session if pending
            if (session.status === 'pending') {
                await sessionManager.startSession(sessionId);
            }

            // Connect to tick stream
            await tickCollector.connect();

            // Subscribe to session markets
            const markets = session.markets || ['R_100'];
            tickCollector.subscribeToMarkets(markets);

            // Set up tick handler
            tickCollector.on('tick', this.handleTick.bind(this));
            tickCollector.on('disconnected', this.handleDisconnect.bind(this));

            // Reset hourly counter
            this.tradeCountThisHour = 0;
            this.hourResetInterval = setInterval(() => {
                this.tradeCountThisHour = 0;
            }, 3600000);

            this.state = BOT_STATE.RUNNING;
            this.startTime = Date.now();
            this.tradesExecuted = 0;

            // Log start
            await this.logActivity('bot_start', 'Trading bot started', {
                sessionId,
                markets,
                config: this.config
            });

            this.emit('started', { sessionId, markets });
            console.log('[BotEngine] Started for session:', sessionId);

            return { success: true, message: 'Bot started' };

        } catch (error) {
            this.state = BOT_STATE.STOPPED;
            this.activeSessionId = null;
            throw error;
        }
    }

    /**
     * Stop the trading bot
     */
    async stop() {
        if (this.state === BOT_STATE.STOPPED) {
            return { success: false, message: 'Bot is not running' };
        }

        this.state = BOT_STATE.STOPPING;

        try {
            // Remove tick handler
            tickCollector.removeAllListeners('tick');
            tickCollector.removeAllListeners('disconnected');

            // Disconnect tick stream
            tickCollector.disconnect();

            // Disconnect all trading accounts
            tradeExecutor.disconnectAll();

            // Stop session
            if (this.activeSessionId) {
                await sessionManager.stopSession(this.activeSessionId);
            }

            // Clear interval
            if (this.hourResetInterval) {
                clearInterval(this.hourResetInterval);
                this.hourResetInterval = null;
            }

            const uptime = Date.now() - this.startTime;

            // Log stop
            await this.logActivity('bot_stop', 'Trading bot stopped', {
                sessionId: this.activeSessionId,
                uptime,
                tradesExecuted: this.tradesExecuted
            });

            this.state = BOT_STATE.STOPPED;
            const sessionId = this.activeSessionId;
            this.activeSessionId = null;
            this.lastSignal = null;
            this.startTime = null;

            this.emit('stopped', { sessionId, uptime, tradesExecuted: this.tradesExecuted });
            console.log('[BotEngine] Stopped');

            return { success: true, message: 'Bot stopped' };

        } catch (error) {
            this.state = BOT_STATE.STOPPED;
            throw error;
        }
    }

    /**
     * Pause the bot
     */
    pause() {
        if (this.state !== BOT_STATE.RUNNING) {
            return { success: false, message: 'Bot is not running' };
        }
        this.state = BOT_STATE.PAUSED;
        this.emit('paused');
        return { success: true, message: 'Bot paused' };
    }

    /**
     * Resume the bot
     */
    resume() {
        if (this.state !== BOT_STATE.PAUSED) {
            return { success: false, message: 'Bot is not paused' };
        }
        this.state = BOT_STATE.RUNNING;
        this.emit('resumed');
        return { success: true, message: 'Bot resumed' };
    }

    /**
     * Emergency stop
     */
    async emergencyStop(reason = 'Manual override') {
        console.log('[BotEngine] EMERGENCY STOP:', reason);

        // Immediately disconnect everything
        tickCollector.disconnect();
        tradeExecutor.disconnectAll();

        // Cancel session
        if (this.activeSessionId) {
            await supabase
                .from('trading_sessions_v2')
                .update({
                    status: 'cancelled',
                    ended_at: new Date().toISOString()
                })
                .eq('id', this.activeSessionId);
        }

        // Log emergency
        await this.logActivity('bot_emergency_stop', reason, {
            sessionId: this.activeSessionId,
            tradesExecuted: this.tradesExecuted
        }, 'warning');

        // Reset state
        this.state = BOT_STATE.STOPPED;
        this.activeSessionId = null;
        this.lastSignal = null;
        this.isProcessing = false;

        this.emit('emergency_stop', { reason });

        return { success: true, message: 'Emergency stop executed' };
    }

    /**
     * Handle incoming tick
     */
    async handleTick(tickData) {
        // Skip if not running or already processing
        if (this.state !== BOT_STATE.RUNNING || this.isProcessing) {
            return;
        }

        // Check rate limit
        if (this.tradeCountThisHour >= this.config.maxTradesPerHour) {
            return;
        }

        this.isProcessing = true;

        try {
            const { market, history } = tickData;

            // Need enough history
            if (history.length < 50) {
                return;
            }

            // Analyze for signal
            const session = await sessionManager.getSession(this.activeSessionId);
            const analysis = analyzeForSignal(history, session?.strategy, this.config.minConfidence);

            if (analysis.shouldTrade) {
                // Smart delay - wait for revalidation
                if (this.config.smartDelay) {
                    await this.waitForTicks(this.config.delayTicks);

                    // Reanalyze
                    const newHistory = tickCollector.getTickHistory(market);
                    const reanalysis = analyzeForSignal(newHistory, session?.strategy, this.config.minConfidence);

                    if (!reanalysis.shouldTrade) {
                        console.log('[BotEngine] Signal invalidated after delay');
                        return;
                    }
                }

                // Process signal
                await this.processSignal(market, analysis.signal);
            }

        } catch (error) {
            console.error('[BotEngine] Tick processing error:', error);
            await this.logActivity('error', error.message, { stack: error.stack }, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process trading signal
     */
    async processSignal(market, signal) {
        console.log('[BotEngine] Processing signal:', signal);

        this.lastSignal = {
            ...signal,
            market,
            timestamp: new Date().toISOString()
        };

        // Log signal
        await this.logActivity('signal', `Signal generated: ${signal.contractType}`, {
            market,
            signal,
            sessionId: this.activeSessionId
        });

        try {
            // Get participants for trading
            const participants = await sessionManager.getParticipantsForTrading(this.activeSessionId);

            if (participants.length === 0) {
                console.log('[BotEngine] No active participants to trade');
                return;
            }

            console.log(`[BotEngine] Executing trades for ${participants.length} accounts`);

            // Get session for base stake
            const session = await sessionManager.getSession(this.activeSessionId);

            // Execute trades
            const result = await tradeExecutor.executeMultiAccountTrade(
                this.activeSessionId,
                { ...signal, market },
                participants,
                session.base_stake
            );

            this.tradesExecuted += result.successful;
            this.tradeCountThisHour += result.successful;

            // Log execution result
            await this.logActivity('trade_execution', `Trades executed: ${result.successful}/${result.totalAccounts}`, {
                sessionId: this.activeSessionId,
                result
            });

            this.emit('trades_executed', result);

        } catch (error) {
            console.error('[BotEngine] Trade execution error:', error);
            await this.logActivity('error', `Trade execution failed: ${error.message}`, {}, 'error');
        }
    }

    /**
     * Wait for N ticks
     */
    waitForTicks(count) {
        return new Promise((resolve) => {
            let received = 0;
            const handler = () => {
                received++;
                if (received >= count) {
                    tickCollector.off('tick', handler);
                    resolve();
                }
            };
            tickCollector.on('tick', handler);

            // Timeout after 5 seconds
            setTimeout(() => {
                tickCollector.off('tick', handler);
                resolve();
            }, 5000);
        });
    }

    /**
     * Handle tick stream disconnect
     */
    async handleDisconnect() {
        console.log('[BotEngine] Tick stream disconnected');

        if (this.state === BOT_STATE.RUNNING) {
            this.state = BOT_STATE.PAUSED;

            await this.logActivity('warning', 'Tick stream disconnected - bot paused', {
                sessionId: this.activeSessionId
            }, 'warning');

            this.emit('auto_paused', { reason: 'Tick stream disconnected' });
        }
    }

    /**
     * Log activity
     */
    async logActivity(type, message, metadata = {}, level = 'info') {
        await supabase
            .from('activity_logs_v2')
            .insert({
                id: uuidv4(),
                type,
                level,
                message,
                metadata,
                session_id: this.activeSessionId,
                created_at: new Date().toISOString()
            });
    }

    /**
     * Get bot status
     */
    getStatus() {
        return {
            state: this.state,
            isRunning: this.state === BOT_STATE.RUNNING,
            isPaused: this.state === BOT_STATE.PAUSED,
            activeSessionId: this.activeSessionId,
            startTime: this.startTime,
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            tradesExecuted: this.tradesExecuted,
            tradeCountThisHour: this.tradeCountThisHour,
            lastSignal: this.lastSignal,
            tickCollector: tickCollector.getStatus(),
            tradeExecutor: tradeExecutor.getStatus(),
            config: this.config
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this.config;
    }
}

// Singleton instance
const botEngine = new BotEngine();

module.exports = { BotEngine, botEngine, BOT_STATE };

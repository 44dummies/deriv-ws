/**
 * Trade Executor Service
 * Multi-account synchronized trade execution with TP/SL management
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../db/supabase');

const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

// Rate limiting
const RATE_LIMIT_DELAY = 500; // ms between trades

class TradeExecutor {
    constructor() {
        this.accountConnections = new Map(); // userId -> WebSocket
        this.activeContracts = new Map(); // contractId -> contract info
        this.balanceCache = new Map(); // userId -> balance
    }

    /**
     * Connect to Deriv API for an account
     */
    async connectAccount(userId, apiToken) {
        if (this.accountConnections.has(userId)) {
            const existing = this.accountConnections.get(userId);
            if (existing.readyState === WebSocket.OPEN) {
                return existing;
            }
        }

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(DERIV_WS_URL);

            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Connection timeout'));
            }, 15000);

            ws.on('open', () => {
                // Authorize
                ws.send(JSON.stringify({ authorize: apiToken }));
            });

            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());

                if (msg.authorize) {
                    clearTimeout(timeout);
                    this.accountConnections.set(userId, ws);
                    this.balanceCache.set(userId, msg.authorize.balance);
                    resolve(ws);
                }

                if (msg.error) {
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error(msg.error.message));
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Get account balance
     */
    async getBalance(userId, ws) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Balance timeout')), 5000);

            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.balance) {
                    clearTimeout(timeout);
                    ws.off('message', handler);
                    this.balanceCache.set(userId, msg.balance.balance);
                    resolve(msg.balance.balance);
                }
            };

            ws.on('message', handler);
            ws.send(JSON.stringify({ balance: 1, subscribe: 0 }));
        });
    }

    /**
     * Execute a single trade for one account
     */
    async executeTrade(userId, ws, tradeParams) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Trade execution timeout'));
            }, 30000);

            const buyRequest = {
                buy: 1,
                price: tradeParams.stake,
                parameters: {
                    contract_type: tradeParams.contractType,
                    symbol: tradeParams.market,
                    duration: tradeParams.duration || 1,
                    duration_unit: tradeParams.durationUnit || 't',
                    basis: 'stake',
                    amount: tradeParams.stake
                }
            };

            // Add prediction for digit contracts
            if (tradeParams.prediction !== null && tradeParams.prediction !== undefined) {
                buyRequest.parameters.barrier = tradeParams.prediction.toString();
            }

            const handler = (data) => {
                const msg = JSON.parse(data.toString());

                if (msg.buy) {
                    clearTimeout(timeout);
                    ws.off('message', handler);
                    resolve({
                        success: true,
                        contractId: msg.buy.contract_id,
                        transactionId: msg.buy.transaction_id,
                        buyPrice: msg.buy.buy_price,
                        startTime: msg.buy.start_time,
                        purchaseTime: msg.buy.purchase_time
                    });
                }

                if (msg.error && msg.msg_type === 'buy') {
                    clearTimeout(timeout);
                    ws.off('message', handler);
                    reject(new Error(msg.error.message));
                }
            };

            ws.on('message', handler);
            ws.send(JSON.stringify(buyRequest));
        });
    }

    /**
     * Monitor a contract for completion
     */
    async monitorContract(userId, ws, contractId) {
        return new Promise((resolve) => {
            const handler = (data) => {
                const msg = JSON.parse(data.toString());

                if (msg.proposal_open_contract && msg.proposal_open_contract.contract_id == contractId) {
                    const contract = msg.proposal_open_contract;

                    if (contract.is_sold || contract.is_expired) {
                        ws.off('message', handler);
                        ws.send(JSON.stringify({ forget_all: 'proposal_open_contract' }));

                        resolve({
                            contractId,
                            result: contract.profit >= 0 ? 'won' : 'lost',
                            profit: contract.profit,
                            sellPrice: contract.sell_price,
                            exitTick: contract.exit_tick,
                            exitTime: contract.exit_tick_time
                        });
                    }
                }
            };

            ws.on('message', handler);
            ws.send(JSON.stringify({
                proposal_open_contract: 1,
                contract_id: contractId,
                subscribe: 1
            }));
        });
    }

    /**
     * Execute trades for multiple accounts simultaneously
     */
    async executeMultiAccountTrade(sessionId, signal, accounts, baseStake) {
        const results = [];
        const startTime = Date.now();

        for (const account of accounts) {
            try {
                const ws = this.accountConnections.get(account.userId);
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    results.push({
                        userId: account.userId,
                        success: false,
                        error: 'Not connected'
                    });
                    continue;
                }

                // Check balance
                const balance = await this.getBalance(account.userId, ws);
                if (balance < account.minBalance) {
                    // Notify about low balance
                    await this.notifyUser(account.userId, 'low_balance',
                        `Balance (${balance}) is below minimum (${account.minBalance})`);

                    results.push({
                        userId: account.userId,
                        success: false,
                        error: 'Insufficient balance'
                    });
                    continue;
                }

                // Execute trade
                const tradeResult = await this.executeTrade(account.userId, ws, {
                    market: signal.market,
                    contractType: signal.contractType,
                    prediction: signal.prediction,
                    stake: account.stake || baseStake,
                    duration: 1,
                    durationUnit: 't'
                });

                // Log trade
                await this.logTrade({
                    sessionId,
                    userId: account.userId,
                    accountId: account.accountId,
                    contractId: tradeResult.contractId,
                    market: signal.market,
                    contractType: signal.contractType,
                    strategy: signal.strategies?.join(',') || 'UNKNOWN',
                    stake: account.stake || baseStake,
                    prediction: signal.prediction,
                    entryTick: null,
                    confidence: signal.confidence,
                    signalReason: signal.reasoning
                });

                // Start monitoring in background
                this.monitorTradeForTPSL(sessionId, account, tradeResult.contractId, ws);

                results.push({
                    userId: account.userId,
                    success: true,
                    contractId: tradeResult.contractId,
                    buyPrice: tradeResult.buyPrice
                });

                // Rate limiting
                await this.delay(RATE_LIMIT_DELAY);

            } catch (error) {
                console.error(`Trade execution error for user ${account.userId}:`, error);
                results.push({
                    userId: account.userId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            totalAccounts: accounts.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            executionTime: Date.now() - startTime,
            results
        };
    }

    /**
     * Monitor trade for TP/SL and handle removal
     */
    async monitorTradeForTPSL(sessionId, account, contractId, ws) {
        try {
            const result = await this.monitorContract(account.userId, ws, contractId);

            // Update trade log
            await supabase
                .from('trade_logs')
                .update({
                    result: result.result,
                    profit: result.profit,
                    exit_tick: result.exitTick,
                    closed_at: new Date().toISOString()
                })
                .eq('contract_id', contractId);

            // Update participant PnL
            const { data: participant } = await supabase
                .from('session_participants')
                .select('current_pnl, tp, sl')
                .eq('session_id', sessionId)
                .eq('user_id', account.userId)
                .single();

            if (participant) {
                const newPnl = (participant.current_pnl || 0) + result.profit;

                // Check TP/SL
                if (newPnl >= participant.tp) {
                    // TP hit - remove from session
                    await this.removeFromSession(sessionId, account.userId, 'tp_hit', newPnl);
                    await this.notifyUser(account.userId, 'tp_hit',
                        `Congratulations! Take Profit reached! Final PnL: ${newPnl.toFixed(2)}`);
                } else if (newPnl <= -participant.sl) {
                    // SL hit - remove from session and flag for recovery
                    await this.removeFromSession(sessionId, account.userId, 'sl_hit', newPnl);
                    await this.flagForRecovery(account.userId);
                    await this.notifyUser(account.userId, 'sl_hit',
                        `Stop Loss reached. PnL: ${newPnl.toFixed(2)}. You are now eligible for recovery sessions.`);
                } else {
                    // Update PnL only
                    await supabase
                        .from('session_participants')
                        .update({ current_pnl: newPnl })
                        .eq('session_id', sessionId)
                        .eq('user_id', account.userId);
                }
            }
        } catch (error) {
            console.error('Monitor trade error:', error);
        }
    }

    /**
     * Remove user from session
     */
    async removeFromSession(sessionId, userId, reason, finalPnl) {
        await supabase
            .from('session_participants')
            .update({
                status: reason === 'tp_hit' ? 'removed_tp' : 'removed_sl',
                current_pnl: finalPnl,
                removed_at: new Date().toISOString(),
                removal_reason: reason
            })
            .eq('session_id', sessionId)
            .eq('user_id', userId);

        // Log activity
        await supabase
            .from('activity_logs_v2')
            .insert({
                id: uuidv4(),
                type: reason,
                level: 'info',
                message: `User removed from session: ${reason}`,
                metadata: { sessionId, userId, finalPnl },
                user_id: userId,
                session_id: sessionId,
                created_at: new Date().toISOString()
            });
    }

    /**
     * Flag user for recovery session eligibility
     */
    async flagForRecovery(userId) {
        await supabase
            .from('user_trading_settings')
            .upsert({
                user_id: userId,
                can_join_recovery: true,
                last_sl_hit_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
    }

    /**
     * Send notification to user
     */
    async notifyUser(userId, type, message) {
        await supabase
            .from('system_notifications')
            .insert({
                id: uuidv4(),
                user_id: userId,
                type,
                title: this.getNotificationTitle(type),
                message,
                metadata: {},
                read: false,
                created_at: new Date().toISOString()
            });
    }

    /**
     * Get notification title based on type
     */
    getNotificationTitle(type) {
        const titles = {
            'low_balance': '⚠️ Low Balance Warning',
            'tp_hit': '🎉 Take Profit Reached!',
            'sl_hit': '🛑 Stop Loss Reached',
            'trade_executed': '📈 Trade Executed',
            'trade_failed': '❌ Trade Failed',
            'session_invite': '📋 Session Invitation',
            'recovery_invite': '🔄 Recovery Session Available'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Log trade to database
     */
    async logTrade(tradeData) {
        await supabase
            .from('trade_logs')
            .insert({
                id: uuidv4(),
                session_id: tradeData.sessionId,
                user_id: tradeData.userId,
                account_id: tradeData.accountId,
                contract_id: tradeData.contractId,
                market: tradeData.market,
                contract_type: tradeData.contractType,
                strategy: tradeData.strategy,
                stake: tradeData.stake,
                prediction: tradeData.prediction,
                entry_tick: tradeData.entryTick,
                result: 'pending',
                confidence: tradeData.confidence,
                signal_reason: tradeData.signalReason,
                created_at: new Date().toISOString()
            });
    }

    /**
     * Disconnect an account
     */
    disconnectAccount(userId) {
        const ws = this.accountConnections.get(userId);
        if (ws) {
            try { ws.close(); } catch (e) { }
            this.accountConnections.delete(userId);
            this.balanceCache.delete(userId);
        }
    }

    /**
     * Disconnect all accounts
     */
    disconnectAll() {
        for (const [userId, ws] of this.accountConnections) {
            try { ws.close(); } catch (e) { }
        }
        this.accountConnections.clear();
        this.balanceCache.clear();
        this.activeContracts.clear();
    }

    /**
     * Helper delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get executor status
     */
    getStatus() {
        return {
            connectedAccounts: this.accountConnections.size,
            activeContracts: this.activeContracts.size,
            balances: Object.fromEntries(this.balanceCache)
        };
    }
}

// Singleton instance
const tradeExecutor = new TradeExecutor();

module.exports = { TradeExecutor, tradeExecutor };

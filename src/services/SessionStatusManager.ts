
import {
    ManagedSession,
    SessionHealth,
    TradeInfo,
    WSEvent
} from '../types/session';

type HealthStatus = SessionHealth['status'];

export class SessionStatusManager {
    private static instance: SessionStatusManager;
    private sessions: Map<string, SessionHealth> = new Map();
    private symbolMap: Map<string, Set<string>> = new Map();
    private listeners: ((healthMap: Map<string, SessionHealth>) => void)[] = [];

    // Configurable thresholds (ms)
    private readonly HEARTBEAT_TIMEOUT = 30000;
    private readonly TRADE_TIMEOUT = 5 * 60 * 1000; // 5 min without trade warning
    private readonly CONTRACT_STREAM_TIMEOUT = 5000; // 5s silence means stalled during trade

    private constructor() {
        // Private constructor for singleton
        this.startHealthCheckLoop();
    }

    public static getInstance(): SessionStatusManager {
        if (!SessionStatusManager.instance) {
            SessionStatusManager.instance = new SessionStatusManager();
        }
        return SessionStatusManager.instance;
    }

    // Initialize health record for a session
    public registerSession(sessionId: string, symbols: string[] = []): void {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                status: 'idle',
                lastHeartbeat: Date.now(),
                lastTradeTime: Date.now(),
                lastContractUpdate: Date.now(),
                lastBalanceUpdate: Date.now(),
                currentContractId: null,
                isWebsocketAlive: true, // Optimistic init
                isBalanceStreamAlive: true,
                isContractStreamAlive: false, // Starts false until trade
                errorCount: 0,
                warnings: []
            });
        }

        // Update symbol map
        symbols.forEach(sym => {
            if (!this.symbolMap.has(sym)) {
                this.symbolMap.set(sym, new Set());
            }
            this.symbolMap.get(sym)?.add(sessionId);
        });

        this.notifyListeners();
    }

    // Process incoming WS events to update health
    public processEvent(event: WSEvent): void {
        if (event.type === 'tick_update') {
            const sessions = this.symbolMap.get(event.symbol);
            if (sessions) {
                const now = Date.now();
                sessions.forEach(sid => {
                    const health = this.sessions.get(sid);
                    if (health && health.currentContractId) {
                        health.lastContractUpdate = now;
                    }
                });
            }
            return;
        }

        const { sessionId, type } = event;
        const health = this.sessions.get(sessionId);

        if (!health) return; // Ignore unknown sessions or register?

        const now = Date.now();
        health.lastHeartbeat = now;
        health.isWebsocketAlive = true;

        switch (type) {
            case 'trade_update':
                health.lastTradeTime = now;
                // If trade opened
                const trade = (event as any).trade as TradeInfo;
                if ((event as any).action === 'open') {
                    health.currentContractId = trade.contractId;
                    health.isContractStreamAlive = true;
                    health.status = 'active';
                } else if ((event as any).action === 'close') {
                    health.currentContractId = null;
                    health.isContractStreamAlive = false; // No active contract
                    health.status = 'idle'; // Back to idle/waiting
                }
                break;

            case 'session_update':
                // General update
                if ((event as any).data?.balance !== undefined) {
                    health.lastBalanceUpdate = now;
                    health.isBalanceStreamAlive = true;
                }
                break;
        }

        this.sessions.set(sessionId, health);
        this.notifyListeners();
    }

    // External hook for manual updates
    public updateSessionHealth(sessionId: string, updates: Partial<SessionHealth>) {
        const health = this.sessions.get(sessionId);
        if (health) {
            this.sessions.set(sessionId, { ...health, ...updates });
            this.notifyListeners();
        }
    }

    // Periodic check
    private startHealthCheckLoop() {
        setInterval(() => {
            const now = Date.now();
            let changed = false;

            this.sessions.forEach((health, id) => {
                const oldStatus = health.status;
                const oldWarnings = [...health.warnings];

                // Check WS Heartbeat
                if (now - health.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
                    health.isWebsocketAlive = false;
                    health.status = 'disconnected';
                    if (!health.warnings.includes('WebSocket Disconnected')) {
                        health.warnings.push('WebSocket Disconnected');
                    }
                }

                // Check Active Trade Stall
                if (health.currentContractId) {
                    // We expect contract updates frequently during a trade
                    if (now - health.lastContractUpdate > this.CONTRACT_STREAM_TIMEOUT) {
                        health.isContractStreamAlive = false;
                        if (health.status === 'active') health.status = 'stalled';
                        if (!health.warnings.includes('Contract Stream Stalled')) {
                            health.warnings.push('Contract Stream Stalled');
                        }
                    } else {
                        health.isContractStreamAlive = true;
                    }
                }

                if (health.status !== oldStatus || health.warnings.length !== oldWarnings.length) {
                    changed = true;
                }
            });

            if (changed) this.notifyListeners();
        }, 1000);
    }

    public getHealth(sessionId: string): SessionHealth | undefined {
        return this.sessions.get(sessionId);
    }

    public subscribe(listener: (map: Map<string, SessionHealth>) => void) {
        this.listeners.push(listener);
        listener(this.sessions); // Initial emit
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(new Map(this.sessions))); // Send copy
    }
}

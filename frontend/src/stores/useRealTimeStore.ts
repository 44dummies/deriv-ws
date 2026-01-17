import { create, StateCreator } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

// Type definitions
export interface SignalPayload {
    market: string;
    type: 'CALL' | 'PUT';
    confidence: number;
    reason: string;
    expiry: number;
    timestamp: number;
}

export interface TradePayload {
    tradeId: string;
    userId: string;
    sessionId: string;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    profit: number;
    executedAt: number;
    metadata_json: {
        market: string;
        entryPrice: number;
        reason: string;
        risk_confidence: number;
        failure_reason?: string;
    };
}

export interface RiskRiskPayload {
    checkPassed: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export interface WSDetail<T> {
    id?: string;
    timestamp: number;
    payload: T;
}

export interface ChartDataPoint {
    time: string;
    timestamp: number;
    balance: number;
    pnl: number;
}

// Log Definition
export interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING';
}

interface RealTimeState {
    isConnected: boolean;
    signals: WSDetail<SignalPayload>[];
    trades: WSDetail<TradePayload>[];
    riskEvents: WSDetail<RiskRiskPayload>[];
    logs: LogEntry[]; // New Logs Array

    // Analytics State
    history: ChartDataPoint[];
    currentBalance: number;
    totalPnL: number;

    // Session State
    sessionStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED';

    // Actions
    setConnected: (status: boolean) => void;
    setSessionStatus: (status: 'ACTIVE' | 'PAUSED' | 'COMPLETED') => void;
    addSignal: (payload: SignalPayload) => void;
    addTrade: (payload: TradePayload) => void;
    settleTrade: (payload: { tradeId: string; status: string; profit: number }) => void; // New Settle Action
    addRiskEvent: (payload: RiskRiskPayload) => void;
    addLog: (message: string, type?: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING') => void; // New Log Action
    clearEvents: () => void;
    pruneExpiredData: () => void;
}

// Max number of events to keep in memory
const MAX_EVENTS = 50;
const MAX_LOGS = 100;
const MAX_CHART_POINTS = 100;
const SIGNAL_TTL = 300000; // 5 minutes

type RealTimeStore = RealTimeState;

type MyPersist = (
    config: StateCreator<RealTimeStore>,
    options: PersistOptions<RealTimeStore>
) => StateCreator<RealTimeStore>;

export const useRealTimeStore = create<RealTimeStore>()(
    (persist as unknown as MyPersist)(
        (set) => ({
            isConnected: false,
            signals: [],
            trades: [],
            riskEvents: [],
            logs: [],
            history: [{ time: 'Start', timestamp: Date.now(), balance: 10000, pnl: 0 }],
            currentBalance: 10000,
            totalPnL: 0,
            sessionStatus: 'ACTIVE',

            setConnected: (status: boolean) => set({ isConnected: status }),
            setSessionStatus: (status) => set({ sessionStatus: status }),

            addLog: (message, type = 'INFO') => set((state) => ({
                logs: [{
                    id: Date.now().toString() + Math.random(),
                    timestamp: Date.now(),
                    message,
                    type
                }, ...state.logs].slice(0, MAX_LOGS)
            })),

            addSignal: (payload: SignalPayload) => set((state) => {
                const newSignals = [{
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    payload
                }, ...state.signals].slice(0, MAX_EVENTS);

                return { signals: newSignals };
            }),

            addTrade: (payload: TradePayload) => set((state) => {
                // If pure execution update (OPEN), don't update PnL yet
                // PnL updates happen on settle

                // Add to trade history
                const newTrades = [{
                    id: payload.tradeId || Date.now().toString(),
                    timestamp: Date.now(),
                    payload
                }, ...state.trades].slice(0, MAX_EVENTS);

                return { trades: newTrades };
            }),

            settleTrade: (payload) => set((state) => {
                const { tradeId, status, profit } = payload;

                // Update trade in list
                const newTrades = state.trades.map(t => {
                    if (t.payload.tradeId === tradeId) {
                        return {
                            ...t,
                            payload: { ...t.payload, status: status as any, profit }
                        };
                    }
                    return t;
                });

                // Update Balances
                let newPnL = state.totalPnL + profit;
                let newBalance = state.currentBalance + profit;

                // Add to chart history
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const newPoint: ChartDataPoint = {
                    time: timeStr,
                    timestamp: now.getTime(),
                    balance: newBalance,
                    pnl: newPnL
                };
                const newHistory = [...state.history, newPoint].slice(-MAX_CHART_POINTS);

                return {
                    trades: newTrades,
                    history: newHistory,
                    currentBalance: newBalance,
                    totalPnL: newPnL
                };
            }),

            addRiskEvent: (payload: RiskRiskPayload) => set((state) => {
                const newRisk = [{
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    payload
                }, ...state.riskEvents].slice(0, MAX_EVENTS);
                return { riskEvents: newRisk };
            }),

            clearEvents: () => set({
                signals: [],
                trades: [],
                riskEvents: [],
                logs: [],
                history: [{ time: 'Start', timestamp: Date.now(), balance: 10000, pnl: 0 }],
                currentBalance: 10000,
                totalPnL: 0
            }),

            pruneExpiredData: () => set((state) => {
                const now = Date.now();
                return {
                    signals: state.signals.filter((s) => {
                        const ts = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
                        return (now - ts) < SIGNAL_TTL;
                    })
                };
            })
        }),
        {
            name: 'tradermind-realtime-storage',
            partialize: (state) => ({
                signals: state.signals,
                trades: state.trades,
                riskEvents: state.riskEvents,
                logs: state.logs,
                history: state.history,
                currentBalance: state.currentBalance,
                totalPnL: state.totalPnL,
                sessionStatus: state.sessionStatus
            } as RealTimeState),
        }
    )
);

// Expose store to window for Cypress testing
if (typeof window !== 'undefined') {
    (window as any).useRealTimeStore = useRealTimeStore;
}

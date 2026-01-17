import { useEffect } from 'react';
import { connectWebSocket, joinSession, leaveSession } from '../lib/websocket';
import { useRealTimeStore, WSDetail, SignalPayload, TradePayload, RiskRiskPayload } from '../stores/useRealTimeStore';

export const useRealTimeData = (sessionId: string) => {
    const {
        setConnected,
        addSignal,
        addTrade,
        settleTrade,
        addRiskEvent,
        addLog
    } = useRealTimeStore();

    useEffect(() => {
        // Initialize connection
        const socket = connectWebSocket();
        setConnected(socket.connected);

        // Handlers
        const onConnect = () => {
            console.log('Hook: Connected');
            setConnected(true);
            addLog('Connected to trading server', 'INFO');
            joinSession(sessionId);
        };

        const onDisconnect = () => {
            console.log('Hook: Disconnected');
            setConnected(false);
            addLog('Disconnected from trading server', 'WARNING');
        };

        const onSignal = (data: WSDetail<SignalPayload>) => {
            addSignal(data.payload);
            const conf = (data.payload.confidence * 100).toFixed(0);
            addLog(`Signal: ${data.payload.type} on ${data.payload.market} (${conf}%)`, 'INFO');
        };

        const onTrade = (data: WSDetail<TradePayload>) => {
            addTrade(data.payload);
            addLog(`Executed: ${data.payload.metadata_json.market} [${data.payload.tradeId.substring(0, 8)}]`, 'INFO');
        };

        const onTradeSettled = (data: WSDetail<{ tradeId: string; status: string; profit: number; settledAt: string }>) => {
            console.log('Hook: Trade settled', data);
            settleTrade(data.payload);
            const isWin = data.payload.profit > 0;
            const pnlText = data.payload.profit >= 0 ? `+$${data.payload.profit.toFixed(2)}` : `-$${Math.abs(data.payload.profit).toFixed(2)}`;
            addLog(`Settled: ${isWin ? 'WIN' : 'LOSS'} ${pnlText}`, isWin ? 'SUCCESS' : 'ERROR');
        };

        const onRisk = (data: WSDetail<RiskRiskPayload>) => {
            addRiskEvent(data.payload);
            if (!data.payload.checkPassed) {
                addLog(`Risk Block: ${data.payload.reason}`, 'WARNING');
            }
        };

        const onStatusChange = (data: { payload: { status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'; reason?: string } }) => {
            useRealTimeStore.getState().setSessionStatus(data.payload.status);
            addLog(`Session ${data.payload.status}${data.payload.reason ? ': ' + data.payload.reason : ''}`, 'INFO');
        };

        // Listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        socket.on('signal_emitted', onSignal);
        socket.on('trade_executed', onTrade);
        socket.on('trade_settled', onTradeSettled); // New listener
        socket.on('risk_approved', onRisk);
        socket.on('session_status_update', onStatusChange);

        // If already connected, ensure we join the session
        if (socket.connected) {
            joinSession(sessionId);
        }

        // Cleanup
        return () => {
            leaveSession(sessionId);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('signal_emitted', onSignal);
            socket.off('trade_executed', onTrade);
            socket.off('trade_settled', onTradeSettled);
            socket.off('risk_approved', onRisk);
            socket.off('session_status_update', onStatusChange);
        };
    }, [sessionId, setConnected, addSignal, addTrade, settleTrade, addRiskEvent, addLog]);
};

import { useEffect } from 'react';
import { connectWebSocket, joinSession, leaveSession } from '../lib/websocket';
import { useRealTimeStore, WSDetail, SignalPayload, TradePayload, RiskRiskPayload } from '../stores/useRealTimeStore';

export const useRealTimeData = (sessionId: string) => {
    const { setConnected, addSignal, addTrade, addRiskEvent } = useRealTimeStore();

    useEffect(() => {
        // Initialize connection
        const socket = connectWebSocket();
        setConnected(socket.connected);

        // Handlers
        const onConnect = () => {
            console.log('Hook: Connected');
            setConnected(true);
            joinSession(sessionId);
        };

        const onDisconnect = () => {
            console.log('Hook: Disconnected');
            setConnected(false);
        };

        // Defined handlers to allow removal
        const onSignal = (data: WSDetail<SignalPayload>) => {
            console.log('Hook: Signal received', data);
            addSignal(data.payload);
        };

        const onTrade = (data: WSDetail<TradePayload>) => {
            console.log('Hook: Trade received', data);
            addTrade(data.payload);
        };

        const onRisk = (data: WSDetail<RiskRiskPayload>) => {
            console.log('Hook: Risk event received', data);
            addRiskEvent(data.payload);
        };

        const onStatusChange = (data: { payload: { status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'; reason?: string } }) => {
            console.log('Hook: Session status changed', data.payload.status);
            useRealTimeStore.getState().setSessionStatus(data.payload.status);
        };

        // Listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        // Note: Event names must match backend emissions exactly
        socket.on('signal_emitted', onSignal);
        socket.on('trade_executed', onTrade);
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
            socket.off('risk_approved', onRisk);
            socket.off('session_status_update', onStatusChange);
        };
    }, [sessionId, setConnected, addSignal, addTrade, addRiskEvent]);
};

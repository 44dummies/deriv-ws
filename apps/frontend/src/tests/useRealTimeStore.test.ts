import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRealTimeStore } from '../stores/useRealTimeStore';
import { act } from '@testing-library/react';

describe('useRealTimeStore', () => {
    beforeEach(() => {
        useRealTimeStore.setState({
            signals: [],
            trades: [],
            riskEvents: [],
            sessionStatus: 'ACTIVE',
            isConnected: false
        });
    });

    it('should update connection status', () => {
        const { setConnected } = useRealTimeStore.getState();
        act(() => setConnected(true));
        expect(useRealTimeStore.getState().isConnected).toBe(true);
    });

    it('should update session status', () => {
        const { setSessionStatus } = useRealTimeStore.getState();
        act(() => setSessionStatus('PAUSED'));
        expect(useRealTimeStore.getState().sessionStatus).toBe('PAUSED');

        act(() => setSessionStatus('COMPLETED'));
        expect(useRealTimeStore.getState().sessionStatus).toBe('COMPLETED');
    });

    it('should add valid signals and prune expired ones', () => {
        const { addSignal, pruneExpiredData } = useRealTimeStore.getState();

        // Mock Date.now
        const now = 1000000;
        vi.spyOn(Date, 'now').mockReturnValue(now);

        const signal = {
            market: 'EURUSD',
            type: 'CALL',
            confidence: 0.9,
            reason: 'Test',
            expiry: 60,
            timestamp: now
        } as any;

        act(() => addSignal(signal));
        expect(useRealTimeStore.getState().signals).toHaveLength(1);

        // Advance time past TTL (5 mins = 300000ms)
        vi.spyOn(Date, 'now').mockReturnValue(now + 300001);

        act(() => pruneExpiredData());
        expect(useRealTimeStore.getState().signals).toHaveLength(0);

        vi.restoreAllMocks();
    });
});

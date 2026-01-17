import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

// Poll interval in milliseconds (15 seconds)
const POLL_INTERVAL = 15000;

export const useDerivBalance = () => {
    const { initialize, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Poll for balance updates
        const interval = setInterval(() => {
            initialize();
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [isAuthenticated, initialize]);
};

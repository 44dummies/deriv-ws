import { useState, useEffect, useCallback } from 'react';
import { tradingApi } from '../trading/tradingApi';

interface SessionStats {
    totalTrades: number;
    openTrades: number;
    wins: number;
    losses: number;
    winRate: string;
    totalProfit: string;
    avgProfit: string;
}

export const useSessionStats = (sessionId: string | null) => {
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!sessionId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await tradingApi.getTradeStats(sessionId);

            if (response.success) {
                setStats(response.data);
            } else {
                throw new Error(response.error || 'Unknown error');
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching session stats:', err);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchStats();
        // Refresh every 10 seconds
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats };
};

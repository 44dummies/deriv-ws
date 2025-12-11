import { useState, useEffect, useCallback } from 'react';

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
            const token = sessionStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trading/sessions/${sessionId}/stats`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch session stats');

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            } else {
                throw new Error(data.error || 'Unknown error');
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

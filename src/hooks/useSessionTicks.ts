
import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { CONFIG } from '../config/constants';

interface Tick {
    epoch: number;
    quote: number;
}

interface MarketTicks {
    [market: string]: Tick[];
}

export const useSessionTicks = (sessionId: string | null) => {
    const [ticks, setTicks] = useState<MarketTicks>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) return;

        const fetchTicks = async () => {
            setLoading(true);
            setError(null);
            try {
                // Use apiClient to handle auth headers and token refresh automatically
                const response = await apiClient.get<any>(`/trading/sessions/${sessionId}/ticks`);

                if (response.success) {
                    setTicks(response.data);
                } else {
                    throw new Error(response.error || 'Unknown error');
                }
            } catch (err: any) {
                setError(err.message);
                console.error('Error fetching ticks:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTicks();
    }, [sessionId]);

    return { ticks, loading, error };
};

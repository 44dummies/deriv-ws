
import { useState, useEffect } from 'react';
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
                const token = sessionStorage.getItem('accessToken');
                const response = await fetch(`${CONFIG.API_URL}/trading/sessions/${sessionId}/ticks`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch session ticks');
                }

                const data = await response.json();
                if (data.success) {
                    setTicks(data.data);
                } else {
                    throw new Error(data.error || 'Unknown error');
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

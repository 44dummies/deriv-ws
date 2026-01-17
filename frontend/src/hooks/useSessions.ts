import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/api';
import { Session, SessionStatus } from '../types/session';

export function useSessions() {
    return useQuery<Session[]>({
        queryKey: ['sessions'],
        queryFn: async () => {
            const data = await fetchWithAuth('/sessions');
            return data?.sessions || [];
        },
    });
}

export function useActiveSession() {
    return useQuery<Session | null>({
        queryKey: ['session', 'active'],
        queryFn: async () => {
            try {
                return await fetchWithAuth('/sessions/active');
            } catch (error: any) {
                if (error?.message?.includes('Not Found') || error?.message?.includes('404')) {
                    return null;
                }
                throw error;
            }
        },
        retry: false, // Don't retry if 404
    });
}

export function useCreateSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => fetchWithAuth('/sessions', {
            method: 'POST',
            body: JSON.stringify({ config: { risk_profile: 'MODERATE' } }),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
    });
}

export function useUpdateSessionStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: SessionStatus }) => {
            const action = status === 'PAUSED' ? 'pause' : status === 'COMPLETED' ? 'stop' : 'start';
            return fetchWithAuth(`/sessions/${id}/${action}`, {
                method: 'POST',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['session', 'active'] });
        },
    });
}

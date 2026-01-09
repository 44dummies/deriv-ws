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
        queryFn: () => fetchWithAuth('/sessions/active'),
        retry: false, // Don't retry if 404
    });
}

export function useCreateSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => fetchWithAuth('/sessions', {
            method: 'POST',
            body: JSON.stringify({ config: { risk_profile: 'MEDIUM' } }),
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
            const action = status === 'PAUSED' ? 'pause' : status === 'TERMINATED' ? 'stop' : 'start';
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

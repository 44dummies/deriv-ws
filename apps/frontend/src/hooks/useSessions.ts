import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/api';
import { Session, SessionStatus } from '../types/session';

export function useSessions() {
    return useQuery<Session[]>({
        queryKey: ['sessions'],
        queryFn: () => fetchWithAuth('/sessions'),
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
            body: JSON.stringify({ startTime: new Date().toISOString() }),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
    });
}

export function useUpdateSessionStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: SessionStatus }) =>
            fetchWithAuth(`/sessions/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['session', 'active'] });
        },
    });
}

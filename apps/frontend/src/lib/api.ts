import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        // Attempt to read error message
        const errorBody = await res.text().catch(() => null);
        throw new Error(`API Error: ${res.statusText} ${errorBody ? ` - ${errorBody}` : ''}`);
    }

    // Handle empty responses (e.g. 204 No Content)
    if (res.status === 204) return null;

    return res.json();
}

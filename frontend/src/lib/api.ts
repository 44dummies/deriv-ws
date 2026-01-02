import { supabase } from './supabase';

// Base URL for API Gateway (without trailing slash or /api prefix)
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

// Ensure the base URL is clean
const cleanBaseUrl = API_GATEWAY_URL.replace(/\/+$/, '');

// Full API URL with /api/v1 prefix
const API_URL = `${cleanBaseUrl}/api/v1`;

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

    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const res = await fetch(`${API_URL}${cleanEndpoint}`, {
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

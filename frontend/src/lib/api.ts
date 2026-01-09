import { supabase } from './supabase';

// Base URL for API Gateway (without trailing slash or /api prefix)
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

// Ensure the base URL is clean
const cleanBaseUrl = API_GATEWAY_URL.replace(/\/+$/, '');

// Full API URL with /api/v1 prefix
const API_URL = `${cleanBaseUrl}/api/v1`;

const CSRF_HEADER = 'X-CSRF-Token';
let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

async function ensureCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;
    if (csrfPromise) return csrfPromise;

    csrfPromise = fetch(`${API_URL}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
    })
        .then(async (res) => {
            if (!res.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            const data = await res.json();
            csrfToken = data.csrfToken;
            if (!csrfToken) {
                throw new Error('CSRF token not found in response');
            }
            return csrfToken;
        })
        .finally(() => {
            csrfPromise = null;
        });

    return csrfPromise;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    let token: string | undefined;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
    } catch {
        token = undefined;
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !(headers as any)[CSRF_HEADER]) {
        const tokenValue = await ensureCsrfToken();
        (headers as any)[CSRF_HEADER] = tokenValue;
    }

    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    let res = await fetch(`${API_URL}${cleanEndpoint}`, {
        ...options,
        headers,
        credentials: options.credentials ?? 'include', // Send httpOnly cookies for session auth
    });

    if (!res.ok && res.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        csrfToken = null;
        const tokenValue = await ensureCsrfToken();
        (headers as any)[CSRF_HEADER] = tokenValue;
        res = await fetch(`${API_URL}${cleanEndpoint}`, {
            ...options,
            headers,
            credentials: options.credentials ?? 'include',
        });
    }

    if (!res.ok) {
        // Attempt to read error message
        const errorBody = await res.text().catch(() => null);
        throw new Error(`API Error: ${res.statusText} ${errorBody ? ` - ${errorBody}` : ''}`);
    }

    // Handle empty responses (e.g. 204 No Content)
    if (res.status === 204) return null;

    return res.json();
}

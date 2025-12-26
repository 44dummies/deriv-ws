/**
 * TraderMind API Client
 * Handles all HTTP API requests to the backend
 */

import type { ApiResponse, UserProfile } from '../types';

import { CONFIG } from '../config/constants';

const API_URL = CONFIG.API_URL;

// Types
interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | undefined>;
}

interface DerivLoginData {
    derivUserId: string;
    loginid: string;
    email?: string;
    currency?: string;
    country?: string;
    fullname?: string;
    token?: string;
}

interface AuthResult {
    accessToken: string;
    // refreshToken is now in HttpOnly cookie, not returned to client
    user?: UserProfile;
}

interface CommunityFeedOptions {
    page?: number;
    limit?: number;
    category?: string;
    sortBy?: string;
    timeRange?: string;
}

interface SearchOptions {
    page?: number;
    limit?: number;
    category?: string;
}

type TokenRefreshCallback = (accessToken: string, refreshToken: string) => void;
type AuthErrorCallback = () => void;

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
    }
}

class ApiClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private onTokenRefresh: TokenRefreshCallback | null = null;
    private onAuthError: AuthErrorCallback | null = null;
    private isSessionExpired = false;

    constructor() {
        this.loadTokens();
    }

    /**
     * Set access token - refresh token stored as fallback for browsers blocking cookies
     */
    setTokens(accessToken: string, refreshToken?: string): void {
        console.debug('[ApiClient] Setting tokens. Access:', !!accessToken, 'Refresh fallback:', !!refreshToken);
        this.accessToken = accessToken;
        this.isSessionExpired = false;
        sessionStorage.setItem('accessToken', accessToken);

        // Store refresh token as FALLBACK for browsers blocking cross-origin cookies
        // CRITICAL FIX: If refreshToken is NOT provided (undefined/null/empty), 
        // we must CLEAR the old one to prevent sending stale tokens.
        if (refreshToken) {
            this.refreshToken = refreshToken;
            sessionStorage.setItem('refreshToken', refreshToken);
        } else {
            this.refreshToken = null;
            sessionStorage.removeItem('refreshToken');
        }
    }

    /**
     * Load tokens from sessionStorage
     */
    loadTokens(): { accessToken: string | null } {
        if (!this.accessToken) {
            this.accessToken = sessionStorage.getItem('accessToken');
        }
        if (!this.refreshToken) {
            this.refreshToken = sessionStorage.getItem('refreshToken');
        }
        console.debug('[ApiClient] Loaded tokens. Access:', !!this.accessToken, 'Refresh fallback:', !!this.refreshToken);
        return { accessToken: this.accessToken };
    }

    /**
     * Clear tokens from memory and storage
     */
    clearTokens(): void {
        this.accessToken = null;
        this.refreshToken = null;
        this.isSessionExpired = true;
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
    }

    // Token refresh callback removed - now using HttpOnly cookies

    /**
     * Set callback for auth errors
     */
    onAuthenticationError(callback: AuthErrorCallback): void {
        this.onAuthError = callback;
    }

    /**
     * Make API request
     */
    async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
        if (this.isSessionExpired && this.accessToken) {
            throw new Error('Session expired');
        }

        // Normalize endpoint to prevent double /api prefix
        // calling code might pass /api/foo but API_URL already includes /api
        const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
        const url = `${API_URL}${cleanEndpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>)
        };

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include' // Include HttpOnly cookies
            });

            if (response.status === 401) {
                // Try to refresh using HttpOnly cookie
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers,
                        credentials: 'include'
                    });
                    return this.handleResponse<T>(retryResponse);
                } else {
                    console.warn('[ApiClient] Token refresh failed - session expired');
                    this.isSessionExpired = true; // Mark session as dead
                    this.clearTokens();
                    if (this.onAuthError) {
                        this.onAuthError();
                    }
                    throw new Error('Session expired');
                }
            }

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Handle response
     */
    async handleResponse<T>(response: Response): Promise<T> {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data as T;
    }

    private refreshPromise: Promise<boolean> | null = null;
    private refreshFailedOnce = false; // Prevent repeated refresh attempts after first failure

    /**
     * Refresh access token using HttpOnly cookie (Non-blocking + Deduped + Guarded)
     */
    async refreshAccessToken(): Promise<boolean> {
        // Guard: Don't retry if session is already marked expired
        if (this.isSessionExpired) {
            console.debug('[ApiClient] Refresh skipped: session already expired');
            return false;
        }

        // Guard: Don't spam refresh if it already failed once this session
        if (this.refreshFailedOnce) {
            console.debug('[ApiClient] Refresh skipped: already failed this session');
            return false;
        }

        // Dedup multiple simultaneous refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                // Use retryWithBackoff only for network/server errors (not 401s)
                return await retryWithBackoff(async () => {
                    console.debug('[ApiClient] Attempting refresh. Has fallback token:', !!this.refreshToken);

                    // Hybrid approach: cookie + sessionStorage fallback
                    const response = await fetch(`${API_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include', // TRY HttpOnly cookie first
                        body: this.refreshToken ? JSON.stringify({ refreshToken: this.refreshToken }) : undefined
                    });

                    // Immediate failure for 401/400 (don't retry invalid tokens)
                    if (response.status === 401 || response.status === 400) {
                        const errorData = await response.json().catch(() => ({}));
                        console.debug('[ApiClient] Refresh failed details:', errorData);
                        console.debug('[ApiClient] Refresh failed status:', response.status);
                        this.refreshFailedOnce = true;
                        return false;
                    }

                    if (response.ok) {
                        const data = await response.json();

                        // 🔧 CRITICAL FIX: Update BOTH tokens if the server sends a new refresh token (Rotation)
                        if (data.accessToken) {
                            // Ensure we capture the new refresh token to prevent mismatch on next call
                            this.setTokens(data.accessToken, data.refreshToken);
                            console.debug('[ApiClient] Tokens rotated successfully.');
                        }

                        this.refreshFailedOnce = false; // Reset on success
                        return true;
                    }

                    // For other errors (5xx), throw to trigger retry
                    throw new Error(`Refresh failed with status ${response.status}`);
                }, 3, 1000);

            } catch (error) {
                console.debug('[ApiClient] Refresh failed after retries:', error);
                return false;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    // HTTP Methods
    async get<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, ...rest } = options;
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.append(key, String(value));
                }
            });
            url = `${endpoint}?${searchParams.toString()}`;
        }
        return this.request<T>(url, { method: 'GET', ...rest });
    }

    async post<T = unknown>(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    async put<T = unknown>(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    async delete<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE', ...options });
    }

    /**
     * Upload file (multipart/form-data)
     */
    async uploadFile<T = unknown>(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<T> {
        const url = `${API_URL}${endpoint}`;
        const headers: Record<string, string> = {};

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                ...options
            });

            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: formData,
                        ...options
                    });
                    return this.handleResponse<T>(retryResponse);
                } else {
                    this.isSessionExpired = true;
                    this.clearTokens();
                    if (this.onAuthError) {
                        this.onAuthError();
                    }
                    throw new Error('Session expired');
                }
            }

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('File upload error:', error);
            return { success: false, error: (error as Error).message } as T;
        }
    }

    // Auth Methods
    async register(data: unknown): Promise<AuthResult> {
        const result = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        }).then(r => this.handleResponse<AuthResult>(r));
        this.setTokens(result.accessToken, (result as any).refreshToken);
        return result;
    }

    async login(email: string, password: string): Promise<AuthResult> {
        const result = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        }).then(r => this.handleResponse<AuthResult>(r));
        this.setTokens(result.accessToken, (result as any).refreshToken);
        return result;
    }

    async loginWithDeriv(derivData: DerivLoginData): Promise<AuthResult> {
        const result = await fetch(`${API_URL}/auth/deriv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(derivData),
            credentials: 'include' // Receive HttpOnly cookie
        }).then(r => this.handleResponse<AuthResult>(r));
        this.setTokens(result.accessToken, (result as any).refreshToken);
        return result;
    }

    async logout(): Promise<void> {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {},
                credentials: 'include' // Server clears HttpOnly cookie
            });
        } finally {
            this.clearTokens();
        }
    }

    async getMe(): Promise<UserProfile> {
        return this.request<UserProfile>('/auth/me');
    }

    // User Methods
    async getMyProfile(): Promise<UserProfile> {
        return this.request<UserProfile>('/users/me');
    }

    async updateMyProfile(data: Partial<UserProfile>): Promise<UserProfile> {
        return this.request<UserProfile>('/users/me', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async uploadAvatar(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${API_URL}/users/me/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        });

        return this.handleResponse(response);
    }

    async deleteAvatar(): Promise<void> {
        return this.request('/users/me/avatar', { method: 'DELETE' });
    }

    async searchUsers(query: string, limit: number = 20): Promise<{ users: UserProfile[] }> {
        return this.request(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }

    async getUserProfile(username: string): Promise<UserProfile> {
        return this.request(`/users/${encodeURIComponent(username)}`);
    }

    // Chatroom Methods
    async getChatrooms(): Promise<unknown> {
        return this.request('/chatrooms');
    }

    async getRecommendedChatrooms(): Promise<unknown> {
        return this.request('/chatrooms/recommendations');
    }

    async getChatroom(id: string): Promise<unknown> {
        return this.request(`/chatrooms/${id}`);
    }

    async getChatroomMessages(id: string, before: string | null = null, limit: number = 50): Promise<unknown> {
        let url = `/chatrooms/${id}/messages?limit=${limit}`;
        if (before) {
            url += `&before=${encodeURIComponent(before)}`;
        }
        return this.request(url);
    }

    async getChatroomMembers(id: string, limit: number = 50): Promise<unknown> {
        return this.request(`/chatrooms/${id}/members?limit=${limit}`);
    }

    async joinChatroom(id: string): Promise<unknown> {
        return this.request(`/chatrooms/${id}/join`, { method: 'POST' });
    }

    async leaveChatroom(id: string): Promise<unknown> {
        return this.request(`/chatrooms/${id}/leave`, { method: 'POST' });
    }

    async muteChatroom(id: string, muted: boolean): Promise<unknown> {
        return this.request(`/chatrooms/${id}/mute`, {
            method: 'POST',
            body: JSON.stringify({ muted })
        });
    }

    async syncTradingProfile(profileData: unknown): Promise<unknown> {
        return this.request('/chatrooms/sync-profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    // Community Methods
    async getCommunityFeed(options: CommunityFeedOptions = {}): Promise<unknown> {
        const params = new URLSearchParams();
        if (options.page) params.append('page', String(options.page));
        if (options.limit) params.append('limit', String(options.limit));
        if (options.category) params.append('category', options.category);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.timeRange) params.append('timeRange', options.timeRange);

        return this.request(`/community/feed?${params.toString()}`);
    }

    async createPost(data: unknown): Promise<unknown> {
        return this.request('/community/posts', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getPost(id: string): Promise<unknown> {
        return this.request(`/community/posts/${id}`);
    }

    async deletePost(id: string): Promise<unknown> {
        return this.request(`/community/posts/${id}`, { method: 'DELETE' });
    }

    async votePost(id: string, value: number): Promise<unknown> {
        return this.request(`/community/posts/${id}/vote`, {
            method: 'POST',
            body: JSON.stringify({ value })
        });
    }

    async addComment(postId: string, content: string): Promise<unknown> {
        return this.request(`/community/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async deleteComment(id: string): Promise<unknown> {
        return this.request(`/community/comments/${id}`, { method: 'DELETE' });
    }

    async getUserPosts(username: string, page: number = 1, limit: number = 20): Promise<unknown> {
        return this.request(`/community/users/${encodeURIComponent(username)}/posts?page=${page}&limit=${limit}`);
    }

    async getTrendingTags(limit: number = 10): Promise<unknown> {
        return this.request(`/community/tags/trending?limit=${limit}`);
    }

    async searchPosts(query: string, options: SearchOptions = {}): Promise<unknown> {
        const params = new URLSearchParams({ q: query });
        if (options.page) params.append('page', String(options.page));
        if (options.limit) params.append('limit', String(options.limit));
        if (options.category) params.append('category', options.category);

        return this.request(`/community/search?${params.toString()}`);
    }

    /**
     * Upload file alias for compatibility
     */
    async upload<T = unknown>(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<T> {
        return this.uploadFile<T>(endpoint, formData, options);
    }
}

const apiClient = new ApiClient();

export default apiClient;
export { apiClient, ApiClient };
export type { DerivLoginData, AuthResult, CommunityFeedOptions };

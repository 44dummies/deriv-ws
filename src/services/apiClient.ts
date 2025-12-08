/**
 * TraderMind API Client
 * Handles all HTTP API requests to the backend
 */

import type { ApiResponse, UserProfile } from '../types';

const API_URL: string = process.env.REACT_APP_SERVER_URL
    ? `${process.env.REACT_APP_SERVER_URL}/api`
    : 'https://tradermind-server.up.railway.app/api';

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
}

interface AuthResult {
    accessToken: string;
    refreshToken: string;
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

class ApiClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private onTokenRefresh: TokenRefreshCallback | null = null;
    private onAuthError: AuthErrorCallback | null = null;

    constructor() {
        this.loadTokens();
    }

    /**
     * Set tokens - uses sessionStorage so session ends when tab is closed
     */
    setTokens(accessToken: string, refreshToken: string): void {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
    }

    /**
     * Load tokens from storage
     */
    loadTokens(): { accessToken: string | null; refreshToken: string | null } {
        this.accessToken = sessionStorage.getItem('accessToken');
        this.refreshToken = sessionStorage.getItem('refreshToken');
        return { accessToken: this.accessToken, refreshToken: this.refreshToken };
    }

    /**
     * Clear tokens
     */
    clearTokens(): void {
        this.accessToken = null;
        this.refreshToken = null;
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
    }

    /**
     * Set callback for token refresh
     */
    onTokenRefreshed(callback: TokenRefreshCallback): void {
        this.onTokenRefresh = callback;
    }

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
        const url = `${API_URL}${endpoint}`;
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
                headers
            });

            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    return this.handleResponse<T>(retryResponse);
                } else {
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

    /**
     * Refresh access token
     */
    async refreshAccessToken(): Promise<boolean> {
        try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setTokens(data.accessToken, data.refreshToken);
                if (this.onTokenRefresh) {
                    this.onTokenRefresh(data.accessToken, data.refreshToken);
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
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
        const result = await this.request<AuthResult>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        this.setTokens(result.accessToken, result.refreshToken);
        return result;
    }

    async login(email: string, password: string): Promise<AuthResult> {
        const result = await this.request<AuthResult>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setTokens(result.accessToken, result.refreshToken);
        return result;
    }

    async loginWithDeriv(derivData: DerivLoginData): Promise<AuthResult> {
        console.log('apiClient.loginWithDeriv called with:', derivData);
        const result = await this.request<AuthResult>('/auth/deriv', {
            method: 'POST',
            body: JSON.stringify(derivData)
        });
        console.log('apiClient.loginWithDeriv result:', result);
        this.setTokens(result.accessToken, result.refreshToken);
        return result;
    }

    async logout(): Promise<void> {
        try {
            await this.request('/auth/logout', { method: 'POST' });
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

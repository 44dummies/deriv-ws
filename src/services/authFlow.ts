
import { apiClient } from './apiClient';
import { TokenService } from './tokenService';

interface AuthResult {
    success: boolean;
    error?: string;
    redirectTo?: string;
}

/**
 * AuthFlowService
 * 
 * A Singleton service to manage the OAuth callback flow drastically.
 * It strictly enforces "One-Time Execution" and centralized state management.
 */
class AuthFlowService {
    private isProcessing: boolean = false;
    private hasCompleted: boolean = false;

    /**
     * Handles the full OAuth callback flow:
     * 1. lock execution
     * 2. parse params
     * 3. exchange with backend
     * 4. update global state
     */
    async handleCallback(
        searchParams: URLSearchParams,
        loginContextFn: (token: string, user: any) => void
    ): Promise<AuthResult> {

        // 1. Guard against double execution (React Strict Mode / Fast Refresh)
        if (this.isProcessing) {
            console.debug('[AuthFlow] Already processing, ignoring duplicate call');
            return { success: false, error: 'Processing in progress' };
        }
        if (this.hasCompleted) {
            console.debug('[AuthFlow] Already completed, skipping');
            return { success: true, redirectTo: '/user/dashboard' };
        }

        this.isProcessing = true;
        const lockKey = `auth_lock_${searchParams.toString()}`;

        // Session Lock for page reloads
        if (sessionStorage.getItem(lockKey)) {
            console.debug('[AuthFlow] Session lock active');
            this.isProcessing = false;
            return { success: true, redirectTo: '/user/dashboard' }; // Assume success if locked
        }

        try {
            console.log('[AuthFlow] Starting OAuth handshake...');
            sessionStorage.setItem(lockKey, 'true');
            // Auto-clear lock after 30s
            setTimeout(() => sessionStorage.removeItem(lockKey), 30000);

            // 2. Parse Params
            const token1 = searchParams.get('token1');
            const acct1 = searchParams.get('acct1');
            // ... (We could parse all accounts, but for "Fast" login we just need the primary)

            // Logic to find strict "CR" or "VRTC" account if array of tokens is passed
            // For simplicity/speed, we reuse the existing parsing logic or simplify it:
            // Let's assume the first account is the primary for now, or parse properly.

            // Parsing robustly:
            const accounts = [];
            let i = 1;
            while (searchParams.get(`token${i}`)) {
                accounts.push({
                    token: searchParams.get(`token${i}`),
                    account: searchParams.get(`acct${i}`),
                    currency: searchParams.get(`cur${i}`)
                });
                i++;
            }

            if (accounts.length === 0) {
                throw new Error('No accounts returned from Deriv');
            }

            const primaryAccount = accounts[0]; // TODO: Prefer Real (CR) over Virtual (VRTC) if needed?
            // Actually, usually the first one is the active one selected by user in OAuth.

            // Store Deriv tokens for other API calls
            sessionStorage.setItem('derivToken', primaryAccount.token || '');
            sessionStorage.setItem('derivId', primaryAccount.account || '');

            // 3. Exchange with Backend (The Parallel /deriv endpoint)
            const loginResult = await apiClient.loginWithDeriv({
                derivUserId: primaryAccount.account || '',
                loginid: primaryAccount.account || '',
                token: primaryAccount.token || '',
                // Optional fields
                currency: primaryAccount.currency || 'USD',
                country: 'ke', // TODO: Get from params if available or ignore
                fullname: 'Trader' // TODO: Get from params if available
            });

            if (!loginResult || !loginResult.accessToken) {
                throw new Error('Backend handshake failed: No token received');
            }

            // 4. Update Context (Optimistic)
            loginContextFn(loginResult.accessToken, loginResult.user);

            this.hasCompleted = true;
            this.isProcessing = false;

            return { success: true, redirectTo: '/user/dashboard' };

        } catch (error: any) {
            console.error('[AuthFlow] Error:', error);
            this.isProcessing = false;
            // Remove lock on error so they can retry
            sessionStorage.removeItem(lockKey);
            return { success: false, error: error.message || 'Authentication failed' };
        }
    }

    reset() {
        this.isProcessing = false;
        this.hasCompleted = false;
    }
}

export const authFlowService = new AuthFlowService();

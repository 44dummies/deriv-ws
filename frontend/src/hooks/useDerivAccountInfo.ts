/**
 * Hook to fetch and maintain Deriv account details
 * Gets real-time account info including fullname, email, balance
 */

import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

// const APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089';

export function useDerivAccountInfo() {
    const { user } = useAuthStore();
    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id);

    // NOTE: Direct WebSocket connection removed to enforce server-side token security.
    // Real-time updates are handled via periodic profile refreshes.

    useEffect(() => {
        // No-op: client-side connection disabled
    }, []);



    return {
        fullname: user?.fullname || 'Trader',
        email: user?.email || '',
        balance: activeAccount?.balance || 0,
        currency: activeAccount?.currency || 'USD',
        isVirtual: activeAccount?.is_virtual || false,
        loginid: activeAccount?.loginid || ''
    };
}

import { useEffect } from 'react';
// import { useAuthStore } from '../stores/useAuthStore';

// Use the same App ID as configured in environment
// const APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089';

export const useDerivBalance = () => {
    // const { user, updateBalance } = useAuthStore();
    // const activeAccount = user?.deriv_accounts.find(a => a.loginid === user.active_account_id);
    // const socketRef = useRef<WebSocket | null>(null);

    // NOTE: Direct WebSocket connection removed to enforce server-side token security.
    // TODO: Implement server-side streaming or polling for real-time updates.

    useEffect(() => {
        // No-op: client-side connection disabled
    }, []);
};

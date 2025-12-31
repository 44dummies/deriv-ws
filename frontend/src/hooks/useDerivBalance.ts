import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

// Use the same App ID as configured in environment
const APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089';

export const useDerivBalance = () => {
    const { user, updateBalance } = useAuthStore();
    const activeAccount = user?.deriv_accounts.find(a => a.loginid === user.active_account_id);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!activeAccount?.token) return;

        // Close existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
        }

        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
        socketRef.current = ws;

        ws.onopen = () => {
            // Authorize
            ws.send(JSON.stringify({ authorize: activeAccount.token }));

            // Start Keep-Alive Ping (every 30s)
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ ping: 1 }));
                }
            }, 30000);

            // Clean up interval on close
            ws.addEventListener('close', () => clearInterval(pingInterval));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.msg_type === 'ping') return; // Ignore ping responses

            if (data.msg_type === 'authorize') {
                // Subscribe to balance
                ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            }

            // Check for API errors
            if (data.error) {
                console.error('Deriv API Error:', data.error.code, data.error.message);
                return;
            }

            if (data.msg_type === 'balance') {
                if (!data.balance) {
                    console.warn('Deriv Balance: Received balance message but data.balance is missing', data);
                    return;
                }
                const { balance, currency } = data.balance;
                updateBalance(Number(balance), currency);
            }
        };

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [activeAccount?.token, updateBalance]);
};

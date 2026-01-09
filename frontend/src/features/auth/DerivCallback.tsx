import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Deriv OAuth Callback Handler
 * SECURITY: Tokens are passed to backend via POST, never stored client-side
 */
export const DerivCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const loginWithDeriv = useAuthStore(state => state.loginWithDeriv);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            // Check if we have any accounts in the URL params
            const hasAccounts = searchParams.get('acct1') !== null;

            if (!hasAccounts) {
                setError('No Deriv accounts found in callback');
                setTimeout(() => navigate('/?error=missing_params'), 2000);
                return;
            }

            try {
                // Pass the full query string to loginWithDeriv
                // The store will extract tokens and send them securely to backend
                await loginWithDeriv(searchParams.toString());
                
                // Redirect based on role (handled by auth store)
                const user = useAuthStore.getState().user;
                if (user?.role === 'ADMIN') {
                    navigate('/admin/overview');
                } else {
                    navigate('/user/dashboard');
                }
            } catch {
                setError('Authentication failed. Please try again.');
                setTimeout(() => navigate('/?error=auth_failed'), 2000);
            }
        };

        handleCallback();
    }, [searchParams, loginWithDeriv, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-center">
                {error ? (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-red-400">Authentication Error</h2>
                        <p className="text-gray-400">{error}</p>
                        <p className="text-gray-500 text-sm mt-2">Redirecting...</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-4">Authenticating with Deriv...</h2>
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-400 text-sm mt-4">Securely connecting your account</p>
                    </>
                )}
            </div>
        </div>
    );
};

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

export const DerivCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const loginWithDeriv = useAuthStore(state => state.loginWithDeriv);

    useEffect(() => {
        const handleCallback = async () => {
            const accounts: { token: string; accountId: string; currency?: string }[] = [];
            let i = 1;
            while (searchParams.get(`acct${i}`)) {
                const acct = searchParams.get(`acct${i}`);
                const token = searchParams.get(`token${i}`);
                const cur = searchParams.get(`cur${i}`);
                if (acct && token) {
                    accounts.push({ accountId: acct, token, currency: cur || 'USD' });
                }
                i++;
            }

            if (accounts.length > 0) {
                try {
                    // Login with the first account initially
                    await loginWithDeriv(searchParams.toString());
                    navigate('/dashboard');
                } catch (error) {
                    console.error("Login failed", error);
                    navigate('/login?error=auth_failed');
                }
            } else {
                console.error("Missing Deriv params");
                navigate('/login?error=missing_params');
            }
        };

        handleCallback();
    }, [searchParams, loginWithDeriv, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Authenticating with Deriv...</h2>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        </div>
    );
};

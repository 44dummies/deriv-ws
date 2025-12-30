import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

export const DerivCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const loginWithDeriv = useAuthStore(state => state.loginWithDeriv);

    useEffect(() => {
        const handleCallback = async () => {
            const token1 = searchParams.get('token1');
            const acct1 = searchParams.get('acct1');

            if (token1 && acct1) {
                try {
                    await loginWithDeriv(token1, acct1);
                    navigate('/dashboard'); // Or wherever users should land
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

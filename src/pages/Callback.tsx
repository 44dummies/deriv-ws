import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Full URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);
        
        // Deriv returns tokens in query parameters (after ?)
        const urlParams = new URLSearchParams(window.location.search);
        const token1 = urlParams.get('token1');
        const acct1 = urlParams.get('acct1');

        console.log('Extracted token1:', token1);
        console.log('Extracted acct1:', acct1);

        if (!token1 || !acct1) {
          throw new Error('No valid tokens or code found in callback URL');
        }

        TokenService.setTokens({
          token: token1,
          account: acct1,
        });

        setStatus('Connecting to Deriv...');
        await websocketService.connect();

        setStatus('Authorizing...');
        const authResponse = await websocketService.authorize(token1);

        if (authResponse.authorize) {
          TokenService.setAccount(authResponse.authorize);
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        setStatus('Success! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);

      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'Authentication failed');
        TokenService.clearTokens();
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-deriv-dark to-black">
      <div className="card max-w-md w-full">
        {error ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-center text-red-600 mb-4">{error}</p>
            <p className="text-center text-gray-500 text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-deriv-red/20 border-t-deriv-red rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="text-center text-gray-700 font-medium text-lg">{status}</p>
            <div className="mt-6 flex justify-center gap-1">
              <div className="w-2 h-2 bg-deriv-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-deriv-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-deriv-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Callback;

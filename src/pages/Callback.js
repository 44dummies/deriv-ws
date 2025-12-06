import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import { supabase } from '../services/supabaseService';

const Callback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Parsing callback data...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('error')) {
          const errorMsg = urlParams.get('error') || 'Unknown OAuth error';
          console.error('OAuth error from Deriv:', errorMsg);
          setError(`OAuth Error: ${errorMsg}`);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        const accounts = [];
        let i = 1;
        
        while (urlParams.has(`acct${i}`)) {
          accounts.push({
            account: urlParams.get(`acct${i}`),
            token: urlParams.get(`token${i}`),
            currency: urlParams.get(`cur${i}`) || 'USD'
          });
          i++;
        }

        console.log('Received accounts:', accounts.length);

        if (accounts.length === 0) {
          console.error('No accounts in callback. URL params:', window.location.search);
          setError('No account information received from Deriv');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        const primaryAccount = accounts[0];
        console.log('Using account:', primaryAccount.account);
        
        TokenService.setTokens({
          account: primaryAccount.account,
          token: primaryAccount.token,
          currency: primaryAccount.currency
        });

        setStatus('Connecting to Deriv...');
        
        await websocketService.connect();
        console.log('WebSocket connected, authorizing...');
        
        setStatus('Authorizing your account...');
        const authResponse = await websocketService.authorize(primaryAccount.token);

        if (authResponse.error) {
          console.error('Authorization failed:', authResponse.error);
          setError(authResponse.error.message || 'Authorization failed');
          TokenService.clearTokens();
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        console.log('Authorization successful:', authResponse.authorize?.loginid);
        
        if (authResponse.authorize) {
          TokenService.setAccount(authResponse.authorize);
        }

        setStatus('Checking user permissions...');
        
        // Check if user is admin
        const derivId = authResponse.authorize?.loginid;
        if (derivId) {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('is_admin')
              .eq('deriv_id', derivId)
              .single();
            
            if (profile?.is_admin) {
              console.log('Admin user detected, redirecting to /admin');
              setStatus('Admin access granted! Redirecting...');
              navigate('/admin');
              return;
            }
          } catch (err) {
            console.log('Could not check admin status, using default redirect:', err);
          }
        }

        setStatus('Success! Redirecting...');
        navigate('/dashboard');
      } catch (err) {
        console.error('Callback error:', err);
        setError(err.message || 'An error occurred during authentication');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#040404] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-white">
          T
        </div>
        
        {error ? (
          <>
            <h2 className="text-xl font-semibold text-red-400 mb-2">Authentication Error</h2>
            <p className="text-gray-400">{error}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 border-2 border-[#ff3355] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Authenticating</h2>
            <p className="text-gray-400">{status}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Callback;

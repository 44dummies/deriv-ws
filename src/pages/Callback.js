import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import { supabase } from '../services/supabaseService';
import apiClient from '../services/apiClient';
import { ADMIN_IDS } from '../constants/admin';

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
          // Persist basic profile info for later use (balance, currency, derivId)
          TokenService.setProfileInfo({
            derivId: authResponse.authorize.loginid,
            balance: authResponse.authorize.balance,
            currency: authResponse.authorize.currency
          });
        }

        setStatus('Checking user permissions...');

        // Check if user is admin
        const derivId = authResponse.authorize?.loginid;
        console.log('[Callback] Checking admin status for:', derivId);



        if (derivId) {
          // Store derivId in sessionStorage for other pages to use
          sessionStorage.setItem('derivId', derivId);

          try {
            // Try to find profile by deriv_account_id first, then deriv_id
            let profile = null;
            let profileError = null;

            const { data: profile1, error: error1 } = await supabase
              .from('user_profiles')
              .select('is_admin, deriv_id, deriv_account_id')
              .eq('deriv_account_id', derivId)
              .single();

            if (profile1) {
              profile = profile1;
              profileError = error1;
            } else {
              // Try deriv_id column
              const { data: profile2, error: error2 } = await supabase
                .from('user_profiles')
                .select('is_admin, deriv_id, deriv_account_id')
                .eq('deriv_id', derivId)
                .single();
              profile = profile2;
              profileError = error2;
            }

            console.log('[Callback] Profile data:', profile);
            console.log('[Callback] Profile error:', profileError);
            console.log('[Callback] is_admin value:', profile?.is_admin);

            // Check is_admin flag OR hardcoded admin IDs
            const isAdminUser = profile?.is_admin || ADMIN_IDS.includes(derivId);

            // Store user info in sessionStorage for AdminRoute to check
            sessionStorage.setItem('userInfo', JSON.stringify({
              loginid: derivId,
              is_admin: isAdminUser,
              ...profile
            }));

            // Also authenticate with backend so REST calls have JWT
            try {
              const loginResult = await apiClient.loginWithDeriv({
                derivUserId: derivId,
                loginid: derivId,
                email: authResponse.authorize.email,
                currency: authResponse.authorize.currency,
                fullname: authResponse.authorize.fullname
              });
              TokenService.setBackendTokens(loginResult.accessToken, loginResult.refreshToken);
            } catch (apiErr) {
              console.error('[Callback] Backend auth failed:', apiErr);
            }

            if (isAdminUser) {
              console.log('[Callback] ✅ Admin user detected! Redirecting to /admin/dashboard');
              setStatus('Admin access granted! Redirecting...');
              setTimeout(() => navigate('/admin/dashboard'), 500);
              return;
            } else {
              console.log('[Callback] ℹ️ Regular user, redirecting to /user/dashboard');
              setStatus('Redirecting to your dashboard...');
              setTimeout(() => navigate('/user/dashboard'), 500);
              return;
            }
          } catch (err) {
            console.error('[Callback] Error checking admin status:', err);
          }
        }

        // Fallback to user dashboard for regular users
        setStatus('Success! Redirecting...');
        setTimeout(() => navigate('/user/dashboard'), 500);
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

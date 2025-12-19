import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import { supabase } from '../services/supabaseService';
import apiClient from '../services/apiClient';
import { Logo } from '../components/ui/Logo';

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



        if (accounts.length === 0) {
          console.error('No accounts in callback. URL params:', window.location.search);
          setError('No account information received from Deriv');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        const primaryAccount = accounts[0];


        TokenService.setTokens({
          account: primaryAccount.account,
          token: primaryAccount.token,
          currency: primaryAccount.currency
        });

        setStatus('Connecting to Deriv...');

        await websocketService.connect();


        setStatus('Authorizing your account...');
        const authResponse = await websocketService.authorize(primaryAccount.token);

        if (authResponse.error) {
          console.error('Authorization failed:', authResponse.error);
          setError(authResponse.error.message || 'Authorization failed');
          TokenService.clearTokens();
          setTimeout(() => navigate('/'), 3000);
          return;
        }



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

        const derivId = authResponse.authorize?.loginid;

        if (derivId) {
          // Store derivId in sessionStorage for other pages to use
          sessionStorage.setItem('derivId', derivId);

          // Store all accounts so we can use the correct token for demo/real sessions
          // Demo accounts start with VRTC, real accounts start with CR
          const demoAccount = accounts.find(a => a.account?.startsWith('VRTC'));
          const realAccount = accounts.find(a => a.account?.startsWith('CR'));

          if (demoAccount) {
            sessionStorage.setItem('derivDemoToken', demoAccount.token);
            sessionStorage.setItem('derivDemoAccount', demoAccount.account);
          }
          if (realAccount) {
            sessionStorage.setItem('derivRealToken', realAccount.token);
            sessionStorage.setItem('derivRealAccount', realAccount.account);
          }
          // Also store the current account's token for general use
          sessionStorage.setItem('derivToken', primaryAccount.token);

          // Authenticate with backend - admin status is determined by backend (single source of truth)
          let isAdminUser = false;
          try {
            const loginResult = await apiClient.loginWithDeriv({
              derivUserId: derivId,
              loginid: derivId,
              email: authResponse.authorize.email,
              currency: authResponse.authorize.currency,
              fullname: authResponse.authorize.fullname
            });
            // Only access token is returned - refresh token is in HttpOnly cookie
            TokenService.setBackendTokens(loginResult.accessToken, '');

            // Use the authoritative role from the backend response
            isAdminUser = loginResult.user?.is_admin === true || loginResult.user?.role === 'admin';
          } catch (apiErr) {
            console.error('[Callback] Backend auth failed:', apiErr);
          }

          // Store user info in sessionStorage for AdminProtected to check
          sessionStorage.setItem('userInfo', JSON.stringify({
            loginid: derivId,
            deriv_id: derivId,
            is_admin: isAdminUser
          }));

          // Always route to user dashboard - admin access is on-demand via /admin routes
          setStatus('Success! Redirecting to your dashboard...');
          setTimeout(() => navigate('/user/dashboard'), 500);
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
      {/* Liquid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff3355]/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="text-center relative z-10 p-8 glass-card rounded-3xl border-white/5 bg-black/40 backdrop-blur-2xl max-w-sm w-full mx-4 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#ff3355] blur-xl opacity-20 animate-pulse" />
            <Logo size={64} className="animate-float" />
          </div>
        </div>

        {error ? (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Failed</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-white bg-red-500/10 border border-red-500/20 px-6 py-2 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all"
            >
              Return to Login
            </button>
            <p className="text-xs text-gray-600 mt-6">Redirecting in a few seconds...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Authenticating</h2>
            <div className="h-1 w-16 bg-white/10 rounded-full mx-auto mb-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#ff3355] to-[#ff8042] w-1/2 animate-loading-bar" />
            </div>
            <p className="text-gray-400 text-sm">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Callback;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import { supabase } from '../services/supabaseService';
import apiClient from '../services/apiClient';

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

        // Check if user is admin - SINGLE SOURCE OF TRUTH: Supabase database
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


          // Check Supabase database for is_admin flag
          let isAdminUser = false;
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('is_admin, deriv_id')
              .eq('deriv_id', derivId)
              .single();

            if (profile && !profileError) {
              isAdminUser = profile.is_admin === true;

            } else if (profileError) {

            }
          } catch (err) {

          }



          // Store user info in sessionStorage for AdminProtected to check
          sessionStorage.setItem('userInfo', JSON.stringify({
            loginid: derivId,
            deriv_id: derivId,
            is_admin: isAdminUser
          }));

          // Authenticate with backend - refresh token is set as HttpOnly cookie
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
          } catch (apiErr) {
            console.error('[Callback] Backend auth failed:', apiErr);
          }

          if (isAdminUser) {

            setStatus('Admin access granted! Redirecting...');
            setTimeout(() => navigate('/admin/dashboard'), 500);
            return;
          } else {

            setStatus('Redirecting to your dashboard...');
            setTimeout(() => navigate('/user/dashboard'), 500);
            return;
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

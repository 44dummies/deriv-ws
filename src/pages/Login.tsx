import React from 'react';
import CONFIG from '../config';

const Login: React.FC = () => {
  const handleLogin = () => {
    const redirectUri = encodeURIComponent(CONFIG.REDIRECT_URL);
    const oauthUrl = `${CONFIG.OAUTH_URL}?app_id=${CONFIG.APP_ID}&l=EN&brand=deriv&redirect_uri=${redirectUri}`;
    window.location.href = oauthUrl;
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-4">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0e0e0e] via-[#1a1a1a] to-[#0e0e0e]" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/5">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">TradeSync</span>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-gray-500 text-sm">Connect with your Deriv account to continue</p>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Continue with Deriv
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600">Powered by Deriv API</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Info */}
          <p className="text-center text-xs text-gray-600">
            By continuing, you agree to sync your trading data securely
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          © 2024 TradeSync • Partner Application
        </p>
      </div>
    </div>
  );
};

export default Login;

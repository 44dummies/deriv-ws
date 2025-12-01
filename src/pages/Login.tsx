import React from 'react';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import CONFIG from '../config';

const Login: React.FC = () => {
  const handleLogin = () => {
    const authUrl = `${CONFIG.OAUTH_URL}?app_id=${CONFIG.APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URL)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950 text-white">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-16 h-80 w-80 rounded-full bg-deriv-red/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex items-center gap-3 mb-16">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-deriv-red to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-deriv-red/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Deriv Trading</h1>
            <p className="text-xs text-gray-400">Professional Trading Platform</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Trade with confidence
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Access markets with real-time data, advanced charts, and secure authentication.
              </p>
            </div>

            <div className="space-y-3">
              {[
                'Secure OAuth 2.0 authentication',
                'Real-time market data',
                'Advanced trading tools',
              ].map((item) => (
                <p key={item} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                  {item}
                </p>
              ))}
            </div>
          </div>

          {/* Login Card */}
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-deriv-red/20 via-fuchsia-500/10 to-transparent" />
            <div className="relative rounded-3xl border border-white/10 bg-gray-900/80 backdrop-blur-xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3 text-gray-400 text-sm mb-8">
                <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                Secured by Deriv OAuth
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold">Connect your account</h3>
                  <p className="text-gray-400 mt-2 text-sm">
                    Login securely with your Deriv credentials
                  </p>
                </div>

                <button
                  onClick={handleLogin}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-deriv-red via-rose-600 to-orange-500 py-4 text-lg font-semibold shadow-lg shadow-deriv-red/40"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Login with Deriv
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <p className="text-center text-xs text-gray-500">
                  By continuing you agree to Deriv's Terms & Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

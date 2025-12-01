import React from 'react';
import { Activity, ShieldCheck, Sparkles, Lock, ArrowRight, Zap } from 'lucide-react';
import CONFIG from '../config';

const Login: React.FC = () => {
  const handleLogin = () => {
    const authUrl = `${CONFIG.OAUTH_URL}?app_id=${CONFIG.APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URL)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950 text-white">
      {/* Glow gradients */}
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-16 h-80 w-80 rounded-full bg-deriv-red/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Top nav */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-deriv-red to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-deriv-red/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Deriv Pro</p>
              <h1 className="text-xl font-semibold">Intelligent Trading Workspace</h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Regulated access</span>
            <span className="flex items-center gap-1"><Activity className="w-4 h-4" /> Live market data</span>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-widest text-gray-300">
                <Zap className="w-3.5 h-3.5" /> Next-gen trading OS
              </span>
              <h2 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
                Trade every market in one cinematic dashboard.
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Secure OAuth login, synchronized watchlists, blazing fast charts, and AI-driven trade orchestration — built on Deriv's trusted infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[{ label: 'Live Symbols', value: '100+' }, { label: 'Avg. latency', value: '180ms' }, { label: 'Execution accuracy', value: '99.5%' }, { label: 'Daily strategies', value: '45K+' }].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[
                'Military-grade OAuth 2.0 authentication',
                'Real-time syncing across desktop & mobile',
                'Institutional-grade analytics and risk tooling',
              ].map((item) => (
                <p key={item} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold">•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>

          {/* Login Card */}
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-deriv-red/20 via-fuchsia-500/10 to-transparent" />
            <div className="relative rounded-3xl border border-white/10 bg-gray-900/80 backdrop-blur-xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                Encrypted login secured by Deriv OAuth
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Account Sync</p>
                  <h3 className="text-2xl font-semibold mt-2">Connect your Deriv identity</h3>
                  <p className="text-gray-400 mt-2 text-sm">
                    Authorize once. Instantly import balances, watchlists, and trade history into the new workspace.
                  </p>
                </div>

                <button
                  onClick={handleLogin}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-deriv-red via-rose-600 to-orange-500 py-4 text-lg font-semibold shadow-lg shadow-deriv-red/40"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Launch Secure Login
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                  <p className="font-medium text-white">Advanced protections</p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-400">
                    <li>• 256-bit TLS encrypted handshake</li>
                    <li>• Device binding & session integrity checks</li>
                    <li>• Instant revocation from account settings</li>
                  </ul>
                </div>

                <p className="text-center text-xs text-gray-500">
                  By continuing you agree to Deriv's Terms & Privacy Policy.
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

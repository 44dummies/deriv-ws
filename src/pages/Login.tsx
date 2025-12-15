
import React, { useState, useEffect } from 'react';
import { OAUTH_URL } from '../config';
import { TokenService } from '../services/tokenService';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';
import { ArrowRight, BarChart2, Shield, Zap, Globe, Lock, TrendingUp, CheckCircle2 } from 'lucide-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (TokenService.isAuthenticated()) {
            navigate('/user/dashboard');
        }
        setIsLoaded(true);
    }, [navigate]);

    const handleLogin = () => {
        window.location.href = OAUTH_URL;
    };

    return (
        <div className="min-h-screen bg-[#050510] relative overflow-hidden text-white font-sans selection:bg-[#ff3355]/30">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#ff3355]/20 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#3b82f6]/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />
                <div className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw] bg-[#a855f7]/20 rounded-full blur-[120px] animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center backdrop-blur-sm bg-black/5">
                <div className="flex items-center gap-3">
                    <Logo size={32} />
                    <span className="font-bold text-xl tracking-tight">TraderMind</span>
                </div>
                <button
                    onClick={handleLogin}
                    className="hidden sm:flex px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                    Log In
                </button>
            </nav>

            <main className={`relative z-10 container mx-auto px-4 min-h-screen flex flex-col justify-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                <div className="grid lg:grid-cols-2 gap-16 items-center pt-20">
                    {/* Left Column: Hero Text */}
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#ff3355] text-xs font-bold tracking-wider uppercase mb-8 animate-fade-in-up">
                            <Zap size={14} className="fill-current" />
                            <span>Next Gen Trading Intelligence</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 tracking-tight">
                            Master the Markets <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">
                                With Precision
                            </span>
                        </h1>

                        <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg">
                            Institutional-grade analytics, real-time risk management, and intelligent pattern recognition for professional Deriv traders.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleLogin}
                                className="group relative px-8 py-5 rounded-2xl bg-gradient-to-r from-[#ff3355] to-[#ff8c42] text-white font-bold text-lg shadow-xl shadow-[#ff3355]/20 hover:shadow-[#ff3355]/40 hover:scale-[1.02] transition-all"
                            >
                                <span className="flex items-center gap-3 relative z-10">
                                    <Shield className="fill-white/20" />
                                    Connect Deriv Account
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>

                            <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Globe size={16} className="text-emerald-400" />
                                    Global Access
                                </span>
                                <span className="w-px h-4 bg-white/10" />
                                <span className="flex items-center gap-1.5">
                                    <Lock size={16} className="text-emerald-400" />
                                    Secure & Encrypted
                                </span>
                            </div>
                        </div>

                        <div className="mt-16 flex items-center gap-8 border-t border-white/5 pt-8">
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-1">50K+</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Active Traders</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-1">$2M+</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Daily Volume</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-1">99.9%</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">System Uptime</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visuals/Cards */}
                    <div className="hidden lg:block relative">
                        {/* Abstract floating elements */}
                        <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl rotate-12 blur-3xl opacity-40 animate-pulse" />

                        <div className="relative z-10 space-y-6">
                            {/* Card 1: Live Analysis */}
                            <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 transform translate-x-12 hover:-translate-y-2 transition-transform duration-500 shadow-2xl">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Live Analysis</h4>
                                            <p className="text-xs text-emerald-400">Signal Strength: Strong Buy</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-gray-500">Vol_100 (1s)</span>
                                </div>
                                <div className="h-24 flex items-end justify-between gap-1">
                                    {[40, 65, 50, 80, 75, 90, 85, 95, 80, 70, 85, 60].map((h, i) => (
                                        <div
                                            key={i}
                                            className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-sm"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Card 2: Performance */}
                            <div className="p-6 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 transform hover:-translate-y-2 transition-transform duration-500 shadow-2xl relative -left-8">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#ff3355]/10 rounded-lg text-[#ff3355]">
                                            <BarChart2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Performance</h4>
                                            <p className="text-xs text-gray-400">Last 24 Hours</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xl text-white">+$1,240.50</div>
                                        <div className="text-[10px] text-emerald-400">+12.5%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Sheet Login (Visible on small screens) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 pb-8 bg-[#0a0a14] border-t border-white/10 rounded-t-3xl z-40 transform transition-transform animate-slide-up">
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8c42] text-white font-bold text-lg shadow-lg flex justify-center items-center gap-2"
                    >
                        <Shield size={20} className="fill-white/20" />
                        Connect with Deriv
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        By connecting, you agree to our Terms of Service.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Login;

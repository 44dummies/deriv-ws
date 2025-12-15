
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
        <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden text-white font-sans selection:bg-brand-red/30">
            {/* Background Effects - Clean Tech */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid opacity-20"></div>
                {/* Subtle Ambient Glow */}
                <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-red/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center bg-brand-dark/80 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Logo size={28} />
                    <span className="font-bold text-xl tracking-tight text-white">TraderMind</span>
                </div>
                <button
                    onClick={handleLogin}
                    className="hidden sm:flex px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium"
                >
                    Log In
                </button>
            </nav>

            <main className={`relative z-10 flex-1 container mx-auto px-4 flex flex-col justify-center transition-all duration-1000 transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                <div className="grid lg:grid-cols-2 gap-16 items-center pt-20">
                    {/* Left Column: Hero Text */}
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold tracking-wider uppercase mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
                            <span>Institutional Grade Intelligence</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight text-white">
                            Precision Trading <br />
                            <span className="text-gray-400">
                                Simplified.
                            </span>
                        </h1>

                        <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg">
                            Advanced automated strategies and real-time risk management for professional Deriv traders.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleLogin}
                                className="group relative px-8 py-4 rounded-xl bg-brand-red text-white font-semibold text-lg hover:bg-brand-redHover transition-all shadow-lg shadow-brand-red/20 hover:shadow-brand-red/30 flex items-center justify-center gap-3"
                            >
                                <Shield className="w-5 h-5 opacity-80" />
                                <span>Connect with Deriv</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="flex items-center justify-center gap-6 px-6 py-4 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-400 hover:bg-white/10 transition-colors">
                                <span className="flex items-center gap-2">
                                    <Globe size={16} className="text-gray-400" />
                                    <span>24/7 Access</span>
                                </span>
                                <span className="w-px h-4 bg-white/10" />
                                <span className="flex items-center gap-2">
                                    <Lock size={16} className="text-gray-400" />
                                    <span>Encrypted</span>
                                </span>
                            </div>
                        </div>

                        <div className="mt-16 flex items-center gap-12 border-t border-white/5 pt-8">
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-1">50K+</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Traders</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-1">$2M+</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Daily Volume</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visuals/Cards */}
                    <div className="hidden lg:block relative">
                        {/* Decorative background for cards */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/10 to-transparent rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                        <div className="relative z-10 space-y-6">
                            {/* Card 1: Live Analysis */}
                            <div className="p-6 rounded-2xl bg-brand-card border border-white/5 shadow-2xl backdrop-blur-md transform translate-x-12">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Market Velocity</h4>
                                            <p className="text-xs text-gray-400">Real-time Analysis</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-brand-red font-medium">STRONG BUY</span>
                                </div>
                                <div className="h-32 flex items-end justify-between gap-1">
                                    {[40, 65, 50, 80, 75, 90, 85, 95, 80, 70, 85, 60, 70, 85, 90, 100].map((h, i) => (
                                        <div
                                            key={i}
                                            className="w-full bg-brand-red/80 rounded-sm hover:opacity-100 transition-opacity"
                                            style={{ height: `${h}%`, opacity: 0.3 + (i / 20) }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Card 2: Performance */}
                            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-white/5 shadow-2xl backdrop-blur-md relative -left-8 w-[90%] pointer-events-none">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                            <BarChart2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Performance</h4>
                                            <p className="text-xs text-gray-400">Total Profit</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xl text-white">+$1,240.50</div>
                                        <div className="text-[10px] text-emerald-500 font-bold">+12.5%</div>
                                    </div>
                                </div>
                                {/* Simple Line Chart Visual */}
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-4">
                                    <div className="h-full bg-emerald-500 w-[70%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Sheet Login */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 pb-8 bg-brand-card border-t border-white/10 z-40">
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 rounded-xl bg-brand-red text-white font-bold text-lg shadow-lg shadow-brand-red/20 flex justify-center items-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <Shield size={20} className="opacity-90" />
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

import React, { useState, useEffect, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, BarChart3, Users, Shield, ChevronRight, Star, TrendingUp,
    Activity, Target, Award, Clock, ArrowRight, Sparkles, LineChart,
    LucideIcon
} from 'lucide-react';
import { TokenService } from '../services/tokenService';
import { OAUTH_URL } from '../config';

interface Feature {
    icon: ReactElement;
    title: string;
    description: string;
}

interface Stat {
    value: string;
    label: string;
}

interface Testimonial {
    name: string;
    role: string;
    content: string;
    avatar: string;
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (TokenService.isAuthenticated()) {
            navigate('/dashboard');
        }
        setIsLoaded(true);

        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [navigate]);

    const handleLogin = (): void => {
        window.location.href = OAUTH_URL;
    };

    const features: Feature[] = [
        { icon: <BarChart3 className="w-6 h-6" />, title: 'Advanced Analytics', description: 'Deep insights with win rates, profit tracking, and pattern analysis.' },
        { icon: <Activity className="w-6 h-6" />, title: 'Real-time Sync', description: 'Seamlessly sync your Deriv data with automatic updates.' },
        { icon: <Target className="w-6 h-6" />, title: 'Digit Analysis', description: 'Powerful analyzer to identify profitable digit patterns.' },
        { icon: <Clock className="w-6 h-6" />, title: 'Trade Timeline', description: 'Complete history with detailed breakdowns and metrics.' },
        { icon: <Users className="w-6 h-6" />, title: 'Community', description: 'Connect, share strategies, and grow with fellow traders.' },
        { icon: <Award className="w-6 h-6" />, title: 'Smart Journal', description: 'Track mood and reflections to master your psychology.' },
    ];

    const stats: Stat[] = [
        { value: '50K+', label: 'Active Traders' },
        { value: '$2M+', label: 'Daily Volume' },
        { value: '99.9%', label: 'Uptime' },
        { value: '4.9/5', label: 'User Rating' },
    ];

    const testimonials: Testimonial[] = [
        { name: 'Sarah K.', role: 'Professional Trader', content: 'TraderMind transformed my analysis. The digit analyzer alone improved my win rate by 15%.', avatar: '👩‍💼' },
        { name: 'Michael R.', role: 'Day Trader', content: 'Finally a tool that syncs perfectly with Deriv. The analytics are incredible and the UI is beautiful.', avatar: '👨‍💻' },
        { name: 'Emma L.', role: 'Binary Options', content: 'The trading journal helped me understand my psychology. Now I make informed decisions.', avatar: '👩‍🔬' },
    ];

    return (
        <div className={`min-h-screen overflow-hidden bg-[#050510] text-[#e0e0ed] font-sans selection:bg-[#ff3355]/30 ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}>
            {/* Liquid Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff3355]/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#3b82f6]/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-[#a855f7]/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 transition-all duration-300 glass-card border-b-0 rounded-none bg-black/20">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#ff3355] to-[#ff8042] rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200" />
                            <div className="relative w-10 h-10 rounded-lg bg-black flex items-center justify-center border border-white/10">
                                <span className="text-xl font-bold bg-gradient-to-br from-[#ff3355] to-[#ff8042] bg-clip-text text-transparent">T</span>
                            </div>
                        </div>
                        <span className="text-xl font-bold tracking-tight">TraderMind</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#stats" className="hover:text-white transition-colors">Stats</a>
                        <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
                    </div>

                    <button
                        onClick={handleLogin}
                        className="glossy-btn px-6 py-2.5 rounded-xl text-sm font-medium hover:text-white transition-all hover:border-[var(--theme-primary)]"
                    >
                        Member Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-xs font-medium text-[#ff3355] border-[#ff3355]/20 animate-fade-in-up">
                            <Sparkles size={14} className="animate-pulse" />
                            <span>The #1 Analytics Platform for Deriv</span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                            Master the Markets <br />
                            <span className="text-gradient-primary">With Precision</span>
                        </h1>

                        <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
                            Elevate your trading with institutional-grade analytics, real-time sync, and intelligent pattern recognition. Built for serious traders.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={handleLogin}
                                className="group relative px-8 py-4 rounded-xl font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #ff3355 0%, #ff8042 100%)' }}
                            >
                                <span className="flex items-center gap-2">
                                    <Shield size={20} />
                                    Connect Deriv Account
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                            <button className="px-8 py-4 rounded-xl glass-card hover:bg-white/5 transition-all font-medium flex items-center gap-2">
                                <Zap size={20} className="text-[#ff3355]" />
                                View Demo
                            </button>
                        </div>

                        <div className="pt-8 flex items-center gap-8 border-t border-white/5">
                            <div>
                                <div className="text-2xl font-bold">50K+</div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Traders</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-400">98%</div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Satisfaction</div>
                            </div>
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-xs">
                                        {'User'[i - 1]}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Cosmetic Dashboard Preview */}
                    <div className="relative hidden lg:block perspective-1000">
                        <div className="absolute -inset-4 bg-gradient-to-r from-[#ff3355] to-[#3b82f6] rounded-[2rem] opacity-30 blur-2xl animate-pulse" />
                        <div className="relative glass-card rounded-[2rem] p-8 transform rotate-y-6 hover:rotate-y-0 transition-transform duration-700">
                            {/* Fake Header */}
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="text-xs text-gray-500 font-mono">dashboard.tradermind.app</div>
                            </div>

                            {/* Fake Chart Area */}
                            <div className="h-64 flex items-end justify-between gap-2 mb-8 px-4">
                                {[30, 50, 45, 60, 80, 70, 90, 85, 100, 95, 80, 85].map((h, i) => (
                                    <div key={i} style={{ height: `${h}%` }} className="w-full bg-gradient-to-t from-[#ff3355]/50 to-[#ff8042]/50 rounded-t-sm relative group">
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-black px-2 py-1 rounded text-[#ff8042] font-bold">
                                            {h}%
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-4 rounded-xl flex items-center gap-3 bg-white/5">
                                    <div className="p-2 rounded-lg bg-green-500/20 text-green-400"><TrendingUp size={20} /></div>
                                    <div>
                                        <div className="text-xs text-gray-400">Profit Adjustment</div>
                                        <div className="font-bold text-green-400">+$245.50</div>
                                    </div>
                                </div>
                                <div className="glass-card p-4 rounded-xl flex items-center gap-3 bg-white/5">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Activity size={20} /></div>
                                    <div>
                                        <div className="text-xs text-gray-400">Win Rate</div>
                                        <div className="font-bold text-white">68.5%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Glass Grid */}
            <section className="relative z-10 py-24 px-6 bg-black/20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Unleash Your Potential</h2>
                        <p className="text-gray-400">Powerful tools in a beautiful interface</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="glass-card glass-card-hover rounded-2xl p-8 transition-all duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff3355]/20 to-[#ff8042]/20 flex items-center justify-center text-[#ff3355] mb-6 group-hover:scale-110 transition-transform">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 group-hover:text-[#ff8042] transition-colors">{f.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-sm">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 pt-20 pb-10 px-6 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center font-bold text-white">T</div>
                        <span className="font-bold text-gray-300">TraderMind</span>
                    </div>
                    <div className="text-gray-500 text-sm">© 2025 TraderMind. All rights reserved.</div>
                </div>
            </footer>
        </div>
    );
};

export default Login;

import React, { useState, useEffect, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, BarChart3, Users, Shield, Star, TrendingUp,
    Activity, Target, Award, Clock, ArrowRight, Sparkles,
    Quote, CheckCircle2, Menu, X
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
    icon: ReactElement;
    color: string;
}

interface Testimonial {
    name: string;
    role: string;
    content: string;
    avatar: string;
    rating: number;
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        { icon: <BarChart3 className="w-5 h-5" />, title: 'Advanced Analytics', description: 'Deep insights with win rates, profit tracking, and pattern analysis.' },
        { icon: <Activity className="w-5 h-5" />, title: 'Real-time Sync', description: 'Seamlessly sync your Deriv data with automatic updates.' },
        { icon: <Target className="w-5 h-5" />, title: 'Digit Analysis', description: 'Powerful analyzer to identify profitable digit patterns.' },
        { icon: <Clock className="w-5 h-5" />, title: 'Trade Timeline', description: 'Complete history with detailed breakdowns and metrics.' },
        { icon: <Users className="w-5 h-5" />, title: 'Community', description: 'Connect, share strategies, and grow with fellow traders.' },
        { icon: <Award className="w-5 h-5" />, title: 'Smart Journal', description: 'Track mood and reflections to master your psychology.' },
    ];

    const stats: Stat[] = [
        { value: '50K+', label: 'Active Traders', icon: <Users size={18} />, color: 'from-blue-500 to-cyan-400' },
        { value: '$2M+', label: 'Daily Volume', icon: <TrendingUp size={18} />, color: 'from-green-500 to-emerald-400' },
        { value: '99.9%', label: 'Uptime', icon: <Activity size={18} />, color: 'from-purple-500 to-pink-400' },
        { value: '4.9/5', label: 'User Rating', icon: <Star size={18} />, color: 'from-amber-500 to-orange-400' },
    ];

    const testimonials: Testimonial[] = [
        { name: 'Sarah K.', role: 'Professional Trader', content: 'TraderMind transformed my analysis. The digit analyzer alone improved my win rate by 15%.', avatar: '👩‍💼', rating: 5 },
        { name: 'Michael R.', role: 'Day Trader', content: 'Finally a tool that syncs perfectly with Deriv. The analytics are incredible and the UI is beautiful.', avatar: '👨‍💻', rating: 5 },
        { name: 'Emma L.', role: 'Binary Options', content: 'The trading journal helped me understand my psychology. Now I make informed decisions.', avatar: '👩‍🔬', rating: 5 },
    ];

    return (
        <div className={`min-h-screen overflow-x-hidden bg-[#050510] text-[#e0e0ed] font-sans selection:bg-[#ff3355]/30 ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}>

            {/* Mouse Spotlight - Desktop Only */}
            <div
                className="hidden md:block fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 transition-all duration-300 ease-out"
                style={{
                    left: mousePosition.x - 300,
                    top: mousePosition.y - 300,
                    background: 'radial-gradient(circle, rgba(255,51,85,0.08) 0%, transparent 70%)',
                }}
            />

            {/* Liquid Background - Optimized for Mobile */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#ff3355]/25 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
                <div className="absolute top-0 right-1/4 w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-[#3b82f6]/25 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
                <div className="absolute -bottom-32 left-1/3 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#a855f7]/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{ animationDelay: '4s' }} />
                <div className="hidden md:block absolute top-1/2 right-0 w-[300px] h-[300px] bg-[#10b981]/15 rounded-full mix-blend-screen filter blur-[80px] animate-blob" style={{ animationDelay: '3s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            </div>

            {/* Particles - Desktop Only */}
            <div className="hidden md:block fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 10}s`,
                        }}
                    />
                ))}
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 glass-card border-b-0 rounded-none bg-black/30 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-[#ff3355] to-[#ff8042] rounded-lg sm:rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-300" />
                            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center shadow-lg shadow-[#ff3355]/30">
                                <span className="text-lg sm:text-xl font-bold text-white">T</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-base sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">TraderMind</span>
                            <p className="hidden sm:block text-[10px] text-gray-500 -mt-0.5 uppercase tracking-widest">Analytics Platform</p>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors relative group">
                            Features
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#ff3355] to-[#ff8042] group-hover:w-full transition-all duration-300" />
                        </a>
                        <a href="#stats" className="hover:text-white transition-colors relative group">
                            Stats
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#ff3355] to-[#ff8042] group-hover:w-full transition-all duration-300" />
                        </a>
                        <a href="#testimonials" className="hover:text-white transition-colors relative group">
                            Reviews
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#ff3355] to-[#ff8042] group-hover:w-full transition-all duration-300" />
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Desktop CTA */}
                    <button
                        onClick={handleLogin}
                        className="hidden md:block group relative px-5 py-2.5 rounded-xl text-sm font-semibold overflow-hidden min-h-[44px]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#ff3355] to-[#ff8042] opacity-80 group-hover:opacity-100 transition-opacity" />
                        <span className="relative text-white flex items-center gap-2">
                            Get Started
                            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-xl">
                        <div className="px-4 py-4 space-y-3">
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base text-gray-300 hover:text-white transition-colors border-b border-white/5">
                                Features
                            </a>
                            <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base text-gray-300 hover:text-white transition-colors border-b border-white/5">
                                Stats
                            </a>
                            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base text-gray-300 hover:text-white transition-colors border-b border-white/5">
                                Reviews
                            </a>
                            <button
                                onClick={handleLogin}
                                className="w-full mt-4 py-3.5 rounded-xl text-base font-semibold text-white min-h-[48px]"
                                style={{ background: 'linear-gradient(135deg, #ff3355 0%, #ff8042 100%)' }}
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-20 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
                    <div className="space-y-6 sm:space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass-card text-xs font-medium border border-[#ff3355]/30">
                            <Sparkles size={12} className="text-[#ff3355] animate-pulse" />
                            <span className="text-[#ff3355] text-[11px] sm:text-xs">#1 Analytics Platform for Deriv</span>
                            <

                                CheckCircle2 size={12} className="text-green-400" />
                        </div>

                        <h1 className="text-[32px] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                            Master the Markets <br />
                            <span className="text-gradient-primary">With Precision</span>
                        </h1>

                        <p className="text-base sm:text-lg text-gray-400 max-w-xl leading-relaxed">
                            Elevate your trading with institutional-grade analytics, real-time sync, and intelligent pattern recognition. <span className="text-white font-medium">Built for serious traders.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                            <button
                                onClick={handleLogin}
                                className="group relative px-6 sm:px-8 py-4 rounded-2xl font-semibold text-white shadow-2xl shadow-[#ff3355]/30 transition-all hover:scale-[1.02] hover:shadow-[#ff3355]/40 active:scale-[0.98] min-h-[52px] sm:min-h-[56px]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-[#ff3355] to-[#ff8042] rounded-2xl" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                                <span className="relative flex items-center justify-center gap-3 text-base sm:text-base">
                                    <Shield size={20} className="sm:w-[22px] sm:h-[22px]" />
                                    Connect Deriv Account
                                    <ArrowRight size={18} className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                            <button className="px-6 sm:px-8 py-4 rounded-2xl glass-card hover:bg-white/5 transition-all font-medium flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 min-h-[52px] sm:min-h-[56px] text-base sm:text-base">
                                <Zap size={20} className="text-[#ff3355]" />
                                View Demo
                            </button>
                        </div>

                        <div className="pt-6 sm:pt-8 flex flex-wrap items-center gap-4 sm:gap-8 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {['🧑‍💼', '👨‍💻', '👩‍🔬', '🧑‍🎨'].map((emoji, i) => (
                                        <div key={i} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[#050510] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-base sm:text-lg">
                                            {emoji}
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="text-base sm:text-lg font-bold">50K+</div>
                                    <div className="text-xs text-gray-500">Active Traders</div>
                                </div>
                            </div>
                            <div className="h-8 sm:h-10 w-px bg-white/10 hidden sm:block" />
                            <div className="flex items-center gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} className="sm:w-[18px] sm:h-[18px] text-amber-400 fill-amber-400" />
                                ))}
                                <span className="ml-1 sm:ml-2 font-bold text-sm sm:text-base">4.9/5</span>
                                <span className="text-gray-500 text-xs sm:text-sm">(2.5k)</span>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Preview - Desktop Only */}
                    <div className="relative hidden lg:block">
                        <div className="absolute -inset-8 bg-gradient-to-r from-[#ff3355]/30 to-[#3b82f6]/30 rounded-[3rem] blur-3xl animate-pulse" />
                        <div className="relative glass-card rounded-[2rem] p-8 border border-white/10 backdrop-blur-2xl">
                            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="text-xs text-gray-500 font-mono bg-white/5 px-3 py-1 rounded-full">app.tradermind.com</div>
                            </div>

                            <div className="h-56 flex items-end justify-between gap-1.5 mb-6 px-2">
                                {[35, 55, 48, 65, 82, 72, 88, 78, 95, 90, 82, 88].map((h, i) => (
                                    <div
                                        key={i}
                                        className="w-full rounded-t-md relative group transition-all duration-300 hover:scale-105"
                                        style={{
                                            height: `${h}%`,
                                            background: `linear-gradient(to top, rgba(255,51,85,0.6) 0%, rgba(255,128,66,0.3) 100%)`,
                                        }}
                                    >
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/80 px-2 py-0.5 rounded text-[#ff8042] font-bold whitespace-nowrap">
                                            {h}%
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-card p-4 rounded-xl flex items-center gap-3 bg-green-500/5 border border-green-500/20">
                                    <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Today's Profit</div>
                                        <div className="font-bold text-green-400 text-lg">+$1,245</div>
                                    </div>
                                </div>
                                <div className="glass-card p-4 rounded-xl flex items-center gap-3 bg-blue-500/5 border border-blue-500/20">
                                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Win Rate</div>
                                        <div className="font-bold text-white text-lg">73.5%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats - 2 Column Mobile */}
            <section id="stats" className="relative z-10 py-12 sm:py-16 md:py-20 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="glass-card glass-card-hover rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center group">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                                    {stat.icon}
                                </div>
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                                <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features - Single Column Mobile */}
            <section id="features" className="relative z-10 py-12 sm:py-16 md:py-24 px-4 sm:px-6 bg-gradient-to-b from-transparent via-black/30 to-transparent">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass-card text-xs font-medium text-purple-400 border border-purple-500/30 mb-4 sm:mb-6">
                            <Sparkles size={14} />
                            <span>Powerful Features</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-4">Everything You Need</h2>
                        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">Powerful tools wrapped in a beautiful, intuitive interface designed for professional traders.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="glass-card glass-card-hover rounded-xl sm:rounded-2xl p-6 sm:p-8 transition-all duration-300 group border border-white/5 hover:border-[#ff3355]/30">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#ff3355]/20 to-[#ff8042]/10 flex items-center justify-center text-[#ff3355] mb-4 sm:mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#ff3355]/20 transition-all">
                                    {f.icon}
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 group-hover:text-[#ff8042] transition-colors">{f.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-sm">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials - Single Column Mobile */}
            <section id="testimonials" className="relative z-10 py-12 sm:py-16 md:py-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass-card text-xs font-medium text-amber-400 border border-amber-500/30 mb-4 sm:mb-6">
                            <Star size={14} className="fill-amber-400" />
                            <span>Trusted by Thousands</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-4">What Traders Say</h2>
                        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">Join thousands of successful traders who have transformed their analysis with TraderMind.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {testimonials.map((t, i) => (
                            <div key={i} className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 group hover:border-amber-500/30 transition-colors border border-white/5">
                                <Quote size={28} className="sm:w-8 sm:h-8 text-[#ff3355]/30 mb-3 sm:mb-4" />
                                <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{t.content}</p>
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl sm:text-2xl border-2 border-white/10 flex-shrink-0">
                                        {t.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm sm:text-base">{t.name}</div>
                                        <div className="text-xs sm:text-sm text-gray-500">{t.role}</div>
                                    </div>
                                    <div className="flex gap-0.5 flex-shrink-0">
                                        {[...Array(t.rating)].map((_, j) => (
                                            <Star key={j} size={12} className="sm:w-[14px] sm:h-[14px] text-amber-400 fill-amber-400" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 py-12 sm:py-16 md:py-24 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden border border-[#ff3355]/20">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#ff3355]/10 to-[#ff8042]/10" />
                        <div className="relative">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-4">Ready to Level Up?</h2>
                            <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                                Join 50,000+ traders who are already using TraderMind to make smarter decisions and grow their accounts.
                            </p>
                            <button
                                onClick={handleLogin}
                                className="group inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-semibold text-white shadow-2xl shadow-[#ff3355]/30 transition-all hover:scale-[1.02] hover:shadow-[#ff3355]/40 min-h-[52px] sm:min-h-[56px] text-base sm:text-base"
                                style={{ background: 'linear-gradient(135deg, #ff3355 0%, #ff8042 100%)' }}
                            >
                                <Shield size={22} className="sm:w-6 sm:h-6" />
                                <span className="hidden sm:inline">Start Trading Smarter Today</span>
                                <span className="sm:hidden">Get Started Now</span>
                                <ArrowRight size={20} className="sm:w-[22px] sm:h-[22px] group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6 px-4">Free to use • No credit card required • Connect in 30 seconds</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 pt-12 sm:pt-16 pb-6 sm:pb-8 px-4 sm:px-6 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6 sm:mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center font-bold text-white shadow-lg shadow-[#ff3355]/30">T</div>
                            <span className="font-bold text-base sm:text-lg">TraderMind</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-gray-500">
                            <a href="#features" className="hover:text-white transition-colors">Features</a>
                            <a href="#stats" className="hover:text-white transition-colors">Stats</a>
                            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                        </div>
                    </div>
                    <div className="text-center text-gray-600 text-xs sm:text-sm">© 2025 TraderMind. All rights reserved. Not affiliated with Deriv.com</div>
                </div>
            </footer>
        </div>
    );
};

export default Login;

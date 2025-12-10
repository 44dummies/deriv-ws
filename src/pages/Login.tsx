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

    useEffect(() => {
        if (TokenService.isAuthenticated()) {
            navigate('/dashboard');
        }
        setIsLoaded(true);
    }, [navigate]);

    const handleLogin = (): void => {
        window.location.href = OAUTH_URL;
    };

    const features: Feature[] = [
        { icon: <BarChart3 className="w-6 h-6" />, title: 'Advanced Analytics', description: 'Deep insights into your trading performance with win rates, profit tracking, and pattern analysis.' },
        { icon: <Activity className="w-6 h-6" />, title: 'Real-time Sync', description: 'Seamlessly sync your Deriv trading data with automatic updates and live balance tracking.' },
        { icon: <Target className="w-6 h-6" />, title: 'Digit Analysis', description: 'Powerful digit analyzer to identify patterns and hot/cold digits in your trades.' },
        { icon: <Clock className="w-6 h-6" />, title: 'Trade Timeline', description: 'Complete history of all your trades with detailed breakdowns and performance metrics.' },
        { icon: <Users className="w-6 h-6" />, title: 'Community', description: 'Connect with fellow traders, share strategies, and learn from the community.' },
        { icon: <Award className="w-6 h-6" />, title: 'Trading Journal', description: 'Document your journey with mood tracking, notes, and trade reflections.' },
    ];

    const stats: Stat[] = [
        { value: '50K+', label: 'Active Traders' },
        { value: '$2M+', label: 'Daily Volume' },
        { value: '99.9%', label: 'Uptime' },
        { value: '4.9/5', label: 'User Rating' },
    ];

    const testimonials: Testimonial[] = [
        { name: 'Sarah K.', role: 'Professional Trader', content: 'TraderMind transformed how I analyze my trades. The digit analyzer alone has improved my win rate by 15%.', avatar: '👩‍💼' },
        { name: 'Michael R.', role: 'Day Trader', content: 'Finally a tool that syncs perfectly with Deriv. The analytics are incredible and the UI is beautiful.', avatar: '👨‍💻' },
        { name: 'Emma L.', role: 'Binary Options Trader', content: 'The trading journal feature helped me understand my patterns. Now I make more informed decisions.', avatar: '👩‍🔬' },
    ];

    return (

        <div className={`min-h-screen overflow-hidden transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>
            <div className="fixed inset-0 pointer-events-none">
                {/* Reduced opacity on mobile for better text readability */}
                <div className="absolute -top-40 -left-40 h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] rounded-full bg-[var(--theme-primary)]/10 sm:bg-[var(--theme-primary)]/20 blur-[120px] sm:blur-[160px] animate-pulse" />
                <div className="absolute top-1/2 -right-40 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-[var(--theme-accent)]/10 sm:bg-[var(--theme-accent)]/15 blur-[120px] sm:blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-40 left-1/3 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full bg-[var(--theme-primary)]/5 sm:bg-[var(--theme-primary)]/10 blur-[100px] sm:blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:60px_60px]" />
            </div>

            <nav className="relative z-20 border-b border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-accent)] flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg shadow-[var(--theme-primary)]/20">
                            T
                        </div>
                        <span className="text-lg sm:text-xl font-bold tracking-tight">TraderMind</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#stats" className="hover:text-white transition-colors">Stats</a>
                        <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
                    </div>
                    <button
                        onClick={handleLogin}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium active:scale-95 touch-manipulation"
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-20 pb-12 sm:pb-32">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    <div className="space-y-6 sm:space-y-8 text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-sm mx-auto sm:mx-0">
                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--theme-primary)]" />
                            <span className="text-gray-400">Trusted by 50,000+ traders worldwide</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                            <span className="block mb-2">Your Trading</span>
                            <span className="block bg-gradient-to-r from-[var(--theme-primary)] via-[var(--theme-accent)] to-[var(--theme-primary)] bg-clip-text text-transparent pb-2">
                                Command Center
                            </span>
                        </h1>

                        <p className="text-sm sm:text-xl text-gray-400 max-w-lg leading-relaxed mx-auto sm:mx-0 px-2 sm:px-0">
                            Advanced analytics, real-time sync with Deriv, digit analysis, and a powerful trading journal.
                            Everything you need to become a better trader.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                                onClick={handleLogin}
                                className="group flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-semibold text-base sm:text-lg hover:opacity-90 transition-all shadow-lg shadow-[#ff3355]/20"
                            >
                                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                                Connect with Deriv
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <a
                                href="#features"
                                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium text-sm sm:text-base"
                            >
                                Explore Features
                            </a>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 pt-2 sm:pt-4">
                            <div className="flex -space-x-2 sm:-space-x-3">
                                {['🎯', '👑', '🚀', '💎'].map((emoji, i) => (
                                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border-2 border-[#0a0a0a] flex items-center justify-center text-sm sm:text-lg">
                                        {emoji}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />)}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">Rated 4.9/5 by traders</p>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Preview - hidden on mobile */}
                    <div className="relative hidden lg:block">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ff3355]/20 to-[#5d5dff]/20 rounded-3xl blur-3xl" />
                        <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <LineChart className="w-6 h-6 text-[#ff5f6d]" />
                                    <span className="font-semibold">Performance Overview</span>
                                </div>
                                <span className="text-sm text-green-400">+15.4% today</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-2xl bg-white/5">
                                    <p className="text-2xl font-bold text-green-400">72.5%</p>
                                    <p className="text-sm text-gray-400">Win Rate</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5">
                                    <p className="text-2xl font-bold">$12,450</p>
                                    <p className="text-sm text-gray-400">Total Profit</p>
                                </div>
                            </div>

                            <div className="h-32 flex items-end gap-1">
                                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 rounded-t-lg bg-gradient-to-t from-[#ff3355] to-[#ff8042]"
                                        style={{ height: `${h}%`, opacity: 0.5 + (i * 0.04) }}
                                    />
                                ))}
                            </div>

                            <div className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                    <div>
                                        <p className="font-medium">R_100</p>
                                        <p className="text-sm text-gray-400">Rise/Fall</p>
                                    </div>
                                </div>
                                <span className="text-green-400 font-semibold">+$25.00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="stats" className="relative z-10 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#ff3355] to-[#ff8042] bg-clip-text text-transparent">
                                    {stat.value}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
                <div className="text-center mb-8 sm:mb-16">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
                        Everything You Need to
                        <span className="bg-gradient-to-r from-[#ff3355] to-[#ff8042] bg-clip-text text-transparent"> Trade Smarter</span>
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto px-4">
                        Powerful tools designed to give you an edge in the markets
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className="group p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                        >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#ff3355]/20 to-[#ff8042]/20 flex items-center justify-center text-[#ff5f6d] mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="text-base sm:text-xl font-semibold mb-1.5 sm:mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
                <div className="text-center mb-8 sm:mb-16">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
                        Loved by
                        <span className="bg-gradient-to-r from-[#ff3355] to-[#ff8042] bg-clip-text text-transparent"> Traders</span>
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-lg">See what our community has to say</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {testimonials.map((testimonial, i) => (
                        <div
                            key={i}
                            className="p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                                {[1, 2, 3, 4, 5].map(j => <Star key={j} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />)}
                            </div>
                            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed">"{testimonial.content}"</p>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-xl sm:text-2xl">
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <p className="text-sm sm:text-base font-medium">{testimonial.name}</p>
                                    <p className="text-xs sm:text-sm text-gray-400">{testimonial.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
                <div className="relative rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6 sm:p-12 md:p-16 text-center overflow-hidden">
                    <div className="absolute -top-20 -right-20 h-40 sm:h-80 w-40 sm:w-80 rounded-full bg-[#ff3355]/20 blur-[60px] sm:blur-[100px]" />
                    <div className="absolute -bottom-20 -left-20 h-40 sm:h-80 w-40 sm:w-80 rounded-full bg-[#5d5dff]/20 blur-[60px] sm:blur-[100px]" />

                    <div className="relative z-10">
                        <h2 className="text-xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6">
                            Ready to Transform Your Trading?
                        </h2>
                        <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
                            Join thousands of traders who use TraderMind to analyze, track, and improve their trading performance.
                        </p>
                        <button
                            onClick={handleLogin}
                            className="group inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-semibold text-base sm:text-lg hover:opacity-90 transition-all shadow-lg shadow-[#ff3355]/20"
                        >
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                            Get Started Now
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            <footer className="relative z-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center font-bold">
                                T
                            </div>
                            <span className="font-semibold">TraderMind</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            © 2025 TraderMind. A 44 Dummies Company.
                        </p>
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                            <a href="https://tradermind.site/privacy" className="hover:text-white">Privacy</a>
                            <a href="https://tradermind.site/terms" className="hover:text-white">Terms</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Login;

import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Activity, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';

const Landing = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDerivLogin = () => {
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1089';
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=EN&brand=deriv`;
    };

    const features = [
        {
            icon: ShieldCheck,
            title: 'Audit-Ready Tracking',
            description: 'Complete session logging with approval chains and trace records',
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            icon: Lock,
            title: 'Zero-Trust Security',
            description: 'Server-side token handling with AES-256 encryption',
            gradient: 'from-purple-500 to-pink-500'
        },
        {
            icon: Activity,
            title: 'Real-Time Analytics',
            description: 'WebSocket-driven updates with sub-second latency',
            gradient: 'from-orange-500 to-red-500'
        }
    ];

    const stats = [
        { value: '99.9%', label: 'Uptime', icon: TrendingUp },
        { value: '<50ms', label: 'Latency', icon: Zap },
        { value: '24/7', label: 'Monitoring', icon: BarChart3 }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50"
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-xl tracking-tight">TraderMind</span>
                    </div>
                    <motion.a
                        href="https://github.com/44dummies/deriv-ws"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Documentation
                    </motion.a>
                </div>
            </motion.header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={mounted ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={mounted ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                            >
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-xs font-medium text-primary">Live Production System</span>
                            </motion.div>

                            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
                                Trading oversight
                                <br />
                                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    simplified
                                </span>
                            </h1>

                            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                                Real-time monitoring and session controls for Deriv quantitative trading.
                                Built for compliance, designed for performance.
                            </p>
                        </div>

                        {/* Stats Row */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={mounted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="grid grid-cols-3 gap-6"
                        >
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                                >
                                    <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* CTA Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={mounted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.6 }}
                        >
                            <motion.button
                                onClick={handleDerivLogin}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group relative px-8 py-4 rounded-xl bg-primary text-white font-medium text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Sign in with Deriv
                                    <motion.span
                                        initial={{ x: 0 }}
                                        whileHover={{ x: 5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        →
                                    </motion.span>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </motion.button>
                            <p className="text-xs text-muted-foreground mt-3">
                                Secure OAuth2 authentication • No password required
                            </p>
                        </motion.div>
                    </motion.div>

                    {/* Right Column - Features */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={mounted ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="space-y-4"
                    >
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={mounted ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                                
                                <div className="relative z-10 flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={mounted ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="mt-20 pt-12 border-t border-border"
                >
                    <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-sm">SOC 2 Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            <span className="text-sm">AES-256 Encryption</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            <span className="text-sm">99.9% Uptime SLA</span>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Landing;

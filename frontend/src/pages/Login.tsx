import { ArrowRight, Activity, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { GlassCard } from '../components/ui/GlassCard';
import { motion } from 'framer-motion';

export default function Login() {
    const handleDerivLogin = () => {
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1089';
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=EN&brand=deriv`;
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
            <AuroraBackground />

            <div className="relative z-10 w-full max-w-lg px-4">
                <GlassCard className="border-t-white/20 border-l-white/10 shadow-2xl shadow-primary/20 backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 ring-1 ring-primary/30 shadow-lg shadow-primary/20"
                        >
                            <Activity className="w-8 h-8 text-primary-glow animate-pulse-slow" />
                        </motion.div>

                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary-glow to-accent-glow bg-clip-text text-transparent mb-2 tracking-tight"
                        >
                            TraderMind
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-400 text-lg font-light tracking-wide"
                        >
                            Algorithmic Precision. Quantum Speed.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-6"
                    >
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 flex items-start gap-3">
                            <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <p>
                                Access the global markets through our secure, high-frequency execution engine.
                                <span className="block mt-2 text-xs text-slate-500">Authorized via Deriv OAuth2.0</span>
                            </p>
                        </div>

                        <button
                            onClick={handleDerivLogin}
                            className={cn(
                                "group w-full py-4 px-6 relative overflow-hidden rounded-xl font-bold text-white shadow-lg transition-all duration-300",
                                "bg-gradient-to-r from-primary-600 to-accent-600",
                                "hover:shadow-primary/40 hover:scale-[1.02]",
                                "active:scale-[0.98]"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative flex items-center justify-center gap-2 text-lg">
                                Authenticate with Deriv
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>

                        <div className="flex justify-center gap-6 text-xs text-slate-500">
                            <span>v2.0.0 (Liquid)</span>
                            <span>•</span>
                            <span>Secure Connection</span>
                            <span>•</span>
                            <span>24/7 Active</span>
                        </div>
                    </motion.div>
                </GlassCard>
            </div>
        </div>
    );
}

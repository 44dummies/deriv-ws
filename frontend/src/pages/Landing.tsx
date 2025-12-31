import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Activity, Lock, TrendingUp } from 'lucide-react';

// --- Realtime Ticker Hook ---
const useTicker = () => {
    const [ticks, setTicks] = useState<Record<string, { price: number, change: number }>>({
        "R_10": { price: 0, change: 0 },
        "R_25": { price: 0, change: 0 },
        "R_50": { price: 0, change: 0 },
        "R_75": { price: 0, change: 0 },
        "R_100": { price: 0, change: 0 },
        "1HZ100V": { price: 0, change: 0 }
    });

    const wsParams = useRef<{ ws: WebSocket | null, active: boolean }>({ ws: null, active: false });

    useEffect(() => {
        // Connect to Deriv Public WS
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1089';
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${appId}`);
        wsParams.current.ws = ws;
        wsParams.current.active = true;

        ws.onopen = () => {
            console.log('[Ticker] Connected to Deriv WS');
            // Subscribe to volatility indices for real-time data
            const symbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ100V'];
            symbols.forEach(symbol => {
                ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            });
        };

        ws.onmessage = (msg) => {
            if (!wsParams.current.active) return;
            const data = JSON.parse(msg.data);

            if (data.tick) {
                const symbol = data.tick.symbol;
                const price = data.tick.quote;

                setTicks(prev => {
                    const oldPrice = prev[symbol]?.price || price;
                    // Provide a visual change indicator even for small tick movements if pricing is flat
                    const changePct = oldPrice === 0 ? 0 : ((price - oldPrice) / oldPrice) * 100;

                    return {
                        ...prev,
                        [symbol]: { price, change: changePct }
                    };
                });
            }
        };

        return () => {
            wsParams.current.active = false;
            ws.close();
        };
    }, []);

    return Object.entries(ticks).map(([symbol, data]) => {
        // Format price to variable decimal places based on magnitude
        const formattedPrice = data.price.toFixed(2);
        const sign = data.change >= 0 ? '+' : '';
        // Only show change if it's non-zero, otherwise keep previous color or neutral
        return {
            symbol,
            text: `${symbol}: ${formattedPrice} (${sign}${data.change.toFixed(3)}%)`,
            isUp: data.change >= 0
        };
    });
};

// --- Ticker Component ---
const Ticker = () => {
    const items = useTicker();
    // Duplicate items for seamless loop
    const displayItems = [...items, ...items, ...items];

    return (
        <div className="w-full bg-black/40 border-y border-white/5 overflow-hidden py-3 backdrop-blur-md absolute bottom-0 left-0">
            <div className="flex animate-ticker whitespace-nowrap">
                {displayItems.map((item, i) => (
                    <span key={i} className="mx-8 text-xs font-mono text-gray-400 flex items-center gap-2">
                        {item.isUp ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                        {item.text}
                    </span>
                ))}
            </div>
        </div>
    );
};

const Landing = () => {
    const handleDerivLogin = () => {
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1089';
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=EN&brand=deriv`;
    };

    return (
        <div className="min-h-screen bg-background text-white selection:bg-primary/30 font-sans overflow-hidden flex flex-col relative">

            {/* Background Effects */}
            <div className="fixed inset-0 z-0">
                <img src="/nebula-void.png" alt="Void" className="w-full h-full object-cover opacity-60 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-primary to-accent rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                        T
                    </div>
                    <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TraderMind</span>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="relative z-10 flex-grow flex flex-col items-center justify-center max-w-7xl mx-auto px-6 w-full -mt-20">

                <div className="grid lg:grid-cols-2 gap-16 items-center w-full">

                    {/* Left: Copy & Value Prop */}
                    <div className="space-y-8 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary-glow"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Live Market Data Connected
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
                                The Future of <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-glow to-accent-glow animate-glow">
                                    Algorithmic Intelligence
                                </span>
                            </h1>
                            <p className="text-lg text-gray-400 leading-relaxed border-l-2 border-primary/30 pl-6">
                                Connect your portfolio to an institutional-grade execution engine powered by next-gen AI.
                                Minimize latency. Maximize alpha.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-wrap gap-8 text-sm text-gray-500 font-mono pt-4"
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-white font-bold text-xl counter">12ms</span>
                                <span>Execution Speed</span>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="flex flex-col gap-1">
                                <span className="text-white font-bold text-xl">99.9%</span>
                                <span>Uptime Guarantee</span>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="flex flex-col gap-1">
                                <span className="text-success font-bold text-xl">$4.2M+</span>
                                <span>Volume Processed</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Integrated Login Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="relative"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />

                        <div className="relative glass-panel rounded-2xl p-1 border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
                            <div className="bg-black/40 rounded-xl p-8 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-1">Terminal Access</h3>
                                        <p className="text-xs text-gray-400">Secure Gateway v2.4</p>
                                    </div>
                                    <Activity className="text-primary w-6 h-6 animate-pulse" />
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-4 rounded-lg bg-surface border border-white/5 flex items-center gap-4 group hover:border-primary/30 transition-colors cursor-pointer">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                            <img src="https://deriv.com/favicons/favicon-32x32.png" alt="Deriv" className="w-5 h-5 opacity-80" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-white">Deriv Account</div>
                                            <div className="text-xs text-gray-500">OAuth 2.0 Secure Login</div>
                                        </div>
                                        <div className="w-3 h-3 rounded-full bg-success shadow-[0_0_10px_theme(colors.success.DEFAULT)]" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleDerivLogin}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-accent hover:from-primary-glow hover:to-accent-glow text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                                >
                                    Connect Trading Account
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <div className="mt-6 text-center">
                                    <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                                        <Lock className="w-3 h-3" /> End-to-end encrypted connection
                                    </p>
                                </div>
                            </div>

                            {/* Decorative Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Ticker Tape - Fixed at Bottom */}
            <Ticker />

            {/* Minimal Footer */}
            <footer className="w-full py-6 bg-black text-center text-xs text-gray-800 font-mono border-t border-white/5">
                <span className="opacity-50">SYSTEM STATUS: NOMINAL</span> • TRADERMIND © 2025
            </footer>
        </div>
    );
};

export default Landing;

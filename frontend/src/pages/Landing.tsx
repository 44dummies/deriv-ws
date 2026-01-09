import { ShieldCheck, Lock, Activity } from 'lucide-react';

const Landing = () => {
    const handleDerivLogin = () => {
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1089';
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=EN&brand=deriv`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/tradermind-logo.png" alt="TraderMind" className="w-8 h-8 rounded-md" />
                        <span className="font-semibold text-lg tracking-tight">TraderMind</span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-12">
                <section className="space-y-6">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Trading oversight console</p>
                        <h1 className="text-3xl md:text-4xl font-semibold mt-3">Operational clarity for Deriv sessions</h1>
                        <p className="text-sm text-muted-foreground mt-4 max-w-xl">
                            TraderMind provides real-time monitoring, session controls, and audit-ready reporting for quantitative
                            trading operations. The interface is built for regulated review and partner standards.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <div className="text-sm font-medium">Controls and traceability</div>
                                <div className="text-xs text-muted-foreground">Session state, approvals, and logs are recorded for audit review.</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <div className="text-sm font-medium">Token handling stays server-side</div>
                                <div className="text-xs text-muted-foreground">No client-side storage of Deriv tokens.</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Activity className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <div className="text-sm font-medium">Live market monitoring</div>
                                <div className="text-xs text-muted-foreground">Session metrics and signals update in near real time.</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border border-border rounded-lg bg-card p-6 h-fit">
                    <div className="space-y-3">
                        <div>
                            <div className="text-sm font-medium">Secure access</div>
                            <div className="text-xs text-muted-foreground">Authenticate with your Deriv account to continue.</div>
                        </div>
                        <button
                            onClick={handleDerivLogin}
                            className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-colors duration-150 ease-out hover:bg-primary/90"
                        >
                            Sign in with Deriv
                        </button>
                        <div className="text-xs text-muted-foreground">
                            By continuing, you acknowledge that all trading decisions remain your responsibility.
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Landing;

import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
    // const navigate = useNavigate(); // Not strictly needed unless we redirect manually, but window.location is used for OAuth


    const handleDerivLogin = () => {
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1089'; // Default or env
        // const redirectUrl = window.location.origin + '/auth/callback'; // Callback to our app (implicit in Deriv app settings usually, or passed as param if supported/needed)
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=EN&brand=deriv`;
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f1c] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            TraderMind
                        </h1>
                        <p className="text-gray-400 mt-2">Professional Trading Environment</p>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-sm">
                            Authentication is now exclusively handled via your Deriv account.
                        </div>

                        <button
                            onClick={handleDerivLogin}
                            className={cn(
                                "w-full py-4 px-6 bg-[#ff444f] hover:bg-[#d43e47] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-red-500/20 flex items-center justify-center group text-lg",
                            )}
                        >
                            Log in with Deriv
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

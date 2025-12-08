import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Outlet } from 'react-router-dom';

interface DebugInfo {
    hasUserInfo: boolean;
    derivId: string | null;
    isAdmin: boolean;
    timestamp: string;
    loginid?: string;
    parseError?: string;
}

interface UserInfo {
    is_admin?: boolean;
    loginid?: string;
    deriv_id?: string;
}

/**
 * AdminProtected
 * 
 * Protects admin routes by checking the is_admin flag from session.
 * The is_admin flag is set during login (Callback.js) from Supabase database.
 * 
 * Single source of truth: Supabase user_profiles.is_admin
 */
const AdminProtected: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    const [checking, setChecking] = useState<boolean>(true);
    const [debugInfo, setDebugInfo] = useState<DebugInfo>({
        hasUserInfo: false,
        derivId: null,
        isAdmin: false,
        timestamp: ''
    });

    useEffect(() => {
        const checkAuth = (): void => {
            const userInfoStr = sessionStorage.getItem('userInfo');
            const derivId = sessionStorage.getItem('derivId');

            // Collect debug info
            const debug: DebugInfo = {
                hasUserInfo: !!userInfoStr,
                derivId: derivId,
                isAdmin: false,
                timestamp: new Date().toISOString()
            };

            // Single check: is_admin from session (set during Callback from Supabase)
            if (userInfoStr) {
                try {
                    const parsed: UserInfo = JSON.parse(userInfoStr);
                    debug.isAdmin = parsed.is_admin || false;
                    debug.loginid = parsed.loginid || parsed.deriv_id;

                    if (parsed.is_admin === true) {
                        setIsAuthorized(true);
                        setChecking(false);
                        return;
                    }
                } catch (e) {
                    debug.parseError = (e as Error).message;
                }
            }

            setDebugInfo(debug);
            setChecking(false);
        };

        checkAuth();
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-white flex items-center gap-3">
                    <Shield className="w-6 h-6 animate-pulse text-blue-500" />
                    <span className="text-lg">Verifying admin privileges...</span>
                </div>
            </div>
        );
    }

    if (isAuthorized) {
        return <Outlet />;
    }

    // Access Denied Screen
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-red-900/10 via-purple-900/5 to-transparent pointer-events-none"></div>

            <div className="relative z-10 max-w-md w-full mx-auto">
                <div className="p-8 rounded-2xl bg-[#14141a] border border-red-500/20 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
                            <Lock className="w-8 h-8 text-red-500" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-center text-white mb-2">
                        Access Restricted
                    </h1>
                    <p className="text-gray-400 text-center mb-6">
                        This area is restricted to administrators only.
                    </p>

                    <div className="space-y-4">
                        <a
                            href="/"
                            className="block w-full py-3 text-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Return to Login
                        </a>

                        <a
                            href="/user/dashboard"
                            className="block w-full py-3 text-center rounded-xl bg-[#1e1e24] border border-white/5 text-gray-300 font-medium hover:bg-[#25252b] transition-all"
                        >
                            Go to User Dashboard
                        </a>
                    </div>

                    {/* Debug Info */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
                            <AlertTriangle className="w-3 h-3" />
                            System Diagnosis
                        </div>
                        <div className="p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-gray-400 overflow-x-auto">
                            <p>Deriv ID: <span className="text-white">{debugInfo.derivId || 'Null'}</span></p>
                            <p>Is Admin: <span className={debugInfo.isAdmin ? "text-green-400" : "text-red-400"}>{String(debugInfo.isAdmin)}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProtected;

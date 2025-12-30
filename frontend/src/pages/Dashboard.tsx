import { useAuthStore } from '../stores/useAuthStore';
import { SessionList } from '../components/sessions/SessionList';
import { LayoutDashboard, LogOut } from 'lucide-react';

export default function Dashboard() {
    const { user, signOut } = useAuthStore();

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-6 w-6 text-blue-500" />
                        <span className="font-bold text-lg">TraderMind</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">{user?.email}</span>
                        <button
                            onClick={() => signOut()}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Active Sessions
                    </h1>
                    <p className="text-gray-400 mt-1">Join a session to start trading</p>
                </div>

                <SessionList />
            </main>
        </div>
    );
}

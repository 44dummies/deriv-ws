import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { SessionList } from '../components/sessions/SessionList';
import { CreateSessionModal } from '../components/admin/CreateSessionModal';
import { useUpdateSessionStatus } from '../hooks/useSessions';
import { LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { SessionStatus } from '../types/session';

export default function AdminDashboard() {
    const { user, signOut } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { mutate: updateStatus } = useUpdateSessionStatus();

    const handleAction = (sessionId: string, action: 'resume' | 'pause' | 'stop') => {
        let status: SessionStatus;
        switch (action) {
            case 'resume': status = 'ACTIVE'; break;
            case 'pause': status = 'PAUSED'; break;
            case 'stop': status = 'TERMINATED'; break;
        }
        updateStatus({ id: sessionId, status });
    };

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="h-6 w-6 text-red-500" />
                        <span className="font-bold text-lg">TraderMind Admin</span>
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Session Management
                        </h1>
                        <p className="text-gray-400 mt-1">Control trading sessions and monitor activity</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        New Session
                    </button>
                </div>

                <SessionList isAdmin onAction={handleAction} />
            </main>

            {isModalOpen && <CreateSessionModal onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

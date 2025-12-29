import { useState } from 'react';
import { useCreateSession } from '../../hooks/useSessions';
import { Loader2, X } from 'lucide-react';

interface CreateSessionModalProps {
    onClose: () => void;
}

export function CreateSessionModal({ onClose }: CreateSessionModalProps) {
    const { mutate: createSession, isPending } = useCreateSession();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createSession(undefined, {
            onSuccess: () => {
                onClose();
            },
            onError: (err) => {
                setError(err.message || 'Failed to create session');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-4">Create New Session</h2>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
                        {error}
                    </div>
                )}

                <p className="text-gray-400 mb-6">
                    This will initialize a new trading session. Participants can join immediately once created.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create Session
                    </button>
                </div>
            </div>
        </div>
    );
}

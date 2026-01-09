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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border border-border p-6 rounded-lg w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg font-semibold mb-4">Create new session</h2>

                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm mb-4">
                        {error}
                    </div>
                )}

                <p className="text-sm text-muted-foreground mb-6">
                    This creates a new session. Participants can join once it is active.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create session
                    </button>
                </div>
            </div>
        </div>
    );
}

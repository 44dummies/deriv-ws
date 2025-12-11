import React from 'react';

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 max-w-md w-full">
                <h2 className="text-xl font-bold text-white mb-4">Create Session</h2>
                <p className="text-slate-400 mb-6">Session creation is handled in the Sessions page.</p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

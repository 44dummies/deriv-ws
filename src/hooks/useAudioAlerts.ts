/**
 * useAudioAlerts Hook
 * Manages audio notifications for trading events
 */

import { useCallback, useRef, useEffect } from 'react';
import { AlertType } from '../types/session';

const AUDIO_FILES: Record<string, string> = {
    profit: '/sounds/success.mp3',
    loss: '/sounds/error.mp3',
    tp_hit: '/sounds/achievement.mp3',
    sl_hit: '/sounds/warning.mp3',
    info: '/sounds/notification.mp3',
    warning: '/sounds/warning.mp3',
    error: '/sounds/error.mp3',
    success: '/sounds/success.mp3'
};

interface UseAudioAlertsReturn {
    playAlert: (type: AlertType) => void;
    setMuted: (muted: boolean) => void;
    isMuted: boolean;
}

export function useAudioAlerts(): UseAudioAlertsReturn {
    const audioContextRef = useRef<AudioContext | null>(null);
    const mutedRef = useRef(false);

    // Initialize AudioContext on first user interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
        };

        document.addEventListener('click', initAudio, { once: true });
        return () => document.removeEventListener('click', initAudio);
    }, []);

    const playAlert = useCallback((type: AlertType) => {
        if (mutedRef.current) return;

        // Generate synthetic beep using Web Audio API
        try {
            const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Different sounds for different alert types
            switch (type) {
                case 'profit':
                case 'success':
                case 'tp_hit':
                    oscillator.frequency.value = 800; // Higher pitch for success
                    gainNode.gain.value = 0.3;
                    break;
                case 'loss':
                case 'error':
                case 'sl_hit':
                    oscillator.frequency.value = 300; // Lower pitch for failure
                    gainNode.gain.value = 0.4;
                    break;
                case 'warning':
                    oscillator.frequency.value = 500;
                    gainNode.gain.value = 0.35;
                    break;
                default:
                    oscillator.frequency.value = 600;
                    gainNode.gain.value = 0.25;
            }

            oscillator.type = 'sine';

            // Quick beep
            const now = ctx.currentTime;
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } catch (err) {
            console.warn('Audio playback failed:', err);
        }
    }, []);

    const setMuted = useCallback((muted: boolean) => {
        mutedRef.current = muted;
    }, []);

    return {
        playAlert,
        setMuted,
        isMuted: mutedRef.current
    };
}

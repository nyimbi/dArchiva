import { useEffect, useState, useCallback } from 'react';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface ScanningControls {
    isListening: boolean;
    lastCommand: string | null;
    toggleVoice: () => void;
}

interface ScanningHandlers {
    onScan: () => void;
    onNext: () => void;
    onStop: () => void;
    onRetake: () => void;
}

export function useScanningControls({ onScan, onNext, onStop, onRetake }: ScanningHandlers): ScanningControls {
    const [isListening, setIsListening] = useState(false);
    const [lastCommand, setLastCommand] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onresult = (event: any) => {
                const lastResult = event.results[event.results.length - 1];
                const command = lastResult[0].transcript.trim().toLowerCase();
                setLastCommand(command);

                console.log('Voice Command:', command);

                if (command.includes('scan') || command.includes('capture')) {
                    onScan();
                } else if (command.includes('next') || command.includes('finish')) {
                    onNext();
                } else if (command.includes('stop') || command.includes('pause')) {
                    onStop();
                } else if (command.includes('retake') || command.includes('delete')) {
                    onRetake();
                }
            };

            rec.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            setRecognition(rec);
        }
    }, [onScan, onNext, onStop, onRetake]);

    const toggleVoice = useCallback(() => {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    }, [isListening, recognition]);

    // Keyboard Shortcuts (Foot Pedal Support)
    // Foot pedals usually map to keys like Space, Enter, F-keys.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key) {
                case ' ': // Space -> Scan
                case 'F1':
                    e.preventDefault();
                    onScan();
                    setLastCommand('Keyboard: Scan');
                    break;
                case 'Enter': // Enter -> Next/Finish
                case 'F2':
                    e.preventDefault();
                    onNext();
                    setLastCommand('Keyboard: Next');
                    break;
                case 'Backspace': // Backspace -> Retake
                case 'Delete':
                    onRetake();
                    setLastCommand('Keyboard: Retake');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onScan, onNext, onRetake]);

    return {
        isListening,
        lastCommand,
        toggleVoice
    };
}

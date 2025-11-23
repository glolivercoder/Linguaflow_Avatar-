import { useEffect, useRef, useState } from 'react';
import { applyVisemeToSvg } from '../utils/visemeHelper';

interface AvatarProps {
    text: string;
    onSpeakingComplete?: () => void;
    onClick?: () => void;
    isRecording?: boolean;
}

export const Avatar = ({ text, onSpeakingComplete, onClick, isRecording = false }: AvatarProps) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Function to simulate lip movement
    const animateMouth = () => {
        if (svgRef.current) {
            // Generate a random viseme ID between 0 and 20
            // We favor open mouth visemes (like 1, 2, 9, 11) slightly more often for realism
            // 0 is silence (closed mouth)
            const randomViseme = Math.floor(Math.random() * 21);
            applyVisemeToSvg(svgRef.current, randomViseme);
        }

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(animateMouth);
    };

    const stopAnimation = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        // Ensure mouth is closed when stopped
        if (svgRef.current) {
            applyVisemeToSvg(svgRef.current, 0);
        }
    };

    useEffect(() => {
        if (!text || text.trim() === '') return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Optional: Select a voice (English default for now)
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setError(null);
            console.log('Browser TTS started');
            // Start lip sync simulation
            animateMouth();
        };

        utterance.onend = () => {
            console.log('Browser TTS completed');
            setIsSpeaking(false);
            stopAnimation();
            onSpeakingComplete?.();
        };

        utterance.onerror = (event) => {
            console.error('Browser TTS error:', event);
            setError('TTS Error occurred');
            setIsSpeaking(false);
            stopAnimation();
        };

        window.speechSynthesis.speak(utterance);

        // Cleanup function
        return () => {
            window.speechSynthesis.cancel();
            stopAnimation();
        };
    }, [text, onSpeakingComplete]);

    return (
        <div
            className="avatar-container relative inline-block"
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {error && (
                <div className="avatar-error" style={{ color: 'red', marginBottom: '10px' }}>
                    Error: {error}
                </div>
            )}
            <object
                ref={(el) => {
                    if (el) {
                        const svgDoc = el.contentDocument;
                        if (svgDoc) {
                            svgRef.current = svgDoc.querySelector('svg');
                        }
                    }
                }}
                data="/avatars/avatar.svg"
                type="image/svg+xml"
                width="200"
                height="200"
                style={{ border: '1px solid #ccc', borderRadius: '8px' }}
            >
                {/* Fallback for browsers that don't support object */}
                <img src="/avatars/avatar.svg" alt="Avatar" width="200" height="200" />
            </object>

            {/* Status Indicator */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isRecording ? 'red' : 'green',
                    border: '2px solid white',
                    boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                    animation: isRecording ? 'blink 1s infinite' : 'none',
                    zIndex: 10
                }}
            />
            <style>{`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.4; }
                    100% { opacity: 1; }
                }
            `}</style>

            {isSpeaking && <div className="avatar-status" style={{ marginTop: '5px', textAlign: 'center', fontWeight: 'bold' }}>Speaking...</div>}
        </div>
    );
};

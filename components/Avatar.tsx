import { useEffect, useRef, useState } from 'react';
import { applyVisemeToSvg } from '../utils/visemeHelper';
import { generateLipSyncVideo, base64ToVideoUrl, checkWav2LipHealth, generateTTSAudio } from '../services/wav2lipService';

interface AvatarProps {
    text: string;
    onSpeakingComplete?: () => void;
    onClick?: () => void;
    isRecording?: boolean;
    avatarImage?: string;  // Base64 image for Wav2Lip (optional)
    useWav2Lip?: boolean;  // Enable Wav2Lip video mode (default: false)
}

export const Avatar = ({ text, onSpeakingComplete, onClick, isRecording = false, avatarImage, useWav2Lip = false }: AvatarProps) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isWav2LipReady, setIsWav2LipReady] = useState(false);
    const animationFrameRef = useRef<number | null>(null);

    // Check Wav2Lip availability on mount
    useEffect(() => {
        if (useWav2Lip) {
            checkWav2LipHealth().then(health => {
                const ready = health?.service_ready || health?.all_models_ready || false;
                setIsWav2LipReady(ready);
                if (!ready) {
                    console.warn('[Avatar] Wav2Lip not ready, falling back to SVG mode');
                }
            });
        }
    }, [useWav2Lip]);

    // Function to simulate lip movement (SVG Fallback)
    const animateMouth = () => {
        if (svgRef.current) {
            const randomViseme = Math.floor(Math.random() * 21);
            applyVisemeToSvg(svgRef.current, randomViseme);
        }
        animationFrameRef.current = requestAnimationFrame(animateMouth);
    };

    const stopAnimation = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (svgRef.current) {
            applyVisemeToSvg(svgRef.current, 0);
        }
    };

    useEffect(() => {
        if (!text || text.trim() === '') return;

        const processWithWav2Lip = async () => {
            if (!useWav2Lip || !isWav2LipReady || !avatarImage) {
                processWithSVGMode();
                return;
            }

            try {
                setIsSpeaking(true);
                setError(null);
                console.log('[Avatar] Generating Wav2Lip video...');

                // 1. Generate Audio using Piper TTS (Pronunciation Service)
                const audioBlob = await generateTTSAudio(text);

                if (!audioBlob) {
                    console.warn('[Avatar] TTS failed, falling back to SVG');
                    processWithSVGMode();
                    return;
                }

                // 2. Generate Lip-Sync Video
                // Strip data URL prefix if present (e.g., "data:image/png;base64,")
                const cleanAvatarImage = avatarImage.includes(',')
                    ? avatarImage.split(',')[1]
                    : avatarImage;

                const videoBase64 = await generateLipSyncVideo(cleanAvatarImage, audioBlob, 'gan'); // Use GAN by default

                if (!videoBase64) {
                    console.warn('[Avatar] Wav2Lip failed, falling back to SVG');
                    processWithSVGMode();
                    return;
                }

                // 3. Play Video
                const url = base64ToVideoUrl(videoBase64);
                setVideoUrl(url);

                if (videoRef.current) {
                    videoRef.current.src = url;
                    videoRef.current.onended = () => {
                        setIsSpeaking(false);
                        onSpeakingComplete?.();
                        URL.revokeObjectURL(url);
                        setVideoUrl(null);
                    };

                    // Handle play promise
                    const playPromise = videoRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('[Avatar] Video play error:', error);
                            setIsSpeaking(false);
                            onSpeakingComplete?.();
                        });
                    }
                }
            } catch (error) {
                console.error('[Avatar] Wav2Lip error:', error);
                setError('Wav2Lip failed');
                processWithSVGMode();
            }
        };

        const processWithSVGMode = () => {
            // Cancel any current speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Select voice
            const voices = window.speechSynthesis.getVoices();
            const enVoice = voices.find(v => v.lang.startsWith('en'));
            if (enVoice) utterance.voice = enVoice;

            utterance.onstart = () => {
                setIsSpeaking(true);
                setError(null);
                animateMouth();
            };

            utterance.onend = () => {
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
        };

        // Choose mode
        if (useWav2Lip && isWav2LipReady && avatarImage) {
            processWithWav2Lip();
        } else {
            processWithSVGMode();
        }

        // Cleanup function
        return () => {
            window.speechSynthesis.cancel();
            stopAnimation();
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [text, onSpeakingComplete, useWav2Lip, isWav2LipReady, avatarImage]);

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

            {/* Video Player (Wav2Lip) */}
            {videoUrl && (
                <video
                    ref={videoRef}
                    width="200"
                    height="200"
                    style={{
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        display: 'block'
                    }}
                />
            )}

            {/* SVG Avatar (Fallback) - Only show if no video */}
            {!videoUrl && (
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
                    <img src="/avatars/avatar.svg" alt="Avatar" width="200" height="200" />
                </object>
            )}

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

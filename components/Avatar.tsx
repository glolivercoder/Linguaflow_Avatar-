import { useEffect, useRef, useState } from 'react';
import { applyVisemeToSvg } from '../utils/visemeHelper';
import { generateLipSyncVideo, base64ToVideoUrl, checkWav2LipHealth, generateTTSAudio, generateWithKittenTTS } from '../services/wav2lipService';

interface AvatarProps {
    text: string;
    onSpeakingComplete?: () => void;
    onClick?: () => void;
    isRecording?: boolean;
    avatarImage?: string;  // Base64 image for Wav2Lip (optional)
    useWav2Lip?: boolean;  // Enable Wav2Lip video mode (default: false)
    audioBase64?: string | null; // Audio from backend (optional)
    useKittenTTS?: boolean;  // Use Kitten-TTS instead of Piper TTS (default: false)
}

export const Avatar = ({ text, onSpeakingComplete, onClick, isRecording = false, avatarImage, useWav2Lip = false, audioBase64, useKittenTTS = false }: AvatarProps) => {
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

    // Handle video playback when videoUrl is set (after React renders the video element)
    useEffect(() => {
        if (videoUrl && videoRef.current) {
            console.log('[Avatar] Video element rendered, setting src and playing...');
            videoRef.current.src = videoUrl;

            videoRef.current.onended = () => {
                console.log('[Avatar] Video ended');
                setIsSpeaking(false);
                onSpeakingComplete?.();
                URL.revokeObjectURL(videoUrl);
                setVideoUrl(null);
            };

            // Play video
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('[Avatar] Video playing successfully!');
                    })
                    .catch(error => {
                        console.error('[Avatar] Video play error:', error);
                        setIsSpeaking(false);
                        onSpeakingComplete?.();
                    });
            }
        }
    }, [videoUrl, onSpeakingComplete]);

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

        console.log('[Avatar] Processing text:', {
            text: text.substring(0, 50),
            useWav2Lip,
            isWav2LipReady,
            hasAvatarImage: !!avatarImage,
            hasAudioBase64: !!audioBase64,
            useKittenTTS
        });

        const processWithWav2Lip = async () => {
            if (!useWav2Lip || !isWav2LipReady || !avatarImage) {
                console.log('[Avatar] Falling back to Audio-only mode:', {
                    useWav2Lip,
                    isWav2LipReady,
                    hasAvatarImage: !!avatarImage
                });
                processWithAudioOnly();
                return;
            }

            try {
                setIsSpeaking(true);
                setError(null);
                console.log('[Avatar] Generating Wav2Lip video...');

                let audioBlob: Blob | null = null;

                // 1. Get Audio (either from prop or generate TTS)
                if (audioBase64) {
                    console.log('[Avatar] Using provided audioBase64');
                    try {
                        // Convert base64 to Blob
                        const byteCharacters = atob(audioBase64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        audioBlob = new Blob([byteArray], { type: 'audio/wav' });
                    } catch (e) {
                        console.error('[Avatar] Error converting audioBase64 to Blob:', e);
                    }
                }

                if (!audioBlob) {
                    // Use Kitten-TTS by default if enabled
                    if (useKittenTTS) {
                        console.log('[Avatar] Generating TTS audio (Kitten-TTS)...');
                        audioBlob = await generateWithKittenTTS(text);

                        // Fallback to Piper if Kitten-TTS fails
                        if (!audioBlob) {
                            console.warn('[Avatar] Kitten-TTS failed, trying Piper TTS...');
                            audioBlob = await generateTTSAudio(text);
                        }
                    } else {
                        console.log('[Avatar] Generating TTS audio (Piper)...');
                        audioBlob = await generateTTSAudio(text);
                    }
                }

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

                // 3. Set Video URL (React will render the video element)
                const url = base64ToVideoUrl(videoBase64);
                console.log('[Avatar] Video blob URL created:', url);
                console.log('[Avatar] Video data length:', videoBase64.length, 'chars');
                setVideoUrl(url);
                console.log('[Avatar] Video URL state updated, waiting for render...');
            } catch (error) {
                console.error('[Avatar] Wav2Lip error:', error);
                setError('Wav2Lip failed');
                processWithSVGMode();
            }
        };

        // NEW: Process with audio-only (no video) - uses Kitten/Piper TTS
        const processWithAudioOnly = async () => {
            try {
                setIsSpeaking(true);
                setError(null);
                console.log('[Avatar] Processing with audio-only mode...');

                let audioBlob: Blob | null = null;

                // Try to generate audio with Kitten-TTS or Piper
                if (useKittenTTS) {
                    console.log('[Avatar] Generating audio with Kitten-TTS...');
                    audioBlob = await generateWithKittenTTS(text);

                    if (!audioBlob) {
                        console.warn('[Avatar] Kitten-TTS failed, trying Piper TTS...');
                        audioBlob = await generateTTSAudio(text);
                    }
                } else {
                    console.log('[Avatar] Generating audio with Piper TTS...');
                    audioBlob = await generateTTSAudio(text);
                }

                if (audioBlob) {
                    // Play the generated audio
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);

                    // Animate mouth while audio plays
                    audio.onplay = () => {
                        console.log('[Avatar] Audio playing, animating mouth...');
                        animateMouth();
                    };

                    audio.onended = () => {
                        console.log('[Avatar] Audio ended');
                        setIsSpeaking(false);
                        stopAnimation();
                        URL.revokeObjectURL(audioUrl);
                        onSpeakingComplete?.();
                    };

                    audio.onerror = (error) => {
                        console.error('[Avatar] Audio playback error:', error);
                        setError('Audio playback failed');
                        setIsSpeaking(false);
                        stopAnimation();
                        // Last resort: use browser TTS
                        processWithSVGMode();
                    };

                    audio.play().catch(error => {
                        console.error('[Avatar] Failed to play audio:', error);
                        // Last resort: use browser TTS
                        processWithSVGMode();
                    });
                } else {
                    // If audio generation failed, fall back to browser TTS
                    console.warn('[Avatar] Audio generation failed, using browser TTS');
                    processWithSVGMode();
                }
            } catch (error) {
                console.error('[Avatar] Audio-only mode error:', error);
                setError('Audio generation failed');
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

        // Choose mode: Always try Wav2Lip first if available, otherwise use audio-only mode
        if (useWav2Lip && isWav2LipReady && avatarImage) {
            processWithWav2Lip();
        } else {
            // Use audio-only mode (tries Kitten/Piper TTS before browser TTS)
            processWithAudioOnly();
        }

        // Cleanup function
        return () => {
            window.speechSynthesis.cancel();
            stopAnimation();
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [text, onSpeakingComplete, useWav2Lip, isWav2LipReady, avatarImage, audioBase64]);

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

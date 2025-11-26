import config from '../config/tts_config.json';

interface TTSResponse {
    audio: Blob;
    sampleRate: number;
    duration: number;
}

/**
 * Serviço unificado de TTS que suporta múltiplos provedores
 */
class UnifiedTTSService {
    private static instance: UnifiedTTSService;
    private currentProvider: string;

    private constructor() {
        this.currentProvider = config.tts_provider;
    }

    public static getInstance(): UnifiedTTSService {
        if (!UnifiedTTSService.instance) {
            UnifiedTTSService.instance = new UnifiedTTSService();
        }
        return UnifiedTTSService.instance;
    }

    /**
     * Gera áudio a partir de texto usando o provedor configurado
     */
    public async generateSpeech(
        text: string,
        options: {
            voice?: string;
            speed?: number;
            provider?: 'kitten-tts' | 'piper';
        } = {}
    ): Promise<TTSResponse> {
        const provider = options.provider || this.currentProvider;
        
        try {
            switch (provider) {
                case 'kitten-tts':
                    return await this.generateWithKittenTTS(text, options);
                case 'piper':
                    return await this.generateWithPiper(text, options);
                default:
                    throw new Error(`Provedor TTS não suportado: ${provider}`);
            }
        } catch (error) {
            console.error(`[TTS] Erro ao gerar fala com ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Alterna entre os provedores disponíveis
     */
    public toggleProvider(): string {
        this.currentProvider = this.currentProvider === 'kitten-tts' ? 'piper' : 'kitten-tts';
        console.log(`[TTS] Provedor alterado para: ${this.currentProvider}`);
        return this.currentProvider;
    }

    /**
     * Obtém o provedor atualmente ativo
     */
    public getCurrentProvider(): string {
        return this.currentProvider;
    }

    /**
     * Gera áudio usando o Kitten-TTS
     */
    private async generateWithKittenTTS(
        text: string,
        options: {
            voice?: string;
            speed?: number;
        } = {}
    ): Promise<TTSResponse> {
        if (!config.kitten_tts.enabled) {
            throw new Error('Kitten-TTS está desabilitado nas configurações');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.kitten_tts.timeout_ms);

        try {
            const endpoint = config.kitten_tts.openai_compatible 
                ? '/v1/audio/speech' 
                : config.kitten_tts.endpoint;

            const requestBody = config.kitten_tts.openai_compatible
                ? {
                    model: 'kitten-tts',
                    input: text,
                    voice: options.voice || config.kitten_tts.default_voice,
                    speed: options.speed || config.kitten_tts.default_speed,
                    response_format: config.audio.format
                }
                : {
                    text,
                    voice: options.voice || config.kitten_tts.default_voice,
                    speed: options.speed || config.kitten_tts.default_speed,
                    output_format: config.audio.format
                };

            const response = await fetch(`${config.kitten_tts.api_url}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Erro na API Kitten-TTS: ${response.statusText}`);
            }

            const audioBlob = await response.blob();
            
            // Criar URL temporária para o áudio
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Obter duração do áudio
            const duration = await this.getAudioDuration(audioUrl);
            
            return {
                audio: audioBlob,
                sampleRate: config.audio.target_sample_rate,
                duration
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Gera áudio usando o Piper TTS
     */
    private async generateWithPiper(
        text: string,
        options: {
            voice?: string;
            speed?: number;
        } = {}
    ): Promise<TTSResponse> {
        if (!config.piper.enabled) {
            throw new Error('Piper TTS está desabilitado nas configurações');
        }

        // Implementação do Piper TTS aqui
        // Esta é uma implementação simplificada - ajuste conforme necessário
        const response = await fetch('/api/piper/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model: config.piper.model_path,
                config: config.piper.config_path,
                output_format: config.audio.format,
                speed: options.speed || 1.0
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na API Piper TTS: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = await this.getAudioDuration(audioUrl);

        return {
            audio: audioBlob,
            sampleRate: config.audio.target_sample_rate,
            duration
        };
    }

    /**
     * Obtém a duração de um arquivo de áudio
     */
    private getAudioDuration(audioUrl: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(audioUrl);
                resolve(audio.duration * 1000); // Retorna em milissegundos
            };
            audio.onerror = () => reject(new Error('Erro ao carregar áudio'));
            audio.src = audioUrl;
        });
    }
}

export const ttsService = UnifiedTTSService.getInstance();

// Hook para React
import { useState, useEffect, useCallback } from 'react';

export const useTTS = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [currentProvider, setCurrentProvider] = useState(ttsService.getCurrentProvider());

    const generateSpeech = useCallback(async (text: string, options = {}) => {
        if (!text) return null;
        
        setIsLoading(true);
        setError(null);
        
        try {
            return await ttsService.generateSpeech(text, options);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const toggleProvider = useCallback(() => {
        const newProvider = ttsService.toggleProvider();
        setCurrentProvider(newProvider);
        return newProvider;
    }, []);

    return {
        generateSpeech,
        toggleProvider,
        currentProvider,
        isLoading,
        error,
        providers: {
            'kitten-tts': config.kitten_tts.enabled,
            'piper': config.piper.enabled
        }
    };
};

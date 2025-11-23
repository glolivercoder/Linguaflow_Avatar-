


import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
// FIX: Import the 'decode' function to handle audio data from the server.
import { encode, decodeAudioData, decode } from '../services/geminiService';
import { chatWithAudio, encodeInt16ToWavBase64, mergeInt16Chunks } from '../services/voskService';
import { Settings, Flashcard, LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, VOICE_CONFIG } from '../constants';
import * as Icons from './icons';
// getPhonetics removido para desabilitar transcrição fonética
import { translateText, getPronunciationCorrection, getGroundedAnswer, getPhonetics } from '../services/geminiService';
import { playAudio } from '../services/ttsService';
import { analyzePronunciation } from '../services/pronunciationService';
import { PROXY_WS_URL } from '../services/proxyClient';
import {
    CATEGORY_DEFINITIONS,
    CATEGORY_KEYS,
    BASE_CATEGORY_LANGUAGE_NAME,
    type CategoryKey,
    type CategoryDefinition,
    type CategorySection,
    type QASection,
    type PhraseSection,
    type TranslatedCategories,
    type QAItem,
} from '../data/conversationCategories';
import { getCategoryTranslations, saveCategoryTranslations, getCategoryPhonetic, saveCategoryPhonetic } from '../services/db';
import * as conversaCache from '../services/conversaCacheService';


const float32ToInt16 = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
        const value = Math.max(-1, Math.min(1, input[i] || 0));
        output[i] = value < 0 ? value * 32768 : value * 32767;
    }
    return output;
};

const isAudioSilent = (samples: Int16Array, threshold = 0.002): boolean => {
    if (samples.length === 0) {
        return true;
    }
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i += 1) {
        const normalized = samples[i] / 32768;
        sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    return rms < threshold;
};

const LANGUAGE_FLAG_MAP: Record<LanguageCode, string> = {
    'pt-BR': '🇧🇷',
    'en-US': '🇺🇸',
    'es-ES': '🇪🇸',
    'zh-CN': '🇨🇳',
    'ja-JP': '🇯🇵',
    'ru-RU': '🇷🇺',
    'fr-FR': '🇫🇷',
    'it-IT': '🇮🇹',
    'eo': '🏳️',
};

const getFlagEmoji = (code: LanguageCode): string => LANGUAGE_FLAG_MAP[code] ?? '🌐';

const getLanguageDisplayName = (code: LanguageCode): string =>
    SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code;

const VOSK_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-US-graph', label: 'English (US) – Graph' },
];

const cloneCategoryDefinitions = (source: Record<CategoryKey, CategoryDefinition>): TranslatedCategories => {
    const clone: Partial<TranslatedCategories> = {};
    CATEGORY_KEYS.forEach((key) => {
        const definition = source[key];
        clone[key] = {
            ...definition,
            sections: definition.sections.map((section) =>
                section.type === 'qa'
                    ? {
                        ...section,
                        items: section.items.map((item) => ({ ...item })),
                    }
                    : {
                        ...section,
                        items: [...section.items],
                    }
            ),
        };
    });
    return clone as TranslatedCategories;
};

interface ConversationViewProps {
    settings: Settings;
    addFlashcard: (card: Omit<Flashcard, 'id'>) => void;
    isAutoPreprocessing?: boolean;
    autoPreprocessStatus?: string;
    autoPreprocessProgress?: number;
}

const ConversationView: React.FC<ConversationViewProps> = ({ settings, addFlashcard, isAutoPreprocessing, autoPreprocessStatus, autoPreprocessProgress }) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [status, setStatus] = useState('Pronto para começar');
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    const [lastTurn, setLastTurn] = useState<{ user: string; model: string } | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedCategoryKey, setSelectedCategoryKey] = useState<CategoryKey | null>(null);
    const [categoryPanelVisible, setCategoryPanelVisible] = useState(false);
    const [useTranslatedCategories, setUseTranslatedCategories] = useState(() => settings.learningLanguage !== 'pt-BR');
    const [translatedCategories, setTranslatedCategories] = useState<TranslatedCategories>(() => cloneCategoryDefinitions(CATEGORY_DEFINITIONS));
    const [isTranslatingCategories, setIsTranslatingCategories] = useState(false);
    const [sessionMode, setSessionMode] = useState<'gemini' | 'vosk' | null>(null);
    const [voskLanguage, setVoskLanguage] = useState<string>('pt-BR');
    const [autoPrepStatus, setAutoPrepStatus] = useState<string | null>(null);
    const [isMicTransientActive, setIsMicTransientActive] = useState(false);

    useEffect(() => {
        if (isAutoPreprocessing && autoPreprocessStatus) {
            const suffix = autoPreprocessProgress ? ` • ${autoPreprocessProgress}%` : '';
            setAutoPrepStatus(`${autoPreprocessStatus}${suffix}`);
        } else {
            setAutoPrepStatus(null);
        }
    }, [isAutoPreprocessing, autoPreprocessStatus, autoPreprocessProgress]);


    const socketRef = useRef<WebSocket | null>(null);
    // FIX: Initialize useRef with null to prevent TypeScript errors.
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    // FIX: Initialize useRef with null to prevent TypeScript errors.
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    // FIX: Initialize useRef with null to prevent TypeScript errors.
    const mediaStreamRef = useRef<MediaStream | null>(null);
    // FIX: Initialize useRef with null to prevent TypeScript errors.
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const translationCacheRef = useRef<Record<string, string>>({});
    const phoneticsCacheRef = useRef<Record<string, string>>({});
    const qaCompletedRef = useRef<Record<string, boolean>>({});
    const [qaCompleted, setQaCompleted] = useState<Record<string, boolean>>({});
    const qaItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
    const translatedByLangRef = useRef<Record<LanguageCode, TranslatedCategories>>({});
    const userTranscriptRef = useRef('');
    const modelTranscriptRef = useRef('');
    const audioChunksRef = useRef<Int16Array[]>([]);
    const sessionModeRef = useRef<'gemini' | 'vosk' | null>(null);

    const [isProcessingVosk, setIsProcessingVosk] = useState(false);

    useEffect(() => {
        translatedByLangRef.current['pt-BR'] = cloneCategoryDefinitions(CATEGORY_DEFINITIONS);
    }, []);

    const learningLanguageName = useMemo(
        () => SUPPORTED_LANGUAGES.find((l) => l.code === settings.learningLanguage)?.name || settings.learningLanguage,
        [settings.learningLanguage]
    );

    const nativeLangName = useMemo(
        () => SUPPORTED_LANGUAGES.find((l) => l.code === settings.nativeLanguage)?.name || settings.nativeLanguage,
        [settings.nativeLanguage]
    );

    const selectedVoskLanguageOption = useMemo(
        () => VOSK_LANGUAGE_OPTIONS.find((option) => option.value === voskLanguage),
        [voskLanguage]
    );

    const rememberTranslations = useCallback(
        (language: LanguageCode, categories: TranslatedCategories) => {
            const cloned = cloneCategoryDefinitions(categories);
            translatedByLangRef.current[language] = cloned;
            setTranslatedCategories(cloned);
        },
        []
    );

    const ensureCategoryTranslations = useCallback(
        async (targetLangCode: LanguageCode, targetLangName: string) => {
            if (targetLangCode === 'pt-BR') {
                rememberTranslations('pt-BR', CATEGORY_DEFINITIONS);
                setIsTranslatingCategories(false);
                return;
            }
            const existing = translatedByLangRef.current[targetLangCode];
            const needsFix = (existingCats?: TranslatedCategories): boolean => {
                if (!existingCats) return true;
                for (const key of CATEGORY_KEYS) {
                    const base = CATEGORY_DEFINITIONS[key];
                    const enCat = existingCats[key];
                    if (!enCat) return true;
                    if (enCat.sections.length !== base.sections.length) return true;
                    for (let i = 0; i < base.sections.length; i++) {
                        const s = base.sections[i];
                        const es = enCat.sections[i];
                        if (!es) return true;
                        if (s.type === 'phrases') {
                            const srcItems = s.items as string[];
                            const enItems = es.items as string[];
                            if (enItems.length !== srcItems.length) return true;
                            for (let j = 0; j < srcItems.length; j++) {
                                const pt = (srcItems[j] || '').trim();
                                const en = (enItems[j] || '').trim();
                                if (!en || en.toLowerCase() === pt.toLowerCase()) return true;
                            }
                        } else {
                            const srcItems = s.items as QAItem[];
                            const enItems = es.items as QAItem[];
                            if (enItems.length !== srcItems.length) return true;
                            for (let j = 0; j < srcItems.length; j++) {
                                const ptQ = (srcItems[j].question || '').trim();
                                const enQ = (enItems[j].question || '').trim();
                                const ptA = (srcItems[j].answer || '').trim();
                                const enA = (enItems[j].answer || '').trim();
                                if (!enQ || enQ.toLowerCase() === ptQ.toLowerCase()) return true;
                                if (!enA || enA.toLowerCase() === ptA.toLowerCase()) return true;
                            }
                        }
                    }
                }
                return false;
            };

            if (existing && !needsFix(existing)) {
                setTranslatedCategories(existing);
                setIsTranslatingCategories(false);
                return;
            }

            try {
                const stored = await getCategoryTranslations(targetLangCode);
                if (stored) {
                    rememberTranslations(targetLangCode, stored);
                    setIsTranslatingCategories(false);
                    return;
                }
            } catch (error) {
                console.error('Erro ao carregar traduções de categorias salvas:', error);
            }

            setIsTranslatingCategories(true);
            const translated: Partial<TranslatedCategories> = {};
            const effectiveLangName = targetLangCode === 'en-US' ? 'English (US)' : targetLangName;

            const translateValue = async (text: string) => {
                if (!text.trim()) return text;
                const cacheKey = `${targetLangCode}::${text}`;

                // Check in-memory cache first
                if (translationCacheRef.current[cacheKey]) {
                    return translationCacheRef.current[cacheKey];
                }

                // Check IndexedDB cache
                const cachedTranslation = await conversaCache.getCachedTranslation(cacheKey);
                if (cachedTranslation) {
                    translationCacheRef.current[cacheKey] = cachedTranslation;
                    return cachedTranslation;
                }

                // Call Gemini API if not cached
                try {
                    const translatedText = await translateText(text, BASE_CATEGORY_LANGUAGE_NAME, effectiveLangName);
                    const sanitized = translatedText && translatedText !== 'Erro na tradução.' ? translatedText : text;

                    // Save to both caches
                    translationCacheRef.current[cacheKey] = sanitized;
                    await conversaCache.saveCachedTranslation(cacheKey, sanitized);

                    return sanitized;
                } catch (error) {
                    console.error('Erro ao traduzir texto da categoria:', error);
                    return text;
                }
            };

            for (const key of CATEGORY_KEYS) {
                const definition = CATEGORY_DEFINITIONS[key];
                const sections: CategorySection[] = [];

                for (const section of definition.sections) {
                    if (section.type === 'qa') {
                        const translatedItems: QAItem[] = [];

                        for (const item of section.items) {
                            const question = await translateValue(item.question);
                            const answer = await translateValue(item.answer);
                            translatedItems.push({ question, answer });
                        }

                        sections.push({
                            ...section,
                            heading: await translateValue(section.heading),
                            items: translatedItems,
                        } as QASection);
                    } else {
                        const translatedItems: string[] = [];

                        for (const item of section.items) {
                            translatedItems.push(await translateValue(item));
                        }

                        sections.push({
                            ...section,
                            heading: await translateValue(section.heading),
                            items: translatedItems,
                        } as PhraseSection);
                    }
                }

                translated[key] = {
                    ...definition,
                    title: await translateValue(definition.title),
                    description: await translateValue(definition.description),
                    roleInstruction: await translateValue(definition.roleInstruction),
                    kickoffPrompt: await translateValue(definition.kickoffPrompt),
                    sections,
                };
            }

            const finalTranslations = translated as TranslatedCategories;
            rememberTranslations(targetLangCode, finalTranslations);
            try {
                await saveCategoryTranslations(targetLangCode, finalTranslations);
            } catch (error) {
                console.error('Erro ao salvar traduções de categorias:', error);
            }
            setIsTranslatingCategories(false);
        },
        [rememberTranslations]
    );

    useEffect(() => {
        // Garantir inglês sempre disponível para exibir a primeira linha
        ensureCategoryTranslations('en-US', 'English (US)').then(async () => {
            try {
                const en = translatedByLangRef.current['en-US'];
                if (en) {
                    await saveCategoryTranslations('en-US', en);
                }
            } catch (e) {
                console.error('Falha ao salvar traduções fixas em inglês:', e);
            }
        }).catch((error) => {
            console.error('Falha ao preparar traduções fixas em inglês:', error);
        });
    }, [ensureCategoryTranslations]);

    useEffect(() => {
        if (!useTranslatedCategories || !learningLanguageName) {
            setIsTranslatingCategories(false);
            return;
        }

        ensureCategoryTranslations(settings.learningLanguage, learningLanguageName).catch((error) => {
            console.error('Falha ao preparar traduções de categorias:', error);
            setIsTranslatingCategories(false);
        });
    }, [ensureCategoryTranslations, learningLanguageName, settings.learningLanguage, useTranslatedCategories]);

    const activeCategoryDefinition = selectedCategoryKey ? CATEGORY_DEFINITIONS[selectedCategoryKey] : null;
    const activeTranslatedCategory = selectedCategoryKey ? translatedCategories[selectedCategoryKey] : null;

    useEffect(() => {
        if (!activeTranslatedCategory || settings.learningLanguage !== 'en-US') return;
        const texts: string[] = [];
        activeTranslatedCategory.sections.forEach((section) => {
            if (section.type === 'qa') {
                (section.items as QAItem[]).forEach((it) => { texts.push(it.question); texts.push(it.answer); });
            } else {
                (section.items as string[]).forEach((it) => texts.push(it));
            }
        });
        const missing = texts.filter((t) => t && !phoneticsCacheRef.current[t]);
        if (!missing.length) return;
        let cancelled = false;
        (async () => {
            for (const t of missing) {
                try {
                    // Check old category phonetic cache first (for backward compatibility)
                    const cached = await getCategoryPhonetic('en-US', settings.nativeLanguage, t);
                    if (cached) {
                        if (!cancelled) phoneticsCacheRef.current[t] = cached;
                        continue;
                    }

                    // Check new conversaCache
                    const cachedPhonetic = await conversaCache.getCachedPhonetic(t);
                    if (cachedPhonetic) {
                        if (!cancelled) phoneticsCacheRef.current[t] = cachedPhonetic;
                        continue;
                    }

                    // Call Gemini API if not cached
                    const ph = await getPhonetics(t, 'English (US)', nativeLangName);
                    if (!cancelled) phoneticsCacheRef.current[t] = ph;

                    // Save to both caches
                    await saveCategoryPhonetic('en-US', settings.nativeLanguage, t, ph);
                    await conversaCache.saveCachedPhonetic(t, ph);
                } catch (e) {
                    console.error('Erro ao gerar/persistir fonética:', e);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [activeTranslatedCategory, nativeLangName, settings.learningLanguage]);

    useEffect(() => {
        const run = async () => {
            const baseSet = CATEGORY_DEFINITIONS;
            const existing = translatedByLangRef.current['en-US'] ?? {} as TranslatedCategories;
            const out: Partial<TranslatedCategories> = { ...existing };
            for (const key of CATEGORY_KEYS) {
                const base = baseSet[key];
                const enCat = existing[key];
                let need = !enCat;
                if (!need && enCat.sections.length === base.sections.length) {
                    for (let i = 0; i < base.sections.length; i++) {
                        const s = base.sections[i];
                        const es = enCat.sections[i];
                        if (!es) { need = true; break; }
                        if (s.type === 'phrases') {
                            const srcItems = s.items as string[];
                            const enItems = es.items as string[];
                            if (enItems.length !== srcItems.length) { need = true; break; }
                            for (let j = 0; j < srcItems.length; j++) {
                                const pt = (srcItems[j] || '').trim();
                                const en = (enItems[j] || '').trim();
                                if (!en || en.toLowerCase() === pt.toLowerCase()) { need = true; break; }
                            }
                        }
                    }
                }
                if (!need) continue;
                const translated: CategoryDefinition = {
                    ...base,
                    title: await translateText(base.title, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'),
                    description: await translateText(base.description, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'),
                    roleInstruction: await translateText(base.roleInstruction, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'),
                    kickoffPrompt: await translateText(base.kickoffPrompt, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'),
                    sections: await Promise.all(base.sections.map(async (section) => {
                        if (section.type === 'phrases') {
                            const items = await Promise.all((section.items as string[]).map(async (it) => {
                                const tr = await translateText(it, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)');
                                return tr && tr !== 'Erro na tradução.' ? tr : it;
                            }));
                            return { ...section, heading: await translateText(section.heading, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'), items } as PhraseSection;
                        }
                        const items = await Promise.all((section.items as QAItem[]).map(async (it) => ({
                            question: await translateText(it.question, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'),
                            answer: await translateText(it.answer, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'),
                        })));
                        return { ...section, heading: await translateText(section.heading, BASE_CATEGORY_LANGUAGE_NAME, 'English (US)'), items } as QASection;
                    })),
                };
                (out as TranslatedCategories)[key] = translated;
            }
            const merged = out as TranslatedCategories;
            translatedByLangRef.current['en-US'] = merged;
            if (settings.learningLanguage === 'en-US') setTranslatedCategories(merged);
            try { await saveCategoryTranslations('en-US', merged); } catch (e) { }
            const texts: string[] = [];
            CATEGORY_KEYS.forEach((key) => {
                const cat = merged[key];
                cat.sections.forEach((section) => {
                    if (section.type === 'qa') {
                        (section.items as QAItem[]).forEach((it) => { texts.push(it.question); texts.push(it.answer); });
                    } else {
                        (section.items as string[]).forEach((it) => texts.push(it));
                    }
                });
            });
            for (const t of texts) {
                const cached = await getCategoryPhonetic('en-US', settings.nativeLanguage, t);
                if (cached) { phoneticsCacheRef.current[t] = cached; continue; }
                const ph = await getPhonetics(t, 'English (US)', nativeLangName);
                phoneticsCacheRef.current[t] = ph;
                await saveCategoryPhonetic('en-US', settings.nativeLanguage, t, ph);
            }
        };
        run().catch(() => { });
    }, [settings.nativeLanguage, settings.learningLanguage]);

    const buildSystemPrompt = useCallback(() => {
        const baseInstruction = `Você é um professor/coach de conversação. O usuário fala ${nativeLangName} e você responde em ${learningLanguageName}. Conduza uma conversa guiada, explique quando necessário e mantenha respostas curtas.`;
        const scenario = activeCategoryDefinition ? ` Contexto da simulação: ${activeCategoryDefinition.roleInstruction}` : '';
        const registerHint = activeCategoryDefinition?.register === 'informal'
            ? ' Use dialeto americano informal com gírias e contrações naturais.'
            : ' Use inglês americano formal, educado e profissional; evite gírias.';
        return `${baseInstruction}${scenario}${registerHint}`;
    }, [activeCategoryDefinition, learningLanguageName, nativeLangName]);

    const processVoskConversation = useCallback(
        async (chunks: Int16Array[]) => {
            if (chunks.length === 0) {
                setStatus('Nenhum áudio capturado para processar.');
                return;
            }

            setIsProcessingVosk(true);
            const languageLabel = selectedVoskLanguageOption?.label ?? voskLanguage;
            setStatus(`Processando áudio offline (${languageLabel}) com Vosk/OpenRouter...`);

            try {
                const merged = mergeInt16Chunks(chunks);
                if (merged.length === 0) {
                    setStatus('Áudio muito curto. Gravação descartada.');
                    return;
                }

                if (isAudioSilent(merged)) {
                    console.warn('[ConversationView] Áudio capturado está silencioso. Abortando envio ao Vosk.');
                    setStatus('Não foi possível detectar sua voz. Fale mais alto e tente novamente.');
                    return;
                }

                const audioBase64 = encodeInt16ToWavBase64(merged, inputAudioContextRef.current?.sampleRate ?? 16000);
                const modelId = settings.openRouterModelId?.trim() || 'openrouter/auto';

                const response = await chatWithAudio({
                    model: modelId,
                    audioBase64,
                    systemPrompt: buildSystemPrompt(),
                    language: voskLanguage,
                });

                setUserTranscript(response.transcription);
                setModelTranscript(response.llm_response || '');
                userTranscriptRef.current = response.transcription;
                modelTranscriptRef.current = response.llm_response || '';
                setLastTurn({
                    user: response.transcription,
                    model: response.llm_response || ''
                });

                if (response.audio_base64) {
                    const audioUrl = `data:audio/wav;base64,${response.audio_base64}`;
                    const audio = new Audio(audioUrl);
                    audio.play().catch((error) => {
                        console.error('Erro ao reproduzir áudio da IA:', error);
                    });
                }

                setStatus('Interação concluída com Vosk/OpenRouter.');
            } catch (error) {
                console.error('Erro ao processar interação Vosk/OpenRouter:', error);
                setStatus('Erro ao processar áudio offline. Verifique os logs do serviço Vosk.');
            } finally {
                setIsProcessingVosk(false);
            }
        },
        [buildSystemPrompt, settings.openRouterModelId, selectedVoskLanguageOption, voskLanguage]
    );

    const stopConversation = useCallback(() => {
        const currentMode = sessionModeRef.current;
        const capturedChunks = currentMode === 'vosk' ? [...audioChunksRef.current] : [];
        audioChunksRef.current = [];

        socketRef.current?.close();
        socketRef.current = null;

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        try {
            scriptProcessorRef.current?.disconnect();
        } catch (e) {
            // The context might already be closed, which can cause an error here. Ignore it.
        }
        scriptProcessorRef.current = null;

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        inputAudioContextRef.current = null;

        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        outputAudioContextRef.current = null;

        audioSourcesRef.current.forEach(s => {
            try { s.stop(); } catch (e) { /* already stopped */ }
        });
        audioSourcesRef.current.clear();

        setIsSessionActive(false);
        userTranscriptRef.current = '';
        modelTranscriptRef.current = '';

        sessionModeRef.current = null;
        setSessionMode(null);

        if (currentMode === 'vosk') {
            setStatus('Enviando áudio capturado para processamento offline...');
            void processVoskConversation(capturedChunks);
        } else {
            setStatus('Pronto para começar');
        }
    }, [processVoskConversation]);

    const startConversation = useCallback(async () => {
        const shouldUseVosk = Boolean(settings.useVoskStt);

        if (isProcessingVosk) {
            setStatus('Aguarde o processamento offline terminar antes de iniciar uma nova conversa.');
            return;
        }

        setStatus(shouldUseVosk ? 'Preparando captura offline...' : 'Iniciando...');
        if (isSessionActive) {
            stopConversation();
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Seu navegador não suporta acesso ao microfone.');
            return;
        }

        try {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = shouldUseVosk
                ? null
                : new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioChunksRef.current = [];
            userTranscriptRef.current = '';
            modelTranscriptRef.current = '';
            setUserTranscript('');
            setModelTranscript('');
            setLastTurn(null);

            if (shouldUseVosk) {
                sessionModeRef.current = 'vosk';
                setSessionMode('vosk');

                const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = processor;
                processor.onaudioprocess = (event) => {
                    const inputData = event.inputBuffer.getChannelData(0);
                    if (inputData && inputData.length) {
                        audioChunksRef.current.push(float32ToInt16(inputData));
                    }
                };
                source.connect(processor);
                processor.connect(inputAudioContextRef.current.destination);

                setIsSessionActive(true);
                const scenarioTitle = activeTranslatedCategory?.title || activeCategoryDefinition?.title;
                const languageLabel = selectedVoskLanguageOption?.label ?? voskLanguage;
                setStatus(
                    scenarioTitle
                        ? `Gravando áudio offline (${languageLabel}) no cenário "${scenarioTitle}". Pressione parar para enviar ao Vosk/OpenRouter.`
                        : `Gravando áudio offline (${languageLabel}). Pressione parar para enviar ao Vosk/OpenRouter.`
                );
                return;
            }

            sessionModeRef.current = 'gemini';
            setSessionMode('gemini');

            const nativeLang = nativeLangName;
            const learningLang = learningLanguageName;

            const voiceLanguageConfig = VOICE_CONFIG[settings.learningLanguage] || VOICE_CONFIG['en-US'];
            const voiceName = voiceLanguageConfig[settings.voiceGender] || voiceLanguageConfig.female || 'Kore';

            const ws = new WebSocket(PROXY_WS_URL);
            socketRef.current = ws;

            ws.onopen = () => {
                if (!inputAudioContextRef.current || !mediaStreamRef.current) {
                    return;
                }

                const setupPayload = {
                    type: 'setup',
                    payload: {
                        model: 'models/gemini-2.0-flash-exp',
                        responseModalities: ['AUDIO'],
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        systemInstruction: buildSystemPrompt(),
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                        },
                    },
                };
                ws.send(JSON.stringify(setupPayload));

                const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current.onaudioprocess = (event) => {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const audioBuffer = new Int16Array(inputData.map((v) => v * 32768));
                    ws.send(
                        JSON.stringify({
                            type: 'audio',
                            data: encode(new Uint8Array(audioBuffer.buffer)),
                        }),
                    );
                };
                source.connect(scriptProcessorRef.current);
                scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

                setIsSessionActive(true);
                setStatus(activeTranslatedCategory ? `Cenário "${activeTranslatedCategory.title}" ativo. Pode falar!` : 'Conectado. Pode falar!');

                if (activeCategoryDefinition) {
                    ws.send(
                        JSON.stringify({
                            type: 'client-content',
                            text: activeCategoryDefinition.kickoffPrompt,
                        }),
                    );
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data as string);

                    if (message?.serverContent?.inputTranscription?.text) {
                        const text = message.serverContent.inputTranscription.text;
                        setUserTranscript((prev) => {
                            const next = prev + text;
                            userTranscriptRef.current = next;
                            return next;
                        });
                    }

                    if (message?.serverContent?.outputTranscription?.text) {
                        const text = message.serverContent.outputTranscription.text;
                        setModelTranscript((prev) => {
                            const next = prev + text;
                            modelTranscriptRef.current = next;
                            return next;
                        });
                    }

                    if (message?.serverContent?.turnComplete) {
                        setLastTurn({
                            user: userTranscriptRef.current,
                            model: modelTranscriptRef.current,
                        });
                        setUserTranscript('');
                        setModelTranscript('');
                        userTranscriptRef.current = '';
                        modelTranscriptRef.current = '';
                    }

                    const audioData = message?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && outputAudioContextRef.current) {
                        const outputAudioContext = outputAudioContextRef.current;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                        const buffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(outputAudioContext.destination);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += buffer.duration;
                        audioSourcesRef.current.add(source);
                        source.onended = () => audioSourcesRef.current.delete(source);
                    }

                    if (message?.serverContent?.interrupted) {
                        audioSourcesRef.current.forEach((source) => source.stop());
                        audioSourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                } catch (error) {
                    console.error('Erro ao processar mensagem do proxy Gemini:', error);
                }
            };

            ws.onerror = (event) => {
                console.error('Erro no WebSocket de conversação:', event);
                setStatus('Erro na sessão de conversa. Tente novamente.');
                stopConversation();
            };

            ws.onclose = () => {
                stopConversation();
            };
        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus('Falha ao iniciar. Verifique as permissões.');

            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;

            if (scriptProcessorRef.current) {
                try {
                    scriptProcessorRef.current.disconnect();
                } catch (e) {
                    // ignore
                }
            }
            scriptProcessorRef.current = null;

            if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
                inputAudioContextRef.current.close();
            }
            inputAudioContextRef.current = null;

            if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
                outputAudioContextRef.current.close();
            }
            outputAudioContextRef.current = null;

            setIsSessionActive(false);
            sessionModeRef.current = null;
            setSessionMode(null);
        }
    }, [
        activeCategoryDefinition,
        activeTranslatedCategory,
        buildSystemPrompt,
        isProcessingVosk,
        isSessionActive,
        learningLanguageName,
        nativeLangName,
        settings.learningLanguage,
        settings.useVoskStt,
        settings.voiceGender,
        stopConversation,
    ]);

    useEffect(() => {
        return () => { stopConversation(); };
    }, [stopConversation]);

    const handleAddFlashcard = async () => {
        if (!lastTurn) return;
        setStatus('Criando flashcard...');
        // The user speaks in native, model replies in learning.
        const originalText = lastTurn.user;
        const translatedText = lastTurn.model;

        const learningLangName = SUPPORTED_LANGUAGES.find(l => l.code === settings.learningLanguage)?.name || settings.learningLanguage;
        const nativeLangName2 = SUPPORTED_LANGUAGES.find(l => l.code === settings.nativeLanguage)?.name || settings.nativeLanguage;
        const phoneticText = await getPhonetics(translatedText, learningLangName, nativeLangName2);

        addFlashcard({
            originalText,
            translatedText,
            phoneticText,
            originalLang: settings.nativeLanguage,
            translatedLang: settings.learningLanguage
        });
        setLastTurn(null);
        setStatus('Flashcard adicionado!');
    };

    const handleSelectCategory = useCallback((categoryKey: CategoryKey) => {
        setSelectedCategoryKey(categoryKey);
        setIsCategoryModalOpen(false);
        setCategoryPanelVisible(true);
        const translated = translatedCategories[categoryKey];
        setStatus(`Categoria "${translated?.title || CATEGORY_DEFINITIONS[categoryKey].title}" selecionada. Inicie ou continue a conversa dentro desse cenário.`);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const message = translated?.kickoffPrompt || CATEGORY_DEFINITIONS[categoryKey].kickoffPrompt;
            socketRef.current.send(JSON.stringify({ type: 'client-content', text: message }));
        }
    }, [translatedCategories]);

    const translationButtonLabel = useMemo(() => {
        const flag = getFlagEmoji(settings.nativeLanguage);
        return useTranslatedCategories ? `${flag} Ver em Português` : `${flag} Traduzir`;
    }, [useTranslatedCategories, settings.nativeLanguage]);

    const ENGLISH_NAME = 'English (US)';

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex flex-col lg:flex-row gap-6 flex-grow">
                {categoryPanelVisible && activeCategoryDefinition && (
                    <aside className="lg:w-80 xl:w-96 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-4 h-full max-h-[calc(100vh-6rem)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    {(useTranslatedCategories ? activeTranslatedCategory?.title : activeCategoryDefinition.title) || activeCategoryDefinition.title}
                                </h2>
                                <p className="text-sm text-gray-300">
                                    {(useTranslatedCategories ? activeTranslatedCategory?.description : activeCategoryDefinition.description) || activeCategoryDefinition.description}
                                </p>
                            </div>
                            <button
                                onClick={() => setCategoryPanelVisible(false)}
                                className="text-gray-400 hover:text-gray-200"
                                title="Ocultar painel"
                            >
                                <Icons.XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-gray-400">Referência visual</span>
                            {autoPrepStatus && (
                                <span className="text-[11px] text-cyan-300 inline-flex items-center gap-1">
                                    <Icons.ClockIcon className="w-3 h-3 animate-spin" />
                                    {autoPrepStatus}
                                </span>
                            )}
                            <button
                                onClick={async () => {
                                    try {
                                        const sectionIdx = activeCategoryDefinition?.sections.findIndex(s => s.type === 'qa') ?? -1;
                                        if (sectionIdx < 0) return;
                                        const englishSection = translatedByLangRef.current['en-US']?.[selectedCategoryKey!]?.sections[sectionIdx] as QASection | undefined;
                                        const enItem = englishSection?.items?.[0] as QAItem | undefined;
                                        const baseItem = (activeCategoryDefinition!.sections[sectionIdx] as QASection).items[0] as QAItem;
                                        const enQ = enItem?.question ?? baseItem.question;
                                        const enA = enItem?.answer ?? baseItem.answer;
                                        setStatus('Reproduzindo TTS...');
                                        await playAudio(enQ, 'en-US', settings.voiceGender);
                                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                                        const src = ctx.createMediaStreamSource(stream);
                                        const proc = ctx.createScriptProcessor(4096, 1, 1);
                                        const chunks: Int16Array[] = [];
                                        setIsMicTransientActive(true);
                                        setStatus('Gravando resposta por 2.5s...');
                                        proc.onaudioprocess = (event) => {
                                            const inputData = event.inputBuffer.getChannelData(0);
                                            const int16 = new Int16Array(inputData.length);
                                            for (let i = 0; i < inputData.length; i++) int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                                            chunks.push(int16);
                                        };
                                        src.connect(proc);
                                        proc.connect(ctx.destination);
                                        await new Promise(r => setTimeout(r, 10000));
                                        try { proc.disconnect(); } catch { }
                                        try { src.disconnect(); } catch { }
                                        stream.getTracks().forEach(t => t.stop());
                                        setIsMicTransientActive(false);
                                        const merged = mergeInt16Chunks(chunks);
                                        const base64 = encodeInt16ToWavBase64(merged, ctx.sampleRate || 16000);
                                        const binary = atob(base64);
                                        const buf = new Uint8Array(binary.length);
                                        for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
                                        const blob = new Blob([buf], { type: 'audio/wav' });
                                        setStatus('Transcrevendo áudio...');
                                        try {
                                            const vosk = await chatWithAudio({
                                                model: settings.openRouterModelId || 'google/gemma-2-9b-it',
                                                audioBase64: base64,
                                                systemPrompt: 'Transcribe the audio as English plain text. No extra commentary.',
                                                language: 'en-US'
                                            });
                                            const transcription = vosk.transcription || '';
                                            setUserTranscript(transcription);
                                            userTranscriptRef.current = transcription;
                                        } catch (e) {
                                            console.error('Falha na transcrição offline:', e);
                                        }
                                        setStatus('Analisando pronúncia...');
                                        const result = await analyzePronunciation(blob, enA);
                                        const ok = (result.text_accuracy || 0) >= 70 && (result.overall_score || 0) >= 60;
                                        const key = `${selectedCategoryKey || 'none'}:${sectionIdx}:0`;
                                        qaCompletedRef.current[key] = ok;
                                        setQaCompleted({ ...qaCompletedRef.current });
                                    } catch (e) {
                                        console.error('Falha ao reproduzir e gravar:', e);
                                    }
                                }}
                                className="px-2 py-1 text-xs rounded-md bg-cyan-600 hover:bg-cyan-700 text-white"
                                title="Ouvir primeira frase e praticar"
                            >
                                Ouvir & Praticar
                            </button>
                        </div>
                        {isTranslatingCategories && useTranslatedCategories && (
                            <p className="text-xs text-cyan-300">Traduzindo conteúdo...</p>
                        )}
                        <div className="space-y-4 overflow-y-auto pr-2">
                            {activeCategoryDefinition.sections.map((section, index) => {
                                const translatedSection = activeTranslatedCategory?.sections[index];
                                const englishSection = translatedByLangRef.current['en-US']?.[selectedCategoryKey!]?.sections[index];
                                const heading = useTranslatedCategories ? translatedSection?.heading : section.heading;
                                const items = useTranslatedCategories ? translatedSection?.items ?? section.items : section.items;
                                return (
                                    <div key={index} className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 space-y-2">
                                        <h3 className="text-sm font-semibold text-cyan-300">{heading}</h3>
                                        {section.type === 'qa' ? (
                                            <ul className="space-y-2 text-sm text-gray-200">
                                                {(items as QAItem[]).map((item, itemIndex) => {
                                                    const base = (activeCategoryDefinition.sections[index] as QASection).items[itemIndex];
                                                    const enSource = (englishSection as QASection | undefined)?.items?.[itemIndex];
                                                    const enQ = enSource?.question ?? item.question ?? base.question;
                                                    const enA = enSource?.answer ?? item.answer ?? base.answer;
                                                    const ptQ = base.question;
                                                    const ptA = base.answer;
                                                    const phQ = phoneticsCacheRef.current[enQ] || '';
                                                    const phA = phoneticsCacheRef.current[enA] || '';
                                                    const key = `${selectedCategoryKey || 'none'}:${index}:${itemIndex}`;
                                                    const playAndPractice = async () => {
                                                        try {
                                                            await playAudio(enQ, 'en-US', settings.voiceGender);
                                                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                                            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                                                            const source = inputCtx.createMediaStreamSource(stream);
                                                            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                                                            const chunks: Int16Array[] = [];
                                                            processor.onaudioprocess = (event) => {
                                                                const inputData = event.inputBuffer.getChannelData(0);
                                                                const int16 = new Int16Array(inputData.length);
                                                                for (let i = 0; i < inputData.length; i++) int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                                                                chunks.push(int16);
                                                            };
                                                            source.connect(processor);
                                                            processor.connect(inputCtx.destination);
                                                            await new Promise((r) => setTimeout(r, 10000));
                                                            try { processor.disconnect(); } catch { }
                                                            try { source.disconnect(); } catch { }
                                                            stream.getTracks().forEach(t => t.stop());
                                                            const merged = mergeInt16Chunks(chunks);
                                                            const base64 = encodeInt16ToWavBase64(merged, inputCtx.sampleRate || 16000);
                                                            const binary = atob(base64);
                                                            const buf = new Uint8Array(binary.length);
                                                            for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
                                                            const blob = new Blob([buf], { type: 'audio/wav' });
                                                            const result = await analyzePronunciation(blob, enA);
                                                            const ok = (result.text_accuracy || 0) >= 70 && (result.overall_score || 0) >= 60;
                                                            qaCompletedRef.current[key] = ok;
                                                            setQaCompleted({ ...qaCompletedRef.current });
                                                            if (ok) {
                                                                const nextKey = `${selectedCategoryKey || 'none'}:${index}:${itemIndex + 1}`;
                                                                const el = qaItemRefs.current[nextKey];
                                                                if (el) {
                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                }
                                                            }
                                                        } catch (e) {
                                                            console.error('Falha ao praticar item:', e);
                                                        }
                                                    };
                                                    return (
                                                        <li key={itemIndex} ref={el => { qaItemRefs.current[key] = el; }} className="relative border border-gray-700 rounded-md p-2 bg-gray-900/40">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-medium text-white">{enQ}</p>
                                                                <button onClick={playAndPractice} className="text-cyan-300 hover:text-cyan-200" title="Ouvir e praticar">
                                                                    <Icons.PlayIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                            <p className="text-emerald-300 italic">{phQ}</p>
                                                            <p className="text-gray-400">{ptQ}</p>
                                                            <div className="mt-2">
                                                                <p className="text-white">{enA}</p>
                                                                <p className="text-emerald-300 italic">{phA}</p>
                                                                <p className="text-gray-400">{ptA}</p>
                                                            </div>
                                                            {qaCompleted[key] && (
                                                                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-emerald-300">
                                                                    <Icons.CheckCircleIcon className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <ul className="space-y-1 text-sm text-gray-200 list-disc list-inside">
                                                {(items as string[]).map((item, itemIndex) => (
                                                    <li key={itemIndex}>{item}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}

                        </div>
                    </aside>
                )}

                <div className="flex flex-col gap-4 flex-1">
                    <div className="w-full max-w-2xl mx-auto lg:mx-0 bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                            <p className="text-center sm:text-left text-cyan-400 flex-1">{status}</p>
                            <div className="flex items-center justify-center gap-2 text-xs">
                                {sessionMode === 'vosk' && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-200 px-3 py-1">
                                        <Icons.ChipIcon className="w-4 h-4" />
                                        Modo offline Vosk
                                    </span>
                                )}
                                {sessionMode === 'gemini' && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 border border-cyan-500/60 text-cyan-200 px-3 py-1">
                                        <Icons.WifiIcon className="w-4 h-4" />
                                        Modo online Gemini
                                    </span>
                                )}
                                {isProcessingVosk && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/60 text-emerald-200 animate-pulse">
                                        <Icons.ClockIcon className="w-4 h-4" />
                                        Processando áudio offline...
                                    </span>
                                )}
                            </div>
                        </div>
                        {settings.useVoskStt && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <label htmlFor="vosk-language" className="text-sm text-gray-300">
                                    Idioma da transcrição offline
                                </label>
                                <select
                                    id="vosk-language"
                                    value={voskLanguage}
                                    onChange={(event) => setVoskLanguage(event.target.value)}
                                    className="w-full sm:w-64 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    disabled={isSessionActive && sessionMode === 'vosk'}
                                >
                                    {VOSK_LANGUAGE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="text-center mb-6 flex flex-col items-center gap-4">
                            <button
                                onClick={isSessionActive ? stopConversation : startConversation}
                                className={`p-4 rounded-full transition-all duration-300 ${(isSessionActive || isMicTransientActive) ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {(isSessionActive || isMicTransientActive) ? <Icons.MicIcon className="w-8 h-8 text-white" /> : <Icons.MicIcon className="w-8 h-8 text-white" />}
                            </button>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md"
                                >
                                    Categorias
                                </button>
                                {selectedCategoryKey && (
                                    <>
                                        <button
                                            onClick={() => setCategoryPanelVisible((prev) => !prev)}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-md"
                                        >
                                            {categoryPanelVisible ? 'Ocultar guia' : 'Mostrar guia'}
                                        </button>
                                        <span className="text-sm text-gray-300 border border-cyan-600/40 rounded-full px-3 py-1">
                                            Cenário: {translatedCategories[selectedCategoryKey]?.title || CATEGORY_DEFINITIONS[selectedCategoryKey].title}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4 min-h-[120px]">
                            <div>
                                <p className="text-sm text-gray-400">Você:</p>
                                <p className="text-lg min-h-[28px]">{userTranscript}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">IA:</p>
                                <p className="text-lg min-h-[28px]">{modelTranscript}</p>
                            </div>
                        </div>
                        {lastTurn && (
                            <div className="mt-4 text-center">
                                <button onClick={handleAddFlashcard} className="text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-2 mx-auto">
                                    <Icons.PlusCircleIcon className="w-5 h-5" />
                                    Adicionar ao Flashcards
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-4">
                        <PronunciationPractice settings={settings} />
                        <GroundedSearch />
                    </div>
                </div>
            </div>

            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold text-cyan-400">Categorias de conversa</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-200">
                                <Icons.XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {isTranslatingCategories && (
                            <p className="text-sm text-gray-300">Traduzindo conteúdo para {learningLanguageName}...</p>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            {CATEGORY_KEYS.map((key) => {
                                const baseDefinition = CATEGORY_DEFINITIONS[key];
                                const translated = translatedCategories[key];
                                return (
                                    <div key={key} className={`rounded-lg border ${selectedCategoryKey === key ? 'border-cyan-500' : 'border-gray-700'} bg-gray-800 p-4 flex flex-col gap-3`}>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{translated?.title || baseDefinition.title}</h3>
                                            <p className="text-sm text-gray-300">{translated?.description || baseDefinition.description}</p>
                                        </div>
                                        <div className="space-y-3">
                                            {baseDefinition.sections.map((section, index) => {
                                                const translatedSection = translated?.sections[index];
                                                return (
                                                    <div key={index} className="bg-gray-900/60 border border-gray-700 rounded-md p-3 space-y-2">
                                                        <h4 className="text-sm font-semibold text-cyan-300">
                                                            {translatedSection?.heading || section.heading}
                                                        </h4>
                                                        {section.type === 'qa' ? (
                                                            <ul className="space-y-2 text-sm text-gray-200">
                                                                {(translatedSection?.items || section.items).map((item, itemIndex) => (
                                                                    <li key={itemIndex} className="border border-gray-700 rounded-md p-2 bg-gray-900/40">
                                                                        <p className="font-medium text-white">{(item as QAItem).question}</p>
                                                                        <p className="text-gray-300">{(item as QAItem).answer}</p>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <ul className="space-y-1 text-sm text-gray-200 list-disc list-inside">
                                                                {(translatedSection?.items || section.items).map((item, itemIndex) => (
                                                                    <li key={itemIndex}>{item as string}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => handleSelectCategory(key)}
                                            className="mt-auto w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md"
                                        >
                                            Praticar esta categoria
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PronunciationPractice: React.FC<{ settings: Settings }> = ({ settings }) => {
    const [textToPractice, setTextToPractice] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        if (!textToPractice.trim()) {
            setFeedback('Por favor, insira um texto para praticar.');
            return;
        }
        setFeedback('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                setIsLoading(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // For simplicity, we'll use a text-based correction model.
                // A real implementation would transcribe audio to text first.
                // Here, we simulate transcription for demonstration.
                // This is a placeholder; real audio transcription would be complex.
                const userTranscription = `(Transcrição simulada) ${textToPractice}`;

                const learningLangName = SUPPORTED_LANGUAGES.find(l => l.code === settings.learningLanguage)?.name || settings.learningLanguage;
                const nativeLangName = SUPPORTED_LANGUAGES.find(l => l.code === settings.nativeLanguage)?.name || settings.nativeLanguage;

                const correction = await getPronunciationCorrection(textToPractice, userTranscription, learningLangName, nativeLangName);
                setFeedback(correction);
                setIsLoading(false);
                audioChunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setFeedback('Não foi possível iniciar a gravação. Verifique as permissões do microfone.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    return (
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg mt-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Praticar Pronúncia</h3>
            <input
                type="text"
                value={textToPractice}
                onChange={(e) => setTextToPractice(e.target.value)}
                placeholder={`Digite uma frase em ${SUPPORTED_LANGUAGES.find(l => l.code === settings.learningLanguage)?.name || ''}`}
                className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white mb-3"
            />
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full py-2 px-4 rounded-md font-semibold text-white transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                disabled={isLoading}
            >
                {isLoading ? 'Analisando...' : isRecording ? 'Parar Gravação' : 'Gravar Pronúncia'}
            </button>
            {feedback && <p className="mt-4 text-gray-300 whitespace-pre-wrap">{feedback}</p>}
        </div>
    );
};

const GroundedSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<{ text: string, sources: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsLoading(true);
        setResult(null);
        const response = await getGroundedAnswer(query);
        setResult(response);
        setIsLoading(false);
    };

    return (
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg mt-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Pesquisa Inteligente</h3>
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Pergunte sobre lugares, notícias, etc."
                    className="flex-grow bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"
                />
                <button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50">
                    {isLoading ? 'Buscando...' : 'Perguntar'}
                </button>
            </form>
            {result && (
                <div className="mt-4 text-gray-300">
                    <p className="whitespace-pre-wrap">{result.text}</p>
                    {result.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <h4 className="font-semibold text-sm text-gray-400">Fontes:</h4>
                            <ul className="list-disc list-inside text-sm">
                                {result.sources.map((source, index) => (
                                    <li key={index}>
                                        <a href={source.web?.uri || source.maps?.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                                            {source.web?.title || source.maps?.title || 'Link'}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ConversationView;

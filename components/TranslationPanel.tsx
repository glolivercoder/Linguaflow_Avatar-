import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from './icons';
import { SUPPORTED_LANGUAGES } from '../constants';
import { LanguageCode } from '../types';

interface TranslationPanelProps {
    translationInput: string;
    setTranslationInput: (value: string) => void;
    translationTargetLang: LanguageCode;
    setTranslationTargetLang: (value: LanguageCode) => void;
    translatedText: string;
    translationPhonetic: string;
    isTranslating: boolean;
    handleTranslate: () => void;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({
    translationInput,
    setTranslationInput,
    translationTargetLang,
    setTranslationTargetLang,
    translatedText,
    translationPhonetic,
    isTranslating,
    handleTranslate
}) => {
    // TTS Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [rate, setRate] = useState(1.0);
    const [pitch, setPitch] = useState(1.0);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Filter voices based on target language
    const filteredVoices = availableVoices.filter(voice =>
        voice.lang.startsWith(translationTargetLang) ||
        voice.lang.startsWith(translationTargetLang.split('-')[0])
    );

    // Auto-select voice if none selected or language changed
    useEffect(() => {
        if (filteredVoices.length > 0) {
            // Try to keep current selection if valid for new language
            const currentValid = filteredVoices.find(v => v.name === selectedVoice?.name);
            if (!currentValid) {
                setSelectedVoice(filteredVoices[0]);
            }
        } else {
            setSelectedVoice(null);
        }
    }, [translationTargetLang, availableVoices]); // Depend on availableVoices too

    const handlePlay = useCallback(() => {
        if (!translatedText || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = translationTargetLang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        window.speechSynthesis.speak(utterance);
    }, [translatedText, translationTargetLang, rate, pitch, selectedVoice]);

    return (
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 relative">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                    <Icons.LanguageIcon className="w-5 h-5" />
                    Tradução
                </h3>

                {/* TTS Settings Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-gray-400 hover:text-cyan-400 flex items-center gap-1 text-sm transition-colors"
                        title="Configurações de Voz"
                    >
                        <Icons.SettingsIcon className="w-4 h-4" />
                        TTS
                    </button>

                    {/* Settings Popup */}
                    {showSettings && (
                        <div className="absolute right-0 top-8 z-20 w-72 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-4">
                            <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
                                <h4 className="text-white font-medium text-sm">Ajustes de Voz</h4>
                                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                                    <Icons.XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Voice Selection */}
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Voz</label>
                                    <select
                                        value={selectedVoice?.name || ''}
                                        onChange={(e) => {
                                            const voice = availableVoices.find(v => v.name === e.target.value);
                                            setSelectedVoice(voice || null);
                                        }}
                                        className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white p-2 focus:border-cyan-500 outline-none"
                                    >
                                        {filteredVoices.length > 0 ? (
                                            filteredVoices.map(voice => (
                                                <option key={voice.name} value={voice.name}>
                                                    {voice.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">Nenhuma voz encontrada</option>
                                        )}
                                    </select>
                                </div>

                                {/* Speed Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Velocidade</span>
                                        <span>{rate.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={rate}
                                        onChange={(e) => setRate(parseFloat(e.target.value))}
                                        className="w-full accent-cyan-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                {/* Pitch Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Tom</span>
                                        <span>{pitch.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={pitch}
                                        onChange={(e) => setPitch(parseFloat(e.target.value))}
                                        className="w-full accent-cyan-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3 mb-4">
                <input
                    type="text"
                    value={translationInput}
                    onChange={(e) => setTranslationInput(e.target.value)}
                    placeholder="Digite o texto para traduzir..."
                    className="flex-1 bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleTranslate()}
                />
                <select
                    value={translationTargetLang}
                    onChange={(e) => setTranslationTargetLang(e.target.value as LanguageCode)}
                    className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
                <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !translationInput.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-md font-semibold"
                >
                    {isTranslating ? 'Traduzindo...' : 'Traduzir'}
                </button>
            </div>
            {translatedText && (
                <div className="mt-4 p-4 bg-gray-700/50 rounded-md border border-gray-600">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <p className="text-lg text-white mb-2">{translatedText}</p>
                            {translationPhonetic && (
                                <p className="text-emerald-300 italic text-sm">{translationPhonetic}</p>
                            )}
                        </div>
                        <button
                            onClick={handlePlay}
                            className="p-2 rounded-full hover:bg-gray-600 text-cyan-400 hover:text-cyan-300"
                            title="Reproduzir tradução"
                        >
                            <Icons.PlayIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TranslationPanel;

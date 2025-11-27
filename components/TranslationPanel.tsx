import React from 'react';
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
    handlePlayTranslation: () => void;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({
    translationInput,
    setTranslationInput,
    translationTargetLang,
    setTranslationTargetLang,
    translatedText,
    translationPhonetic,
    isTranslating,
    handleTranslate,
    handlePlayTranslation
}) => {
    return (
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                <Icons.LanguageIcon className="w-5 h-5" />
                Tradução
            </h3>
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
                            onClick={handlePlayTranslation}
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

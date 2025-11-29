import React from 'react';
import * as Icons from './icons';

export type TTSModel = 'kitten' | 'piper' | 'gemini';

export interface TTSSettings {
    questionModel: TTSModel;
    answerModel: TTSModel;
    questionVoice: string;
    answerVoice: string;
    speed: number;
    pitch: number;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
    questionModel: 'kitten',
    answerModel: 'kitten',
    questionVoice: 'expr-voice-5-f',
    answerVoice: 'expr-voice-5-f',
    speed: 1.0,
    pitch: 1.0,
};

const KITTEN_VOICES = [
    { value: 'expr-voice-5-f', label: 'Female (Expressive)' },
    { value: 'expr-voice-5-m', label: 'Male (Expressive)' },
];

const PIPER_VOICES = [
    { value: 'en_US-lessac-medium', label: 'English (US) - Lessac' },
    { value: 'en_US-libritts-high', label: 'English (US) - LibriTTS' },
    { value: 'en_GB-alan-medium', label: 'English (GB) - Alan' },
    { value: 'pt_BR-faber-medium', label: 'Português (BR) - Faber' },
];

const GEMINI_VOICES = [
    { value: 'default', label: 'Default AI Voice' },
];

interface TTSSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: TTSSettings;
    onSave: (settings: TTSSettings) => void;
}

const TTSSettingsModal: React.FC<TTSSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = React.useState<TTSSettings>(settings);

    if (!isOpen) return null;

    const getVoicesForModel = (model: TTSModel) => {
        switch (model) {
            case 'kitten': return KITTEN_VOICES;
            case 'piper': return PIPER_VOICES;
            case 'gemini': return GEMINI_VOICES;
            default: return [];
        }
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <h2 className="text-xl font-semibold text-cyan-400 flex items-center gap-2">
                        <Icons.SpeakerIcon className="w-6 h-6" />
                        Configurações de Voz (TTS)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                        <Icons.XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Question Settings */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Voz da Pergunta (IA)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Modelo</label>
                                <select
                                    value={localSettings.questionModel}
                                    onChange={(e) => setLocalSettings({ ...localSettings, questionModel: e.target.value as TTSModel, questionVoice: getVoicesForModel(e.target.value as TTSModel)[0].value })}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="kitten">Kitten TTS (Local)</option>
                                    <option value="piper">Piper TTS (Local)</option>
                                    <option value="gemini">Gemini (Online)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Voz</label>
                                <select
                                    value={localSettings.questionVoice}
                                    onChange={(e) => setLocalSettings({ ...localSettings, questionVoice: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                                >
                                    {getVoicesForModel(localSettings.questionModel).map(v => (
                                        <option key={v.value} value={v.value}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Answer Settings */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Voz da Resposta (Referência)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Modelo</label>
                                <select
                                    value={localSettings.answerModel}
                                    onChange={(e) => setLocalSettings({ ...localSettings, answerModel: e.target.value as TTSModel, answerVoice: getVoicesForModel(e.target.value as TTSModel)[0].value })}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="kitten">Kitten TTS (Local)</option>
                                    <option value="piper">Piper TTS (Local)</option>
                                    <option value="gemini">Gemini (Online)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Voz</label>
                                <select
                                    value={localSettings.answerVoice}
                                    onChange={(e) => setLocalSettings({ ...localSettings, answerVoice: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                                >
                                    {getVoicesForModel(localSettings.answerModel).map(v => (
                                        <option key={v.value} value={v.value}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Global Settings */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm text-gray-300">Velocidade</label>
                                <span className="text-xs text-cyan-400">{localSettings.speed.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={localSettings.speed}
                                onChange={(e) => setLocalSettings({ ...localSettings, speed: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm text-gray-300">Tom (Pitch)</label>
                                <span className="text-xs text-cyan-400">{localSettings.pitch.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={localSettings.pitch}
                                onChange={(e) => setLocalSettings({ ...localSettings, pitch: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">*Pitch suportado apenas em alguns modelos (Kitten)</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-md">
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TTSSettingsModal;

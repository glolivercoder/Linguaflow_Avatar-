
import { LanguageCode, VoiceGender } from '../types';

let voices: SpeechSynthesisVoice[] = [];

// Pre-load voices
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
};
if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();


export const playAudio = (text: string, lang: LanguageCode, gender: VoiceGender): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      return reject(new Error("Browser doesn't support speech synthesis."));
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Voice selection logic
    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    // Filter by language
    const langVoices = availableVoices.filter(voice => voice.lang.startsWith(lang.split('-')[0]));
    
    if (langVoices.length > 0) {
        // Try to filter by gender
        if (gender !== 'neutral') {
            const genderMatch = gender === 'male' ? /male/i : /female/i;
            const genderVoices = langVoices.filter(v => genderMatch.test(v.name));
            if (genderVoices.length > 0) {
                selectedVoice = genderVoices[0];
            }
        }
        // Fallback to first available voice for the language
        if (!selectedVoice) {
            selectedVoice = langVoices[0];
        }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(event.error);
    
    window.speechSynthesis.speak(utterance);
  });
};

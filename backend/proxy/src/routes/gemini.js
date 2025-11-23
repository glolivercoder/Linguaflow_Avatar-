import { GoogleGenAI, Modality } from '@google/genai';

import { GEMINI_API_KEY } from '../config.js';

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const VOICE_CONFIG = {
  'en-US': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'es-ES': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'pt-BR': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'zh-CN': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'ja-JP': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'ru-RU': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'fr-FR': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  'it-IT': { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
  eo: { male: 'Fenrir', female: 'Kore', neutral: 'Puck' },
};

const getVoiceName = (languageCode, gender) => {
  const config = VOICE_CONFIG[languageCode] ?? VOICE_CONFIG['en-US'];
  return config?.[gender] ?? config?.female ?? 'Kore';
};

const ensureText = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

const buildUserContent = (text) => [
  {
    role: 'user',
    parts: [{ text: ensureText(text) }],
  },
];

const handleError = (res, error) => {
  console.error('[proxy] Gemini route error:', error);
  const status = error?.response?.status ?? 500;
  res.status(status).json({ error: error?.message ?? 'Erro interno ao consultar Gemini.' });
};

export const registerGeminiRoutes = (app) => {
  app.post('/gemini/tts', async (req, res) => {
    const { text, languageCode, voiceGender } = req.body ?? {};

    if (!text || !languageCode) {
      return res.status(400).json({ error: 'Campos text e languageCode são obrigatórios.' });
    }

    try {
      const voiceName = getVoiceName(languageCode, voiceGender ?? 'female');
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: ensureText(text) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
      res.json({ audio });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/gemini/translate', async (req, res) => {
    const { text, fromLangName, toLangName } = req.body ?? {};
    if (!text || !fromLangName || !toLangName) {
      return res.status(400).json({ error: 'Campos text, fromLangName e toLangName são obrigatórios.' });
    }

    try {
      const prompt = `Traduza o seguinte texto de ${fromLangName} para ${toLangName}: "${text}". Responda apenas com a tradução.`;
      const response = await genAI.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: buildUserContent(prompt),
      });
      res.json({ translation: response.text?.trim() ?? '' });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/gemini/phonetics', async (req, res) => {
    const { text, targetLangName, nativeLangName } = req.body ?? {};
    if (!text || !targetLangName || !nativeLangName) {
      return res.status(400).json({ error: 'Campos text, targetLangName e nativeLangName são obrigatórios.' });
    }

    try {
      const prompt = `Gere uma transcrição fonética simplificada para a frase "${text}" em ${targetLangName}. A transcrição deve ser fácil de entender para um falante nativo de ${nativeLangName}. Use uma notação simples e intuitiva. Responda apenas com a transcrição fonética.`;
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildUserContent(prompt),
      });
      res.json({ phonetics: response.text?.trim() ?? '' });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/gemini/ipa', async (req, res) => {
    const { text, langName } = req.body ?? {};
    if (!text || !langName) {
      return res.status(400).json({ error: 'Campos text e langName são obrigatórios.' });
    }

    try {
      const prompt = `Forneça a transcrição do Alfabeto Fonético Internacional (AFI) para a palavra ou frase curta "${text}" no idioma ${langName}. Responda apenas com a transcrição AFI, por exemplo: /tɹænskrɪpʃən/.`;
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildUserContent(prompt),
      });
      res.json({ ipa: response.text?.trim() ?? '' });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/gemini/pronunciation-feedback', async (req, res) => {
    const { phraseToPractice, userTranscription, learningLangName, nativeLangName } = req.body ?? {};
    if (!phraseToPractice || !userTranscription || !learningLangName || !nativeLangName) {
      return res.status(400).json({ error: 'Campos obrigatórios: phraseToPractice, userTranscription, learningLangName, nativeLangName.' });
    }

    try {
      const prompt = `Um estudante, falante nativo de ${nativeLangName}, está aprendendo ${learningLangName}.
        A frase que ele deveria dizer era: "${phraseToPractice}".
        A transcrição do que ele disse é: "${userTranscription}".

        Analise a pronúncia e a gramática. Forneça um feedback construtivo e claro em ${nativeLangName}.
        Se a pronúncia estiver boa, elogie.
        Se houver erros, aponte-os de forma amigável e explique como corrigir.
        Seja conciso e direto ao ponto.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: buildUserContent(prompt),
      });
      res.json({ feedback: response.text?.trim() ?? '' });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/gemini/grounded-answer', async (req, res) => {
    const { query } = req.body ?? {};
    if (!query) {
      return res.status(400).json({ error: 'Campo query é obrigatório.' });
    }

    try {
      const useMaps = /perto|onde|restaurante|café|loja|endereço/i.test(query);
      const tools = useMaps ? [{ googleMaps: {} }] : [{ googleSearch: {} }];
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildUserContent(query),
        config: { tools },
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      res.json({ text: response.text ?? '', sources });
    } catch (error) {
      handleError(res, error);
    }
  });
};

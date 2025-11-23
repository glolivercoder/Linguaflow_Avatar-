import dotenv from 'dotenv';
import fetch from 'cross-fetch';

dotenv.config();

export const registerVoskRoutes = (app) => {
  app.post('/vosk/chat/audio', async (req, res) => {
    // Accept both camelCase (from frontend) and snake_case (legacy)
    const {
      model,
      audioBase64,
      audio_base64,
      systemPrompt,
      system_prompt,
      language
    } = req.body;

    // Use camelCase if available, otherwise fall back to snake_case
    const audioData = audioBase64 || audio_base64;
    const prompt = systemPrompt || system_prompt;

    if (!audioData) {
      return res.status(400).json({ error: 'audioBase64 é obrigatório' });
    }

    try {
      const response = await fetch(`${process.env.VOSK_SERVICE_URL || 'http://localhost:8200'}/chat/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          audioBase64: audioData,
          systemPrompt: prompt,
          language: language || 'pt-BR',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: error.message || 'Falha ao processar áudio com Vosk',
          status: response.status
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('[proxy] Erro ao processar requisição Vosk:', error);
      res.status(500).json({
        error: 'Erro interno ao processar requisição de áudio',
        details: error.message
      });
    }
  });
};

export default registerVoskRoutes;

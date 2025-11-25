import dotenv from 'dotenv';
import fetch from 'cross-fetch';

dotenv.config();

export const registerWhisperRoutes = (app) => {
    app.post('/whisper/chat/audio', async (req, res) => {
        const {
            audioBase64,
            audio_base64,
            language,
            modelId
        } = req.body;

        const audioData = audioBase64 || audio_base64;

        if (!audioData) {
            return res.status(400).json({ error: 'audioBase64 é obrigatório' });
        }

        try {
            const response = await fetch(`${process.env.WHISPER_SERVICE_URL || 'http://localhost:8003'}/whisper/chat/audio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_base64: audioData,
                    language: language || 'auto',
                    ...(modelId && { modelId })
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return res.status(response.status).json({
                    error: error.message || 'Falha ao processar áudio com Whisper',
                    status: response.status
                });
            }

            const data = await response.json();
            res.json(data);
        } catch (error) {
            console.error('[proxy] Erro ao processar requisição Whisper:', error);
            res.status(500).json({
                error: 'Erro interno ao processar requisição de áudio',
                details: error.message
            });
        }
    });

    app.get('/whisper/health', async (req, res) => {
        try {
            const response = await fetch(`${process.env.WHISPER_SERVICE_URL || 'http://localhost:8003'}/health`);

            if (!response.ok) {
                return res.status(503).json({ error: 'Whisper service unavailable' });
            }

            const data = await response.json();
            res.json(data);
        } catch (error) {
            console.error('[proxy] Erro ao verificar saúde do Whisper:', error);
            res.status(503).json({ error: 'Whisper service unavailable' });
        }
    });
};

export default registerWhisperRoutes;

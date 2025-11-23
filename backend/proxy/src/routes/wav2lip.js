/**
 * Wav2Lip proxy routes
 * Proxies requests from frontend to Wav2Lip service (port 8300)
 */
import fetch from 'cross-fetch';

const WAV2LIP_URL = process.env.WAV2LIP_URL || 'http://localhost:8300';

export const registerWav2LipRoutes = (app) => {
    /**
     * Health check for Wav2Lip service
     */
    app.get('/wav2lip/health', async (req, res) => {
        try {
            const response = await fetch(`${WAV2LIP_URL}/health`);
            const data = await response.json();
            res.json(data);
        } catch (error) {
            console.error('[proxy] Erro ao verificar Wav2Lip health:', error);
            res.status(503).json({
                error: 'Wav2Lip service unavailable',
                details: error.message
            });
        }
    });

    /**
     * Generate lip-synced video
     * POST body: { avatar_image: base64, audio: base64, quality: "base"|"gan" }
     */
    app.post('/wav2lip/generate', async (req, res) => {
        try {
            const { avatar_image, audio, quality = 'base' } = req.body;

            if (!avatar_image || !audio) {
                return res.status(400).json({
                    error: 'Missing required fields: avatar_image, audio'
                });
            }

            console.log(`[proxy] Generating lip-sync video (quality=${quality})`);

            // Create form data
            const formData = new URLSearchParams();
            formData.append('avatar_image', avatar_image);
            formData.append('audio', audio);
            formData.append('quality', quality);

            const response = await fetch(`${WAV2LIP_URL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                timeout: 90000, // 90s timeout for CPU processing
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('[proxy] Wav2Lip generation failed:', error);
                return res.status(response.status).json({
                    error: error.detail || 'Wav2Lip generation failed',
                    status: response.status
                });
            }

            const data = await response.json();
            console.log('[proxy] Lip-sync video generated successfully');
            res.json(data);
        } catch (error) {
            console.error('[proxy] Erro ao processar requisição Wav2Lip:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    });
};

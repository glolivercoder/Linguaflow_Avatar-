import dotenv from 'dotenv';
import fetch from 'cross-fetch';

dotenv.config();

export const registerOpenRouterRoutes = (app) => {
  app.get('/openrouter/models', async (req, res) => {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada no proxy.' });
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: error.message || 'Falha ao buscar modelos do OpenRouter',
          status: response.status
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('[proxy] Erro ao buscar modelos do OpenRouter:', error);
      res.status(500).json({ error: 'Erro interno ao buscar modelos do OpenRouter' });
    }
  });
};

export default registerOpenRouterRoutes;

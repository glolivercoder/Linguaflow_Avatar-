import { PIXABAY_API_KEY } from '../config.js';

const PIXABAY_ALLOWED_HOSTS = ['pixabay.com', 'cdn.pixabay.com'];

const buildPixabayUrl = (term) => {
  const params = new URLSearchParams({
    key: PIXABAY_API_KEY,
    q: term,
    image_type: 'photo',
    per_page: '8',
    safesearch: 'true',
  });
  return `https://pixabay.com/api/?${params.toString()}`;
};

const isAllowedPixabayHost = (urlString) => {
  try {
    const parsed = new URL(urlString);
    return PIXABAY_ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

export const registerPixabayRoutes = (app) => {
  app.get('/pixabay/search', async (req, res) => {
    if (!PIXABAY_API_KEY) {
      return res.status(500).json({ error: 'PIXABAY_API_KEY não configurada no proxy.' });
    }

    const term = (req.query.q || '').toString().trim();
    if (!term) {
      return res.status(400).json({ error: 'Parâmetro q obrigatório.' });
    }

    try {
      const response = await fetch(buildPixabayUrl(term));
      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Falha ao consultar Pixabay.',
          statusText: response.statusText,
        });
      }

      const data = await response.json();
      const hits = Array.isArray(data?.hits) ? data.hits : [];
      const images = hits
        .filter((hit) => Boolean(hit?.webformatURL))
        .map((hit) => ({
          url: hit.webformatURL,
          preview: hit.previewURL,
          tags: hit.tags,
        }));

      res.json({ total: data?.total ?? 0, totalHits: data?.totalHits ?? 0, images });
    } catch (error) {
      console.error('[proxy] Erro ao consultar Pixabay:', error);
      res.status(500).json({ error: 'Erro inesperado ao consultar Pixabay.' });
    }
  });

  app.get('/pixabay/image', async (req, res) => {
    const rawUrl = (req.query.url || '').toString().trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'Parâmetro url obrigatório.' });
    }

    if (!isAllowedPixabayHost(rawUrl)) {
      return res.status(400).json({ error: 'URL não permitida para proxy.' });
    }

    try {
      const upstream = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'LinguaFlowProxy/1.0 (+https://linguaflow.ai)',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });

      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: 'Falha ao baixar imagem do Pixabay.',
          statusText: upstream.statusText,
        });
      }

      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const contentLength = upstream.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');

      return res.send(buffer);
    } catch (error) {
      console.error('[proxy] Erro ao baixar imagem do Pixabay:', error);
      return res.status(500).json({ error: 'Erro inesperado ao baixar imagem.' });
    }
  });
};

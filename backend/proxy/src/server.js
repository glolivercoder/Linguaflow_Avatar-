import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import { ALLOWED_ORIGINS, PORT } from './config.js';
import { registerGeminiRoutes } from './routes/gemini.js';
import { registerPixabayRoutes } from './routes/pixabay.js';
import { registerOpenRouterRoutes } from './routes/openrouter.js';
import { registerVoskRoutes } from './routes/vosk.js';
import { attachGeminiLiveProxy } from './ws/geminiLive.js';

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (ALLOWED_ORIGINS === '*' || !origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[proxy] Bloqueando origem não autorizada: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

const requestCounters = {
  total: 0,
  byRoute: new Map(),
};

app.use((req, res, next) => {
  const start = Date.now();
  requestCounters.total += 1;
  const routeKey = `${req.method} ${req.path}`;
  requestCounters.byRoute.set(routeKey, (requestCounters.byRoute.get(routeKey) ?? 0) + 1);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[proxy] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });

  next();
});

app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    services: ['gemini-rest', 'gemini-live', 'pixabay'],
    metrics: {
      totalRequests: requestCounters.total,
    },
  });
});

registerGeminiRoutes(app);
registerPixabayRoutes(app);
registerOpenRouterRoutes(app);
registerVoskRoutes(app);

const server = createServer(app);
attachGeminiLiveProxy(server);

server.listen(PORT, () => {
  console.log(`🚀 Proxy Gemini/Pixabay rodando na porta ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('[proxy] Unhandled rejection:', reason);
});

process.on('SIGINT', () => {
  console.log('\nEncerrando proxy...');
  server.close(() => {
    process.exit(0);
  });
});

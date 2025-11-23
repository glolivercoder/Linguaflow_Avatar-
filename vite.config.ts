import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
      headers: {
        'Content-Security-Policy': "default-src 'self' blob: http://localhost:* http://127.0.0.1:*; " +
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://aistudiocdn.com https://unpkg.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net; " +
          "font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net; " +
          "connect-src 'self' http://localhost:* http://127.0.0.1:* http://localhost:3100 ws://localhost:3100 ws: wss: https://pixabay.com https://xgozq2lbwxa4loze4irwn52pse0wgbxm.lambda-url.us-east-1.on.aws https://openrouter.ai https://openrouter.ai/api/v1; " +
          "img-src 'self' data: blob: https: http: https://pixabay.com https://*.pixabay.com https://cdn.pixabay.com https://i.pixabay.com https://cdn.statically.io; " +
          "media-src 'self' blob: data: http: https: http://localhost:* http://127.0.0.1:* https://pixabay.com https://*.pixabay.com https://cdn.pixabay.com https://i.pixabay.com;"
      }
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/sql.js/dist/sql-wasm.wasm',
            dest: '' // Copy to root of output/public folder
          }
        ]
      })
    ],
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
      include: ['sql.js'],
      exclude: [],
    },
    build: {
      rollupOptions: {
        external: [],
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.PIXABAY_API_KEY': JSON.stringify(env.PIXABAY_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

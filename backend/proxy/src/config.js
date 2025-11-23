import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: false });
  }
}

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required for the proxy server.`);
  }
  return value;
};

export const GEMINI_API_KEY = requiredEnv('GEMINI_API_KEY');
export const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '';
export const PORT = parseInt(process.env.PROXY_PORT || process.env.PORT || '3100', 10);

const defaultOrigins = ['http://localhost:3001'];
export const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS || defaultOrigins.join(',')).split(',').map(o => o.trim()).filter(Boolean)
  : '*';

export const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

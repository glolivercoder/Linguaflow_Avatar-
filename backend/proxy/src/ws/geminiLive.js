import { WebSocketServer, WebSocket } from 'ws';

import { GEMINI_API_KEY, GEMINI_WS_URL } from '../config.js';

const SOCKET_PATH = '/gemini/live';
const AUDIO_MIME_TYPE = 'audio/pcm;rate=16000';

const sendSafe = (ws, payload) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(payload);
  }
};

const buildGeminiUrl = () => `${GEMINI_WS_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`;

const serialize = (data) => JSON.stringify(data);

const createAudioMessage = (base64Data) =>
  serialize({
    realtimeInput: {
      mediaChunks: [
        {
          mimeType: AUDIO_MIME_TYPE,
          data: base64Data,
        },
      ],
    },
  });

const createSetupMessage = (payload) => serialize({ setup: payload });

const createClientContentMessage = (payload) => serialize({ clientContent: payload });

const createError = (message) => serialize({ type: 'error', message });

const validateJSONString = (raw) => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { error };
  }
};

const handleClientMessage = (clientWs, geminiWs, pending, rawMessage) => {
  const parsed = validateJSONString(rawMessage.toString());

  if (parsed.error) {
    console.error('[proxy] Mensagem inválida recebida do cliente:', parsed.error);
    sendSafe(clientWs, createError('Mensagem JSON inválida.'));
    return;
  }

  const { type, payload, data, text } = parsed;

  let outbound;
  switch (type) {
    case 'setup':
      if (!payload || typeof payload !== 'object') {
        sendSafe(clientWs, createError('Payload de setup inválido.'));
        return;
      }
      outbound = createSetupMessage(payload);
      break;
    case 'audio':
      if (typeof data !== 'string') {
        sendSafe(clientWs, createError('Campo data (base64) obrigatório para áudio.'));
        return;
      }
      outbound = createAudioMessage(data);
      break;
    case 'client-content':
      if (!payload && text) {
        outbound = createClientContentMessage({
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        });
      } else if (payload) {
        outbound = createClientContentMessage(payload);
      } else {
        sendSafe(clientWs, createError('Payload para client-content inválido.'));
        return;
      }
      break;
    case 'stop-audio':
      outbound = serialize({
        realtimeInput: {
          audioStreamEnd: true,
        },
      });
      break;
    default:
      console.warn('[proxy] Tipo de mensagem não suportado recebido do cliente:', type);
      return;
  }

  if (geminiWs.readyState === WebSocket.OPEN) {
    geminiWs.send(outbound);
  } else {
    pending.push(outbound);
  }
};

const handleGeminiConnection = (clientWs, geminiWs, pendingMessages) => {
  geminiWs.on('open', () => {
    console.log('[proxy] Conectado ao endpoint Gemini Live');
    pendingMessages.splice(0).forEach((item) => geminiWs.send(item));
    sendSafe(clientWs, serialize({ type: 'connected' }));
  });

  geminiWs.on('message', (data) => {
    sendSafe(clientWs, data);
  });

  geminiWs.on('close', (code, reason) => {
    console.log('[proxy] Conexão Gemini encerrada:', code, reason.toString());
    sendSafe(clientWs, serialize({ type: 'closed', code }));
    clientWs.close(code, reason);
  });

  geminiWs.on('error', (error) => {
    console.error('[proxy] Erro no WebSocket Gemini:', error);
    sendSafe(clientWs, createError(error.message));
    clientWs.close(1011, 'Erro ao comunicar com Gemini');
  });
};

const handleClientConnection = (clientWs, request) => {
  console.log('[proxy] Cliente conectado ao proxy Live Gemini:', request.socket.remoteAddress);

  const geminiWs = new WebSocket(buildGeminiUrl(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const pendingMessages = [];
  handleGeminiConnection(clientWs, geminiWs, pendingMessages);

  clientWs.on('message', (message) =>
    handleClientMessage(clientWs, geminiWs, pendingMessages, message),
  );

  clientWs.on('close', (code, reason) => {
    console.log('[proxy] Cliente desconectado:', code, reason.toString());
    geminiWs.close(code, reason);
  });

  clientWs.on('error', (error) => {
    console.error('[proxy] Erro no cliente WebSocket:', error);
    geminiWs.close(1011, 'Erro no cliente');
  });
};

export const attachGeminiLiveProxy = (server) => {
  const wss = new WebSocketServer({ server, path: SOCKET_PATH });
  wss.on('connection', (clientWs, request) => handleClientConnection(clientWs, request));
};

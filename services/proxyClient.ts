const env = (import.meta as any).env as Record<string, string | undefined>;

const DEFAULT_HTTP = env.VITE_PROXY_URL ?? 'http://localhost:3100';

const normalizeBase = (base: string) => (base.endsWith('/') ? base.slice(0, -1) : base);

export const PROXY_BASE_URL = normalizeBase(DEFAULT_HTTP);
export const PROXY_WS_URL = (() => {
  const explicitWs = env.VITE_PROXY_WS_URL;
  if (explicitWs) {
    return explicitWs;
  }
  const httpBase = PROXY_BASE_URL;
  const wsBase = httpBase.replace(/^http/i, 'ws');
  return `${wsBase}/gemini/live`;
})();

const buildUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${PROXY_BASE_URL}${suffix}`;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Proxy request failed with status ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  // fallback - assume text and cast
  return response.text() as unknown as T;
}

export async function proxyPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  });
  return handleResponse<T>(response);
}

export async function proxyGet<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path));
  return handleResponse<T>(response);
}

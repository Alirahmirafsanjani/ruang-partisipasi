export interface ApiErrorBody {
  error: string;
  code?: string;
}

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: BASE_HEADERS,
  });
}

export function errorResponse(message: string, status = 400, code?: string): Response {
  const body: ApiErrorBody = { error: message, ...(code ? { code } : {}) };
  return jsonResponse(body, status);
}

export function methodNotAllowed(): Response {
  return errorResponse('Metode request tidak didukung.', 405, 'METHOD_NOT_ALLOWED');
}

/** Bungkus handler agar error internal tidak membocorkan detail ke klien. */
export function handleErrors(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    try {
      return await handler(request);
    } catch (error) {
      console.error(`[${requestId}] Unhandled function error:`, error);
      return errorResponse('Terjadi kesalahan pada server. Silakan coba lagi.', 500, 'INTERNAL_ERROR');
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError('Format JSON tidak valid.');
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

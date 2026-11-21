import type {
  EventConfig,
  SubmitFeedbackPayload,
  SubmitFeedbackResponse,
  VerifyResponse,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internetmu.', 0, 'NETWORK_ERROR');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Biarkan penanganan di bawah yang memberi pesan yang ramah.
  }

  if (!response.ok) {
    const error = payload as { error?: string; code?: string } | null;
    throw new ApiError(
      error?.error ?? 'Terjadi kesalahan. Silakan coba lagi.',
      response.status,
      error?.code,
    );
  }

  return payload as T;
}

export function getEventConfig(): Promise<EventConfig> {
  return request<EventConfig>('get-event-config', { method: 'GET' });
}

export function verifyParticipant(nim: string, fullName: string): Promise<VerifyResponse> {
  return request<VerifyResponse>('verify-participant', {
    method: 'POST',
    body: JSON.stringify({ nim, fullName }),
  });
}

export function submitFeedback(payload: SubmitFeedbackPayload): Promise<SubmitFeedbackResponse> {
  return request<SubmitFeedbackResponse>('submit-feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

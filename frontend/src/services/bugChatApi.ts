import { getApiUrl } from '../config/api';

const DEFAULT_TIMEOUT_MS = 20000;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.message === 'string') return data.message;
    return `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      mode: 'cors',
    });
  } finally {
    window.clearTimeout(timer);
  }
};

const toHumanError = (error: unknown, statusCode?: number): string => {
  if (statusCode === 404) {
    return 'Сервис отправки в Telegram пока не подключен на сервере.';
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Сервер долго не отвечает. Попробуйте еще раз.';
  }

  if (error instanceof TypeError) {
    return 'Нет соединения с сервером. Проверьте интернет и повторите попытку.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Не удалось отправить сообщение. Попробуйте еще раз.';
};

export const sendBugText = async (text: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> => {
  const url = getApiUrl('/api/tgbot/send-text');
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text }),
      },
      timeoutMs
    );

    if (!response.ok) {
      const serverMessage = await parseErrorResponse(response);
      throw new Error(toHumanError(new Error(serverMessage), response.status));
    }
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error(toHumanError(error));
  }
};

export const sendBugPhoto = async (
  file: File,
  caption?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<void> => {
  const url = getApiUrl('/api/tgbot/send-photo');
  const formData = new FormData();
  formData.append('photo', file);
  if (caption) {
    formData.append('caption', caption);
  }

  try {
    // Do not set Content-Type for FormData; browser must set multipart boundary.
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      },
      timeoutMs
    );

    if (!response.ok) {
      const serverMessage = await parseErrorResponse(response);
      throw new Error(toHumanError(new Error(serverMessage), response.status));
    }
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error(toHumanError(error));
  }
};


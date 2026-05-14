const rawRestUrl =
  import.meta.env.VITE_SUPABASE_REST_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  '';

const apiKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

const normalizeRestUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.endsWith('/rest/v1')) return trimmed;
  return `${trimmed}/rest/v1`;
};

export const supabaseRestUrl = normalizeRestUrl(rawRestUrl);
export const isSupabaseConfigured = Boolean(supabaseRestUrl && apiKey);

export type SupabaseQueryValue = string | number | boolean | null;

export class SupabaseRestError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'SupabaseRestError';
    this.status = status;
    this.details = details;
  }
}

const buildUrl = (table: string, params?: URLSearchParams): string => {
  if (!isSupabaseConfigured) {
    throw new SupabaseRestError('Supabase REST URL/API key chưa được cấu hình', 0);
  }

  const query = params?.toString();
  return `${supabaseRestUrl}/${table}${query ? `?${query}` : ''}`;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.hint ||
      data?.details ||
      response.statusText ||
      'Supabase request failed';
    throw new SupabaseRestError(message, response.status, data);
  }

  return data as T;
};

export const supabaseRequest = async <T>(
  table: string,
  params: URLSearchParams | undefined,
  init?: RequestInit
): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set('apikey', apiKey);
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');
  if (!headers.has('Prefer')) {
    headers.set('Prefer', 'return=representation');
  }

  const response = await fetch(buildUrl(table, params), {
    ...init,
    headers,
  });

  return parseResponse<T>(response);
};

export const addSelect = (params: URLSearchParams, select = '*') => {
  params.set('select', select);
};

export const addOrder = (params: URLSearchParams, field: string, ascending = true) => {
  params.set('order', `${field}.${ascending ? 'asc' : 'desc'}`);
};

export const addEq = (params: URLSearchParams, field: string, value: SupabaseQueryValue | undefined) => {
  if (value !== undefined && value !== null && value !== '') {
    params.set(field, `eq.${value}`);
  }
};

export const addGte = (params: URLSearchParams, field: string, value: string | undefined) => {
  if (value) params.set(field, `gte.${value}`);
};

export const addLte = (params: URLSearchParams, field: string, value: string | undefined) => {
  if (value) params.set(field, `lte.${value}`);
};

export const addLimit = (params: URLSearchParams, limit?: number) => {
  if (limit && limit > 0) params.set('limit', String(limit));
};

export const removeUndefined = <T extends Record<string, unknown>>(data: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
};


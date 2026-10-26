import {
  User,
  Machine,
  Declaration,
  OperatorShift,
  WeeklyAnalyticsResponse,
  DeclarationStatusType,
} from '../types';

const TOKEN_STORAGE_KEY = 'hephaistos_token';
const USER_STORAGE_KEY = 'hephaistos_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: User) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `Erreur serveur (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody.detail) {
        errMsg = typeof errBody.detail === 'string'
          ? errBody.detail
          : JSON.stringify(errBody.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  // Authentification
  login: (username: string, password: string) =>
    apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  operatorLogin: (payload: {
    user_id?: number;
    pin_code?: string;
    badge_code?: string;
    machine_id?: number;
  }) =>
    apiRequest<{ access_token: string; user: User }>('/auth/operator-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOperators: () => apiRequest<User[]>('/auth/operators'),

  getMe: () => apiRequest<User>('/auth/me'),

  // Utilisateurs (Admin)
  getUsers: () => apiRequest<User[]>('/users'),

  createUser: (payload: {
    username: string;
    password: string;
    pin_code?: string;
    first_name: string;
    last_name: string;
    badge_code?: string;
    role: string;
    is_active: boolean;
  }) =>
    apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (
    userId: number,
    payload: Partial<{
      first_name: string;
      last_name: string;
      password: string;
      pin_code: string;
      badge_code: string;
      role: string;
      is_active: boolean;
    }>
  ) =>
    apiRequest<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Machines
  getMachines: (includeInactive = false) =>
    apiRequest<Machine[]>(`/machines?include_inactive=${includeInactive}`),

  createMachine: (payload: {
    code: string;
    name: string;
    workshop_sector: string;
    description?: string;
  }) =>
    apiRequest<Machine>('/machines', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMachine: (
    machineId: number,
    payload: Partial<{
      code: string;
      name: string;
      workshop_sector: string;
      description: string;
      is_active: boolean;
    }>
  ) =>
    apiRequest<Machine>(`/machines/${machineId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Déclarations & Changement d'opérateur
  createDeclaration: (payload: {
    machine_id: number;
    user_id: number;
    status_type: DeclarationStatusType;
    reason_detail?: string;
    order_reference?: string;
  }) =>
    apiRequest<Declaration>('/declarations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logOperatorChange: (payload: {
    user_id: number;
    previous_user_id?: number;
    machine_id?: number;
    pin_code?: string;
    notes?: string;
  }) =>
    apiRequest<OperatorShift>('/declarations/operator-change', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Tableau Hebdomadaire & Statistiques
  getWeeklyAnalytics: (params: {
    year?: number;
    week?: number;
    user_id?: number | null;
    machine_id?: number | null;
    status_type?: string | null;
  }) => {
    const q = new URLSearchParams();
    if (params.year) q.set('year', String(params.year));
    if (params.week) q.set('week', String(params.week));
    if (params.user_id) q.set('user_id', String(params.user_id));
    if (params.machine_id) q.set('machine_id', String(params.machine_id));
    if (params.status_type) q.set('status_type', params.status_type);
    return apiRequest<WeeklyAnalyticsResponse>(`/analytics/weekly?${q.toString()}`);
  },

  getExportCsvUrl: (params: {
    year?: number;
    week?: number;
    user_id?: number | null;
    machine_id?: number | null;
    status_type?: string | null;
  }) => {
    const q = new URLSearchParams();
    if (params.year) q.set('year', String(params.year));
    if (params.week) q.set('week', String(params.week));
    if (params.user_id) q.set('user_id', String(params.user_id));
    if (params.machine_id) q.set('machine_id', String(params.machine_id));
    if (params.status_type) q.set('status_type', params.status_type);
    return `/api/analytics/export-csv?${q.toString()}`;
  },
};

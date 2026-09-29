const API_BASE = '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...getAuthHeaders() },
      body: form.toString(),
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: r.statusText }));
        throw new Error(err.detail || 'Login failed');
      }
      return r.json() as Promise<{ access_token: string; user: any }>;
    });
  },
  me: () => request<any>('/auth/me'),
  updateMe: (data: any) => request<any>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
};

// Websites
export const websitesApi = {
  list: () => request<any[]>('/websites'),
  create: (data: any) => request<any>('/websites', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<any>(`/websites/${id}`),
  update: (id: string, data: any) => request<any>(`/websites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/websites/${id}`, { method: 'DELETE' }),
};

// Audits
export const auditsApi = {
  run: (data: any) => request<any>('/audits/run', { method: 'POST', body: JSON.stringify(data) }),
  listForWebsite: (websiteId: string) => request<any[]>(`/audits/website/${websiteId}`),
  get: (id: string) => request<any>(`/audits/${id}`),
};

// Keywords
export const keywordsApi = {
  create: (data: any) => request<any>('/keywords', { method: 'POST', body: JSON.stringify(data) }),
  listForWebsite: (websiteId: string) => request<any[]>(`/keywords/website/${websiteId}`),
  recordObservation: (data: any) => request<any>('/keywords/observation', { method: 'POST', body: JSON.stringify(data) }),
  importCsv: async (websiteId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch(`${API_BASE}/keywords/import-csv/${websiteId}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: form,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || 'CSV import failed');
    }
    return resp.json();
  },
};

// Optimizations
export const optimizationsApi = {
  create: (data: any) => request<any>('/optimizations', { method: 'POST', body: JSON.stringify(data) }),
  listForWebsite: (websiteId: string) => request<any[]>(`/optimizations/website/${websiteId}`),
  recordOutcome: (data: any) => request<any>('/optimizations/outcome', { method: 'POST', body: JSON.stringify(data) }),
};

// Competitors
export const competitorsApi = {
  create: (data: any) => request<any>('/competitors', { method: 'POST', body: JSON.stringify(data) }),
  listForWebsite: (websiteId: string) => request<any[]>(`/competitors/website/${websiteId}`),
  observe: (competitorId: string, pageUrl: string) =>
    request<any>(`/competitors/${competitorId}/observe?page_url=${encodeURIComponent(pageUrl)}`, { method: 'POST' }),
};

// Recommendations
export const recommendationsApi = {
  generate: (data: any) => request<any>('/recommendations/generate', { method: 'POST', body: JSON.stringify(data) }),
  listForWebsite: (websiteId: string) => request<any[]>(`/recommendations/website/${websiteId}`),
  submitFeedback: (data: any) => request<any>('/recommendations/feedback', { method: 'POST', body: JSON.stringify(data) }),
};

// Memory
export const memoryApi = {
  status: () => request<any>('/memory/status'),
  explore: (websiteId: string, query?: string, limit?: number) =>
    request<any>(`/memory/explorer/${websiteId}?q=${encodeURIComponent(query || 'SEO history')}&limit=${limit || 10}`),
};

// Agent / Memory Lab
export const agentApi = {
  memoryLabComparison: (websiteId: string, query: string) =>
    request<any>(`/agent/memory-lab-comparison?website_id=${websiteId}&user_query=${encodeURIComponent(query)}`, { method: 'POST' }),
};

// Dashboard
export const dashboardApi = {
  metrics: () => request<any>('/dashboard/metrics'),
};

// Health
export const healthApi = {
  check: () => request<any>('/health'),
};

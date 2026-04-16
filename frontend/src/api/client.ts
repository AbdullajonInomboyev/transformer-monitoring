import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Token qo'shish
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 da login sahifasiga yo'naltirish
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ============ AUTH ============
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ============ DASHBOARD ============
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  regionCapacity: () => api.get('/dashboard/region-capacity'),
  criticalTransformers: () => api.get('/dashboard/critical-transformers'),
};

// ============ REGIONS ============
export const regionsApi = {
  list: (params?: any) => api.get('/regions', { params }),
  all: () => api.get('/regions/all'),
  get: (id: string) => api.get(`/regions/${id}`),
  create: (data: any) => api.post('/regions', data),
  update: (id: string, data: any) => api.put(`/regions/${id}`, data),
  delete: (id: string) => api.delete(`/regions/${id}`),
};

// ============ DISTRICTS ============
export const districtsApi = {
  list: (params?: any) => api.get('/districts', { params }),
  byRegion: (regionId: string) => api.get(`/districts/by-region/${regionId}`),
  create: (data: any) => api.post('/districts', data),
  update: (id: string, data: any) => api.put(`/districts/${id}`, data),
  delete: (id: string) => api.delete(`/districts/${id}`),
};

// ============ SUBSTATIONS ============
export const substationsApi = {
  list: (params?: any) => api.get('/substations', { params }),
  byRegion: (regionId: string) => api.get(`/substations/by-region/${regionId}`),
  get: (id: string) => api.get(`/substations/${id}`),
  create: (data: any) => api.post('/substations', data),
  update: (id: string, data: any) => api.put(`/substations/${id}`, data),
  delete: (id: string) => api.delete(`/substations/${id}`),
};

// ============ TRANSFORMERS ============
export const transformersApi = {
  list: (params?: any) => api.get('/transformers', { params }),
  map: (params?: any) => api.get('/transformers/map', { params }),
  get: (id: string) => api.get(`/transformers/${id}`),
  create: (data: any) => api.post('/transformers', data),
  update: (id: string, data: any) => api.put(`/transformers/${id}`, data),
  delete: (id: string) => api.delete(`/transformers/${id}`),
};

// ============ ALERTS ============
export const alertsApi = {
  list: (params?: any) => api.get('/alerts', { params }),
  create: (data: any) => api.post('/alerts', data),
  resolve: (id: string) => api.patch(`/alerts/${id}/resolve`),
  delete: (id: string) => api.delete(`/alerts/${id}`),
};

// ============ MAINTENANCE ============
export const maintenanceApi = {
  list: (params?: any) => api.get('/maintenance', { params }),
  create: (data: any) => api.post('/maintenance', data),
  update: (id: string, data: any) => api.put(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
};

// ============ USERS ============
export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) => api.patch(`/users/${id}/reset-password`, { newPassword }),
};

// ============ AUDIT LOGS ============
export const auditApi = {
  list: (params?: any) => api.get("/audit-logs", { params }),
};

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

// ============================================
// SILENT REFRESH: 401 da avval tokenni yangilashga
// urinamiz, faqat u ham muvaffaqiyatsiz bo'lsa
// login sahifasiga yo'naltiramiz
// ============================================
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const processQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

const forceLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Login/refresh so'rovlarining o'zida 401 bo'lsa — qayta urinmaymiz
    const isAuthUrl = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (status === 401 && !original?._retry && !isAuthUrl) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      original._retry = true;

      if (isRefreshing) {
        // Boshqa so'rov allaqachon yangilayapti — navbatda kutamiz
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) return reject(error);
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const newToken = res.data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        processQueue(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        processQueue(null);
        forceLogout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
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
  updateMe: (data: any) => api.patch('/auth/me', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { oldPassword, newPassword }),
};

// ============ DASHBOARD ============
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  regionCapacity: () => api.get('/dashboard/region-capacity'),
  criticalTransformers: () => api.get('/dashboard/critical-transformers'),
  monthlyStats: () => api.get('/dashboard/monthly-stats'),
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

// ============ POWER POLES & LINES ============
export const powerApi = {
  getPoles: () => api.get('/power/poles'),
  createPole: (data: any) => api.post('/power/poles', data),
  updatePole: (id: string, data: any) => api.put(`/power/poles/${id}`, data),
  deletePole: (id: string) => api.delete(`/power/poles/${id}`),

  getLines: () => api.get('/power/lines'),
  createLine: (data: any) => api.post('/power/lines', data),
  deleteLine: (id: string) => api.delete(`/power/lines/${id}`),
};

// ============ METERS (HISOBLAGICHLAR) ============
export const metersApi = {
  list: (params?: any) => api.get('/meters', { params }),
  stats: () => api.get('/meters/stats'),
  byTransformer: (transformerId: string) => api.get(`/meters/by-transformer/${transformerId}`),
  get: (id: string) => api.get(`/meters/${id}`),
  create: (data: any) => api.post('/meters', data),
  update: (id: string, data: any) => api.put(`/meters/${id}`, data),
  delete: (id: string) => api.delete(`/meters/${id}`),
  readings: (id: string) => api.get(`/meters/${id}/readings`),
  addReading: (id: string, data: any) => api.post(`/meters/${id}/readings`, data),
  deleteReading: (id: string, readingId: string) => api.delete(`/meters/${id}/readings/${readingId}`),
};

// ============ INSPECTIONS (TEKSHIRUVLAR) ============
export const inspectionsApi = {
  list: (params?: any) => api.get('/inspections', { params }),
  create: (data: any) => api.post('/inspections', data),
  update: (id: string, data: any) => api.put(`/inspections/${id}`, data),
  delete: (id: string) => api.delete(`/inspections/${id}`),
};

// ============ INCIDENTS (HODISALAR) ============
export const incidentsApi = {
  list: (params?: any) => api.get('/incidents', { params }),
  create: (data: any) => api.post('/incidents', data),
  update: (id: string, data: any) => api.put(`/incidents/${id}`, data),
  delete: (id: string) => api.delete(`/incidents/${id}`),
};

// ============ WORK ORDERS (ISH BUYURTMALARI) ============
export const workOrdersApi = {
  list: (params?: any) => api.get('/work-orders', { params }),
  create: (data: any) => api.post('/work-orders', data),
  update: (id: string, data: any) => api.put(`/work-orders/${id}`, data),
  delete: (id: string) => api.delete(`/work-orders/${id}`),
};

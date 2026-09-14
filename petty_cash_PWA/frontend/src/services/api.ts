import axios from 'axios';
import { Request, Expense, Advance, CreateRequestDto, CreateAdvanceDto, ApiResponse, PaginatedResponse, RequestStatus, AdvanceStatus } from '@shared/types';
import { offlineDb } from './offlineDb';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token and user ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const userId = localStorage.getItem('userId');
    if (userId) {
      config.headers['x-user-id'] = userId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Cache key for GET requests
const cacheKey = (config: any) =>
  `${config.url}|${JSON.stringify(config.params || {})}`;

// Response interceptor: cache GETs, serve cache offline, queue mutations
api.interceptors.response.use(
  (response) => {
    const cfg: any = response.config;
    if (cfg.method === 'get') {
      offlineDb.setCache(cacheKey(cfg), response.data).catch(() => {});
    }
    return response;
  },
  async (error) => {
    const cfg: any = error.config || {};

    if (error.response?.status === 401) {
      // Token expired or invalid - only redirect if we had a token
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      if (hadToken) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Network failure (offline / server down) — no HTTP response at all
    if (!error.response && !cfg.__skipOfflineQueue) {
      // GET: serve last cached response
      if (cfg.method === 'get') {
        const cached = await offlineDb.getCache(cacheKey(cfg));
        if (cached !== undefined) {
          return { ...error, config: cfg, data: cached, status: 200, offline: true };
        }
        return Promise.reject(error);
      }

      // Mutations: queue for replay and return an optimistic response
      if (['post', 'put', 'patch', 'delete'].includes(cfg.method)) {
        await offlineDb.enqueue({
          method: cfg.method,
          url: cfg.url,
          data: cfg.data ? JSON.parse(cfg.data) : undefined,
          ts: Date.now(),
        });
        return {
          config: cfg,
          status: 202,
          offline: true,
          data: {
            success: true,
            offline: true,
            data: { id: `offline-${Date.now()}`, message: 'محفوظ محلياً — سيُرسل عند عودة الاتصال' },
            timestamp: new Date(),
          },
        };
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  getHolders: async (search?: string) => {
    const response = await api.get<ApiResponse<any[]>>('/api/auth/holders', { params: { search } });
    return response.data;
  },
  login: async (holderId: number) => {
    const response = await api.post<ApiResponse<{ token: string; user: any }>>('/api/auth/login', { holderId });
    return response.data;
  },
  register: async (email: string, password: string, name: string) => {
    const response = await api.post<ApiResponse<{ token: string; user: any }>>('/api/auth/register', { email, password, name });
    return response.data;
  },
  logout: async () => {
    const response = await api.post<ApiResponse<void>>('/api/auth/logout');
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get<ApiResponse<any>>('/api/auth/me');
    return response.data;
  },
  refreshToken: async () => {
    const response = await api.post<ApiResponse<{ token: string }>>('/api/auth/refresh');
    return response.data;
  },
};

// Requests API
export const requestsAPI = {
  getAll: async (params?: { page?: number; limit?: number; status?: RequestStatus; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Request>>>('/api/requests', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Request>>(`/api/requests/${id}`);
    return response.data;
  },
  create: async (data: CreateRequestDto) => {
    const response = await api.post<ApiResponse<Request>>('/api/requests', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateRequestDto>) => {
    const response = await api.put<ApiResponse<Request>>(`/api/requests/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: string, status: RequestStatus) => {
    const response = await api.patch<ApiResponse<Request>>(`/api/requests/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/api/requests/${id}`);
    return response.data;
  },
};

// Expenses API
export const expensesAPI = {
  getAll: async (params?: { page?: number; limit?: number; requestId?: string; categoryId?: number; vendorId?: number }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Expense>>>('/api/expenses', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Expense>>(`/api/expenses/${id}`);
    return response.data;
  },
  create: async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'requestId'>) => {
    const response = await api.post<ApiResponse<Expense>>('/api/expenses', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Expense>) => {
    const response = await api.put<ApiResponse<Expense>>(`/api/expenses/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/api/expenses/${id}`);
    return response.data;
  },
  getByRequestId: async (requestId: string) => {
    const response = await api.get<ApiResponse<Expense[]>>(`/api/expenses/request/${requestId}`);
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/expenses/categories');
    return response.data;
  },
  getVendors: async (search?: string) => {
    const response = await api.get<ApiResponse<any[]>>('/api/expenses/vendors', { params: { search } });
    return response.data;
  },
  createVendor: async (data: { name: string; vat?: string; phone?: string }) => {
    const response = await api.post<ApiResponse<any>>('/api/expenses/vendors', data);
    return response.data;
  },
  createCategory: async (data: { name: string; requireVendor?: boolean; requireAttachment?: boolean }) => {
    const response = await api.post<ApiResponse<any>>('/api/expenses/categories', data);
    return response.data;
  },
  updateCategory: async (id: number, data: { name: string; requireVendor?: boolean; requireAttachment?: boolean }) => {
    const response = await api.put<ApiResponse<any>>(`/api/expenses/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id: number) => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/api/expenses/categories/${id}`);
    return response.data;
  },
  scanReceipt: async (data: { file: string; fileName: string; requestId?: number }) => {
    const response = await api.post<ApiResponse<any>>('/api/expenses/ocr', data);
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    const response = await api.get<ApiResponse<any[]>>('/api/notifications');
    return response.data;
  },
  markRead: async (entries: string[]) => {
    const response = await api.put<ApiResponse<any>>('/api/notifications/read-all', { entries });
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get<ApiResponse<any>>('/api/notifications/settings');
    return response.data;
  },
  updateSettings: async (data: any) => {
    const response = await api.put<ApiResponse<any>>('/api/notifications/settings', data);
    return response.data;
  },
  getVapidKey: async () => {
    const response = await api.get<ApiResponse<{ publicKey: string | null }>>('/api/notifications/vapid-key');
    return response.data;
  },
  subscribe: async (subscription: PushSubscriptionJSON) => {
    const response = await api.post<ApiResponse<any>>('/api/notifications/subscribe', subscription);
    return response.data;
  },
};

// Advances API
export const advancesAPI = {
  getAll: async (params?: { page?: number; limit?: number; status?: AdvanceStatus }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Advance>>>('/api/advances', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Advance>>(`/api/advances/${id}`);
    return response.data;
  },
  create: async (data: CreateAdvanceDto) => {
    const response = await api.post<ApiResponse<Advance>>('/api/advances', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateAdvanceDto>) => {
    const response = await api.put<ApiResponse<Advance>>(`/api/advances/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: string, status: AdvanceStatus) => {
    const response = await api.patch<ApiResponse<Advance>>(`/api/advances/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/api/advances/${id}`);
    return response.data;
  },
};

export default api;

import axios from 'axios';
import { Request, Expense, Advance, CreateRequestDto, CreateAdvanceDto, ApiResponse, PaginatedResponse, RequestStatus, AdvanceStatus } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<{ token: string; user: any }>>('/api/auth/login', { email, password });
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

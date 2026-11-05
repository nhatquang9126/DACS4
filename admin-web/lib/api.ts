import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Auth helpers ----
export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuth = (token: string, user: object) => {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
};

// ---- API service functions ----

// Dashboard
export const dashboardApi = {
  getKPI: () => api.get('/admin/dashboard/kpi'),
  getUserGrowth: (weeks = 12) => api.get(`/admin/dashboard/charts/user-growth?weeks=${weeks}`),
  getStudyActivity: (days = 30) => api.get(`/admin/dashboard/charts/study-activity?days=${days}`),
};

// Users
export const usersApi = {
  list: (params: Record<string, any>) => api.get('/admin/users', { params }),
  getById: (id: number) => api.get(`/admin/users/${id}`),
  create: (data: object) => api.post('/admin/users', data),
  update: (id: number, data: object) => api.put(`/admin/users/${id}`, data),
  delete: (id: number) => api.delete(`/admin/users/${id}`),
  softDelete: (id: number) => api.delete(`/admin/users/${id}/soft`),
  toggleLock: (id: number) => api.put(`/admin/users/${id}/lock`),
  changeRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  getCascadeInfo: (id: number) => api.get(`/admin/users/${id}/cascade-info`),
};

// Courses
export const coursesApi = {
  list: (params?: Record<string, any>) => api.get('/admin/courses', { params }),
  options: () => api.get('/admin/courses/options'),
  getById: (id: number) => api.get(`/admin/courses/${id}`),
  create: (data: object) => api.post('/admin/courses', data),
  update: (id: number, data: object) => api.put(`/admin/courses/${id}`, data),
  delete: (id: number) => api.delete(`/admin/courses/${id}`),
  getCascadeInfo: (id: number) => api.get(`/admin/courses/${id}/cascade-info`),
};

// Topics
export const topicsApi = {
  list: (params?: Record<string, any>) => api.get('/admin/topics', { params }),
  byCourse: (courseId: number) => api.get(`/admin/topics-by-course/${courseId}`),
  getById: (id: number) => api.get(`/admin/topics/${id}`),
  create: (data: object) => api.post('/admin/topics', data),
  update: (id: number, data: object) => api.put(`/admin/topics/${id}`, data),
  delete: (id: number) => api.delete(`/admin/topics/${id}`),
  getCascadeInfo: (id: number) => api.get(`/admin/topics/${id}/cascade-info`),
};

// Sections
export const sectionsApi = {
  list: (params?: Record<string, any>) => api.get('/admin/sections', { params }),
  byTopic: (topicId: number) => api.get(`/admin/sections-by-topic/${topicId}`),
  create: (data: object) => api.post('/admin/sections', data),
  update: (id: number, data: object) => api.put(`/admin/sections/${id}`, data),
  delete: (id: number) => api.delete(`/admin/sections/${id}`),
};

// Materials
export const materialsApi = {
  list: (params?: Record<string, any>) => api.get('/admin/materials', { params }),
  getById: (id: number) => api.get(`/admin/materials/${id}`),
  create: (data: object) => api.post('/admin/materials', data),
  update: (id: number, data: object) => api.put(`/admin/materials/${id}`, data),
  delete: (id: number) => api.delete(`/admin/materials/${id}`),
};

// Quizzes
export const quizzesApi = {
  list: (params?: Record<string, any>) => api.get('/admin/quizzes', { params }),
  getById: (id: number) => api.get(`/admin/quizzes/${id}`),
  create: (data: object) => api.post('/admin/quizzes', data),
  update: (id: number, data: object) => api.put(`/admin/quizzes/${id}`, data),
  delete: (id: number) => api.delete(`/admin/quizzes/${id}`),
};

// Questions
export const questionsApi = {
  list: (params?: Record<string, any>) => api.get('/admin/questions', { params }),
  create: (data: object) => api.post('/admin/questions', data),
  update: (id: number, data: object) => api.put(`/admin/questions/${id}`, data),
  delete: (id: number) => api.delete(`/admin/questions/${id}`),
};

// AI Monitor
export const aiMonitorApi = {
  health: () => api.get('/admin/ai-monitor/health'),
  stats: (days = 30) => api.get(`/admin/ai-monitor/stats?days=${days}`),
  configs: () => api.get('/admin/ai-monitor/config'),
  updateConfig: (key: string, value: string) => api.put(`/admin/ai-monitor/config/${key}`, { value }),
};

// Audit Logs
export const auditLogsApi = {
  list: (params?: Record<string, any>) => api.get('/admin/audit-logs', { params }),
  getById: (id: number) => api.get(`/admin/audit-logs/${id}`),
};

// Notifications
export const notificationsApi = {
  list: (params?: Record<string, any>) => api.get('/admin/notifications', { params }),
  unreadCount: () => api.get('/admin/notifications/unread-count'),
  markAsRead: (id: number) => api.patch(`/admin/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/admin/notifications/read-all'),
  create: (data: object) => api.post('/admin/notifications', data),
  update: (id: number, data: object) => api.put(`/admin/notifications/${id}`, data),
  delete: (id: number) => api.delete(`/admin/notifications/${id}`),
  publish: (id: number) => api.post(`/admin/notifications/${id}/publish`),
};

// Auth API
export const authApi = {
  logout: () => api.post('/auth/logout'),
};

// System
export const systemApi = {
  health: () => api.get('/admin/system/health'),
  backup: () => api.post('/admin/system/backup', {}, { responseType: 'blob' }),
};

// Analytics (legacy)
export const analyticsApi = {
  getOverview: () => api.get('/admin/analytics'),
  getStudents: () => api.get('/admin/students'),
};


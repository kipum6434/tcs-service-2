import axios from 'axios';

const API = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://tcs-service-production.up.railway.app' });

API.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

API.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;

// ── Types ─────────────────────────────────────────────────────────────
export type TicketStatus   = 'new'|'assigned'|'in_progress'|'waiting'|'done'|'closed'|'cancelled';
export type TicketPriority = 'low'|'medium'|'high'|'critical';
export type UserRole = 'admin'|'manager'|'customer_service'|'document_staff'|'service_team'|'technician'|'viewer';

export interface User { id: number; name: string; email: string; role: UserRole; department?: string; }
export interface Customer { id: number; name: string; phone: string; email?: string; }
export interface Site { id: number; customer_id: number; address: string; system_size_kw?: number; }
export interface Category { id: number; name: string; sla_hours: number; }

export interface Ticket {
  id: number; ticket_number: string; title: string; description: string;
  status: TicketStatus; priority: TicketPriority;
  customer_name: string; customer_phone: string;
  owner_name?: string; owner_id?: number;
  category_name: string; category_id: number;
  department_name?: string;
  due_date: string; sla_deadline: string;
  is_overdue_live: boolean;
  created_at: string; updated_at: string;
  done_note?: string; internal_note?: string;
  site_address?: string; system_size_kw?: number;
}

export interface Comment {
  id: number; ticket_id: number; user_id: number; user_name: string;
  content: string; is_internal: boolean; created_at: string;
}

// ── API calls ─────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    API.post('/api/auth/login', { email, password }).then(r => r.data),
  me: () => API.get('/api/auth/me').then(r => r.data),
};

export const ticketsApi = {
  list: (params?: Record<string, unknown>) =>
    API.get('/api/tickets', { params }).then(r => r.data),
  get: (id: number) => API.get(`/api/tickets/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    API.post('/api/tickets', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    API.patch(`/api/tickets/${id}`, data).then(r => r.data),
  assign: (id: number, owner_id: number, department_id: number) =>
    API.post(`/api/tickets/${id}/assign`, { owner_id, department_id }).then(r => r.data),
  changeStatus: (id: number, data: Record<string, unknown>) =>
    API.post(`/api/tickets/${id}/status`, data).then(r => r.data),
  comments: (id: number) => API.get(`/api/tickets/${id}/comments`).then(r => r.data),
  addComment: (id: number, content: string, is_internal = false) =>
    API.post(`/api/tickets/${id}/comments`, { content, is_internal }).then(r => r.data),
  logs: (id: number) => API.get(`/api/tickets/${id}/logs`).then(r => r.data),
  dashboard: () => API.get('/api/tickets/dashboard').then(r => r.data),
  categories: () => API.get('/api/tickets/categories').then(r => r.data),
};

export const customersApi = {
  list: (search?: string) => API.get('/api/customers', { params: { search } }).then(r => r.data),
  get: (id: number) => API.get(`/api/customers/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    API.post('/api/customers', data).then(r => r.data),
};

export const usersApi = {
  list: () => API.get('/api/users').then(r => r.data),
  departments: () => API.get('/api/users/departments').then(r => r.data),
};

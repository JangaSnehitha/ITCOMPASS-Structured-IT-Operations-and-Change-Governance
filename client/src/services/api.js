import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Auth
export const login = (username, password) => api.post('/auth/login', { username, password });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const registerUser = (data) => api.post('/auth/register', data);

// Change Requests
export const getRequests = () => api.get('/requests');
export const getRequest = (id) => api.get(`/requests/${id}`);
export const createRequest = (data) => api.post('/requests', data);
export const updateRequest = (id, data) => api.put(`/requests/${id}`, data);
export const cancelRequest = (id, reason) => api.delete(`/requests/${id}`, { data: { reason } });
export const getRequestAudit = (id) => api.get(`/requests/${id}/audit`);
export const getRequestApprovals = (id) => api.get(`/requests/${id}/approvals`);

// Approvals
export const approveRequest = (id, comment) => api.post(`/approvals/${id}/approve`, { comment });
export const rejectRequest = (id, reason) => api.post(`/approvals/${id}/reject`, { reason });

// Services
export const getServices = () => api.get('/services');
export const createService = (data) => api.post('/services', data);

// Users
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);

// Notifications
export const getNotifications = () => api.get('/notifications');
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotifRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');

// Implementations
export const getImplementations = () => api.get('/implementations');
export const startImplementation = (data) => api.post('/implementations', data);
export const completeImplementation = (id, data) => api.patch(`/implementations/${id}/complete`, data);
export const rollbackRequest = (requestId, notes) => api.post(`/implementations/${requestId}/rollback`, { notes });

// Stats
export const getDashboardStats = () => api.get('/stats/dashboard');
export const getAuditLog = () => api.get('/stats/audit');

export default api;

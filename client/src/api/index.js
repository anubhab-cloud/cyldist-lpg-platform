import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
};

export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  addAddress: (data) => api.post('/users/me/addresses', data),
  removeAddress: (id) => api.delete(`/users/me/addresses/${id}`),
  setDutyStatus: (isOnDuty) => api.patch('/users/me/duty-status', { isOnDuty }),
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  changeRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  toggleActive: (id, isActive) => api.patch(`/users/${id}/active`, { isActive }),
  getAvailableAgents: () => api.get('/users/available-agents'),
};

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  list: (params) => api.get('/orders', { params }),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  assignAgent: (orderId, data) => api.patch(`/orders/${orderId}/assign`, data),
  updateStatus: (orderId, data) => api.patch(`/orders/${orderId}/status`, data),
  cancel: (orderId, reason) => api.delete(`/orders/${orderId}`, { data: { reason } }),
};

export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  getLowStock: () => api.get('/inventory/low-stock'),
};

export const deliveryAPI = {
  getLocation: (orderId) => api.get(`/delivery/${orderId}/location`),
  getRoute: (orderId) => api.get(`/delivery/${orderId}/route`),
};

export const chatAPI = {
  getMessages: (roomId, params) => api.get(`/chat/${roomId}/messages`, { params }),
  sendMessage: (roomId, content) => api.post(`/chat/${roomId}/messages`, { content }),
  markRead: (roomId) => api.patch(`/chat/${roomId}/read`),
  getUnread: (roomId) => api.get(`/chat/${roomId}/unread`),
};

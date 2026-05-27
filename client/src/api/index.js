import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  requestOtp: (data) => api.post('/auth/request-otp', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
};

export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  submitKyc: (data) => api.post('/users/me/kyc', data),
  addWalletFunds: (amount) => api.post('/users/me/wallet/add', { amount }),
  depositWallet: (amount) => api.post('/users/me/wallet/deposit', { amount }),
  verifyWallet: (data) => api.post('/users/me/wallet/verify', data),
  addAddress: (data) => api.post('/users/me/addresses', data),
  removeAddress: (id) => api.delete(`/users/me/addresses/${id}`),
  setDutyStatus: (isOnDuty) => api.patch('/users/me/duty-status', { isOnDuty }),
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  changeRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  toggleActive: (id, isActive) => api.patch(`/users/${id}/active`, { isActive }),
  getAvailableAgents: () => api.get('/users/available-agents'),
  getPendingKyc: () => api.get('/users/kyc/pending'),
  updateKycStatus: (id, status) => api.patch(`/users/${id}/kyc-status`, { status }),
  getAgentsPerformance: () => api.get('/users/agents/performance'),
};

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  list: (params) => api.get('/orders', { params }),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  assignAgent: (orderId, data) => api.patch(`/orders/${orderId}/assign`, data),
  updateStatus: (orderId, data) => api.patch(`/orders/${orderId}/status`, data),
  cancel: (orderId, reason) => api.delete(`/orders/${orderId}`, { data: { reason } }),
  reject: (orderId, reason) => api.delete(`/orders/${orderId}/reject`, { data: { reason } }),
  setPriority: (orderId, data) => api.patch(`/orders/${orderId}/priority`, typeof data === 'string' ? { priority: data } : data),
  partialDeliver: (orderId, data) => api.patch(`/orders/${orderId}/status`, data),
  verifyPayment: (orderId, data) => api.post(`/orders/${orderId}/verify-payment`, data),
};

export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  getLowStock: () => api.get('/inventory/low-stock'),
  // Crisis mode (admin-controlled)
  getCrisisMode: () => api.get('/inventory/crisis-mode'),
  setCrisisMode: (data) => api.patch('/inventory/crisis-mode', data),
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

export const supportAPI = {
  createComplaint: (data) => api.post('/support/complaints', data),
  getComplaints: (params) => api.get('/support/complaints', { params }),
  getComplaintById: (id) => api.get(`/support/complaints/${id}`),
  updateComplaint: (id, data) => api.patch(`/support/complaints/${id}`, data),
};

export const notificationsAPI = {
  broadcast: (data) => api.post('/notifications/broadcast', data),
  getAdminNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const productsAPI = {
  list: () => api.get('/products'),
};

export const couponsAPI = {
  getActive: () => api.get('/coupons/active'),
};

export const crisisAPI = {
  // Admin
  getPool:      ()         => api.get('/crisis/pool'),
  getLeaderboard: (batchId) => api.get('/crisis/leaderboard', { params: batchId ? { batchId } : {} }),
  runBatch:     ()         => api.post('/crisis/batch/run'),
  getBatchStatus: ()       => api.get('/crisis/batch/status'),
  updateConfig: (data)     => api.patch('/crisis/batch/config', data),
  // Customer
  getMyStatus:  ()         => api.get('/crisis/my-status'),
};


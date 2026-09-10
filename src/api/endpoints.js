import { api, unwrap } from './client.js';

export const authApi = {
  login: (login, password) => api.post('/auth/login', { login, password }).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }).then(unwrap),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary').then(unwrap),
  incidents: (days = 7) => api.get('/dashboard/incidents', { params: { days } }).then(unwrap),
  services: () => api.get('/dashboard/services').then(unwrap),
  activity: (limit = 12) => api.get('/dashboard/activity', { params: { limit } }).then(unwrap),
};

export const guardApi = {
  list: (params = {}) => api.get('/guards', { params }).then(unwrap),
  get: (id) => api.get(`/guards/${id}`).then(unwrap),
  create: (payload) => api.post('/guards', payload).then(unwrap),
  update: (id, payload) => api.put(`/guards/${id}`, payload).then(unwrap),
  status: (id, active) => api.patch(`/guards/${id}/status`, { active }).then(unwrap),
  photo: async (id, file) => {
    const body = new FormData();
    body.append('photo', file);
    return api.patch(`/guards/${id}/photo`, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap);
  },
};

export const serviceApi = {
  guardIndex: (params = {}) => api.get('/services/guards', { params }).then(unwrap),
  list: (params = {}) => api.get('/services', { params }).then(unwrap),
  active: () => api.get('/services/active').then(unwrap),
  get: (id) => api.get(`/services/${id}`).then(unwrap),
  route: (id) => api.get(`/services/${id}/route`).then(unwrap),
};

export const locationApi = {
  current: () => api.get('/locations/current').then(unwrap),
};

export const incidentApi = {
  list: (params = {}) => api.get('/incidents', { params }).then(unwrap),
  get: (id) => api.get(`/incidents/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/incidents/${id}`, payload).then(unwrap),
  status: (id, payload) => api.patch(`/incidents/${id}/status`, payload).then(unwrap),
};

export const patrolApi = {
  list: () => api.get('/patrols').then(unwrap),
  get: (id) => api.get(`/patrols/${id}`).then(unwrap),
  create: (payload) => api.post('/patrols', payload).then(unwrap),
  update: (id, payload) => api.put(`/patrols/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/patrols/${id}`).then(unwrap),
};

export const reportApi = {
  guards: (params = {}) => api.get('/reports/guards', { params }).then(unwrap),
  incidents: (params = {}) => api.get('/reports/incidents', { params }).then(unwrap),
  services: (params = {}) => api.get('/reports/services', { params }).then(unwrap),
  routes: (params = {}) => api.get('/reports/routes', { params }).then(unwrap),
};

export const catalogApi = {
  roles: () => api.get('/roles').then(unwrap),
  zones: () => api.get('/zones').then(unwrap),
  createZone: (payload) => api.post('/zones', payload).then(unwrap),
  updateZone: (id, payload) => api.put(`/zones/${id}`, payload).then(unwrap),
  incidentTypes: () => api.get('/incident-types').then(unwrap),
  createIncidentType: (payload) => api.post('/incident-types', payload).then(unwrap),
  updateIncidentType: (id, payload) => api.put(`/incident-types/${id}`, payload).then(unwrap),
  settings: () => api.get('/settings').then(unwrap),
  updateSetting: (key, payload) => api.put(`/settings/${key}`, payload).then(unwrap),
};

export const userApi = {
  list: () => api.get('/users').then(unwrap),
  create: (payload) => api.post('/users', payload).then(unwrap),
  update: (id, payload) => api.put(`/users/${id}`, payload).then(unwrap),
  photo: async (id, file) => {
    const body = new FormData();
    body.append('photo', file);
    return api.patch(`/users/${id}/photo`, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap);
  },
};

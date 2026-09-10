import axios from 'axios';
import { tokenStorage } from '../lib/storage.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
  const payload = response.data?.data;
  tokenStorage.set(payload);
  return payload.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry && tokenStorage.getRefresh()) {
      original._retry = true;
      try {
        refreshing ||= refreshAccessToken().finally(() => {
          refreshing = null;
        });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        tokenStorage.clear();
        window.dispatchEvent(new Event('sc-cbba-auth-expired'));
      }
    }
    return Promise.reject(error);
  },
);

export function unwrap(response) {
  return response.data?.data;
}

export function apiError(error) {
  return error.response?.data?.message || error.message || 'Ocurrió un error inesperado';
}

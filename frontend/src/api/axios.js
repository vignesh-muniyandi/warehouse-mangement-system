import axios from 'axios';

const rawBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const normalizedBase = rawBase.endsWith('/api') ? rawBase : rawBase.replace(/\/$/, '') + '/api';
const api = axios.create({
  baseURL: normalizedBase,
  withCredentials: true,
});

export const getSocketBaseUrl = () => process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';

if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use((request) => {
    console.debug('[API] request', request.method, request.baseURL + request.url, request.headers.Authorization ? 'AUTH' : 'NO_AUTH');
    return request;
  });

  api.interceptors.response.use(
    (response) => {
      console.debug('[API] response', response.config.url, response.status, response.data);
      return response;
    },
    (error) => {
      console.error('[API] error', error.config?.url, error.response?.status, error.response?.data || error.message);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
      if (error.response?.status === 403) {
        window.dispatchEvent(new CustomEvent('permission-denied', {
          detail: error.response?.data?.message || 'Permission denied',
        }));
      }
      return Promise.reject(error);
    }
  );
} else {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
      if (error.response?.status === 403) {
        window.dispatchEvent(new CustomEvent('permission-denied', {
          detail: error.response?.data?.message || 'Permission denied',
        }));
      }
      return Promise.reject(error);
    }
  );
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export default api;

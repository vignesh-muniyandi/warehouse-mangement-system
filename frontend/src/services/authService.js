import axios from 'axios';

const rawBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : rawBase.replace(/\/$/, '') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const registerUser = (payload) => api.post('/auth/register', payload);
export const loginUser = (payload) => api.post('/auth/login', payload);
export const getProfile = () => api.get('/auth/me');

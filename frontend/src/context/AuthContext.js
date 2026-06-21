import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const response = await api.get('/auth/me');
          if (response.data.success) {
            const userValue = response.data.user || response.data.data?.user || null;
            setUser(userValue);
            localStorage.setItem('user', JSON.stringify(userValue));
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (err) {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const tokenValue = response.data.token || response.data.data?.token;
        const tokenPayload = decodeJwtPayload(tokenValue) || {};
        const userFromResp = response.data.user || response.data.data?.user || {};
        const userValue = { ...userFromResp, permissions: tokenPayload.permissions || userFromResp.permissions || [] };
        setToken(tokenValue);
        setAuthToken(tokenValue);
        setUser(userValue);
        setIsAuthenticated(true);
        localStorage.setItem('token', tokenValue);
        localStorage.setItem('user', JSON.stringify(userValue));
        return userValue;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout errors
    }
    setToken(null);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

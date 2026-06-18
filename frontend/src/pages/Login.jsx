import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleRouteMap, roleIdRouteMap } from '../hooks/usePermission';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      return setError('Please enter username and password');
    }
    try {
      setLoading(true);
      const user = await login(form.email, form.password);
      navigate(roleIdRouteMap[user?.role_id] || roleRouteMap[user?.role_name] || '/admin');
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your account</p>
        {error && <div className="error-alert">{error}</div>}
        <form onSubmit={handleSubmit} className="form-group">
          <div>
            <label className="label">Username / Email / User ID</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="manager, manager@wms.example.com, or 2"
              type="text"
              className="auth-input"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              type="password"
              className="auth-input"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <a href="/register" className="auth-link">
            Register here
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;

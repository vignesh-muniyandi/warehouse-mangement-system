import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';

const Register = () => {
  const [form, setForm] = useState({ fullname: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.fullname || !form.email || !form.password || !form.confirmPassword) {
      return setError('Please fill all fields');
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    try {
      setLoading(true);
      // Split fullname into first_name and last_name
      const [first_name, ...lastNameParts] = form.fullname.trim().split(' ');
      const last_name = lastNameParts.join(' ') || first_name;
      
      const response = await registerUser({
        first_name,
        last_name,
        email: form.email,
        password: form.password,
        role_id: 3, // Worker/Operator
      });
      if (response.data.success) {
        setSuccess('Registration successful. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join us today</p>
        {error && <div className="error-alert">{error}</div>}
        {success && <div className="success-alert">{success}</div>}
        <form onSubmit={handleSubmit} className="form-group">
          <div>
            <label className="label">Full Name</label>
            <input
              name="fullname"
              value={form.fullname}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="auth-input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              type="email"
              className="auth-input"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password (min 8 characters)"
              type="password"
              className="auth-input"
            />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              type="password"
              className="auth-input"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <a href="/login" className="auth-link">
            Sign in here
          </a>
        </div>
      </div>
    </div>
  );
};

export default Register;

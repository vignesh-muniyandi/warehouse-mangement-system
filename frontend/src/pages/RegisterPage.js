import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validatePassword = (value) => /^(?=.*\d).{8,}$/.test(value);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setError('Please complete all required fields.');
      return;
    }
    if (!validateEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(form.password)) {
      setError('Password must be at least 8 characters long and include a number.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', form);
      if (response.data.success) {
        setSuccess('Registration successful. You can now login.');
        setForm({ first_name: '', last_name: '', email: '', password: '', phone: '' });
        setTimeout(() => navigate('/login'), 1400);
      } else {
        setError(response.data.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <Card sx={{ minWidth: 380, p: 2 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Create an Account
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField label="First Name" value={form.first_name} fullWidth margin="normal" onChange={handleChange('first_name')} />
            <TextField label="Last Name" value={form.last_name} fullWidth margin="normal" onChange={handleChange('last_name')} />
            <TextField label="Email" value={form.email} fullWidth margin="normal" onChange={handleChange('email')} />
            <TextField label="Phone" value={form.phone} fullWidth margin="normal" onChange={handleChange('phone')} />
            <TextField label="Password" type="password" value={form.password} fullWidth margin="normal" onChange={handleChange('password')} />
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link to="/login">Already have an account? Login</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

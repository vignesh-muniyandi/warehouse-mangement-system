import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert } from '@mui/material';
import { useLocation, Link } from 'react-router-dom';
import api from '../api/axios';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPasswordPage() {
  const query = useQuery();
  const token = query.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!newPassword) {
      setError('New password is required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { token, new_password: newPassword });
      if (response.data.success) {
        setMessage(response.data.message);
      } else {
        setError(response.data.message || 'Unable to reset password');
      }
    } catch (err) {
      setError('Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#f5f6fa' }}>
      <Card sx={{ width: 380, p: 2 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Reset Password
          </Typography>
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              fullWidth
              margin="normal"
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              fullWidth
              margin="normal"
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link to="/login">Back to sign in</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

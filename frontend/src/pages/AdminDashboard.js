import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Welcome back, {user?.first_name}.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">System-wide KPIs</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Real-time inventory status, order throughput, and performance metrics.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">User Management</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Create, edit, or deactivate user accounts and manage role assignments.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Settings & Audit</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Configure warehouses, view audit logs, and control system settings.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

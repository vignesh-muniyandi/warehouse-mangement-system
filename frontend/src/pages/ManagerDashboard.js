import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function ManagerDashboard() {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Operations Dashboard
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Welcome, {user?.first_name}. Manage inventory, orders, and task assignments.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Inventory Overview</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Monitor stock levels, low inventory alerts, and replenishment status.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Order Tracking</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Review incoming and outgoing orders with real-time processing details.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Task Assignment</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Assign tasks and review staff performance metrics quickly.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

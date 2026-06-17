import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function DeliveryDashboard() {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Deliveries
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Hi, {user?.first_name}. Manage shipments and confirm deliveries with ease.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Shipment Queue</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Review assigned routes and upcoming dispatches in one place.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Delivery Status</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Update shipment progress and confirm completed deliveries quickly.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Routes</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Access your assigned routes, tracking updates, and delivery confirmations.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

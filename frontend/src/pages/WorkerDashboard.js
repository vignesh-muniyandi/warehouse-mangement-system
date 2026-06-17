import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function WorkerDashboard() {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Tasks
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Hello, {user?.first_name}. Review your task queue and complete warehouse operations.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Task List</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                See your assigned picks, packs, and scans in a simplified mobile-friendly view.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Scan Interface</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Quickly capture barcodes, complete putaway actions, and update inventory status.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Pack Station</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Mark completed work and move orders forward with a single tap experience.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

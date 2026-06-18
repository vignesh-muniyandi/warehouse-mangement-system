import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import api from '../api/axios';

export default function DeliveryDashboard() {
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    api.get('/delivery/dashboard').then((r) => setKpis(r.data.data || {})).catch(() => {});
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1 }}>
        <Navbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Delivery Dashboard</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Assigned" value={kpis.assigned_shipments} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Pending" value={kpis.pending_deliveries} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Out For" value={kpis.out_for_delivery} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Delivered" value={kpis.delivered_today} /></Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}

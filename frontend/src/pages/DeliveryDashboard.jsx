import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper, Chip } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import api from '../api/axios';
import ShipmentTable from '../components/ShipmentTable';
import useDeliverySocket from '../hooks/useDeliverySocket';
import { useAuth } from '../context/AuthContext';

export default function DeliveryDashboard() {
  const { token } = useAuth();
  const [kpis, setKpis] = useState({});
  const [shipments, setShipments] = useState([]);
  const { connected, events } = useDeliverySocket(token);

  useEffect(() => {
    api.get('/delivery/dashboard').then((r) => setKpis(r.data.data || {})).catch(() => {});
    api.get('/delivery/shipments').then((r) => setShipments(r.data.data || [])).catch(() => setShipments([]));
  }, []);

  useEffect(() => {
    if (events.kpis) {
      setKpis(events.kpis);
    }
    if (events.shipments) {
      setShipments(events.shipments);
    }
  }, [events]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1 }}>
        <Topbar />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">Delivery Dashboard</Typography>
            <Chip label={connected ? 'Live' : 'Disconnected'} color={connected ? 'success' : 'default'} size="small" />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Assigned" value={kpis.assigned_shipments} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Pending" value={kpis.pending_deliveries} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Out For" value={kpis.out_for_delivery} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Delivered" value={kpis.delivered_today} /></Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Recent Shipments</Typography>
            <Paper sx={{ p: 2 }}>
              <ShipmentTable rows={shipments.slice(0, 20)} />
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

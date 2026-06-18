import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Sidebar from '../components/Sidebar';
import ShipmentTable from '../components/ShipmentTable';
import api from '../api/axios';

export default function Shipments() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get('/delivery/shipments').then((r) => setRows(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Assigned Shipments</Typography>
        <Paper sx={{ mt: 2 }}>
          <ShipmentTable rows={rows} />
        </Paper>
      </Box>
    </Box>
  );
}

import React from 'react';
import { Box, Typography } from '@mui/material';
import Sidebar from '../components/Sidebar';

export default function ReportsDelivery() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Delivery Reports (placeholder)</Typography>
      </Box>
    </Box>
  );
}

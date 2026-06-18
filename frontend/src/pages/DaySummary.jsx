import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function DaySummary() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/delivery/day-summary').then((r) => setSummary(r.data.data)).catch(() => {});
  }, []);

  if (!summary) return (<Box sx={{ display: 'flex' }}><Sidebar /><Box sx={{ p: 3 }}>Loading...</Box></Box>);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Day Summary</Typography>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography>Total Deliveries: {summary.total}</Typography>
          <Typography>Delivered: {summary.delivered}</Typography>
          <Typography>Failed: {summary.failed}</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.alert('Submit day report (placeholder)')}>Submit Day Report</Button>
        </Paper>
      </Box>
    </Box>
  );
}

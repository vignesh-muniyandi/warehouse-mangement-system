import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function Reports() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/reports/worker_productivity')
      .then((r) => setRows(r.data.data || []))
      .catch(() => setRows([]));
  }, []);

  const exportCsv = (type) => {
    window.location.href = `/api/reports/${type}/export?format=csv`;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff7ed' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: '#9a3412', fontWeight: 800 }}>Reports & Performance</Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<></>} onClick={() => exportCsv('worker_productivity')}>Export CSV</Button>
            <Button variant="outlined" onClick={() => exportCsv('task_performance')}>Export Tasks</Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">Recent Report Rows (sample)</Typography>
          {rows.length ? rows.slice(0, 20).map((r, idx) => (
            <Paper key={idx} sx={{ p: 1, mt: 1 }}>{JSON.stringify(r)}</Paper>
          )) : <Typography sx={{ mt: 1 }}>No report data available</Typography>}
        </Paper>
      </Box>
    </Box>
  );
}

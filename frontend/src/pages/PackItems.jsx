import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Stack, Alert } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function PackItems() {
  const [list, setList] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/packing/list')
      .then((r) => setList(r.data.data || []))
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to load pack list';
        setMessage(msg);
      });
  }, []);

  const completePack = async (id) => {
    try {
      await api.patch('/packing/complete', { id });
      setList((s) => s.filter((i) => i.task_id !== id));
      setMessage('Pack completed');
    } catch (err) {
      setMessage('Failed to mark packed');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff7ed' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: '#9a3412', fontWeight: 800 }}>Pack Items</Typography>
        {message && <Alert sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={{ p: 2 }}>
          {list.length ? list.map((t) => (
            <Paper key={t.task_id} sx={{ p: 1, mt: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography sx={{ fontWeight: 800 }}>{t.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.notes}</Typography>
                </div>
                <Button variant="contained" sx={{ bgcolor: '#f97316' }} onClick={() => completePack(t.task_id)}>Complete</Button>
              </Stack>
            </Paper>
          )) : <Typography>No pack items</Typography>}
        </Paper>
      </Box>
    </Box>
  );
}

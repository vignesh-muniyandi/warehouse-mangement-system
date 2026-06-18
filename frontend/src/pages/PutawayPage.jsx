import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack, TextField, Button, Alert } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function PutawayPage() {
  const [items, setItems] = useState([]);
  const [location, setLocation] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/putaway/items')
      .then((r) => setItems(r.data.data || []))
      .catch((err) => setMessage(err.response?.data?.message || 'Failed to load items'));
  }, []);

  const scanLocation = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/putaway/location-scan', { location_code: location });
      setMessage(`${res.data.data.location_code} validated`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Invalid location');
    }
  };

  const confirmPutaway = async (itemId) => {
    try {
      await api.patch('/putaway/confirm', { task_id: itemId, location_code: location });
      setItems((s) => s.filter((i) => i.task_id !== itemId));
      setMessage('Putaway confirmed');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to confirm');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff7ed' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: '#9a3412', fontWeight: 800 }}>Putaway</Typography>
        {message && <Alert sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Scan / Enter Location</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }} component="form" onSubmit={scanLocation}>
            <TextField value={location} onChange={(e) => setLocation(e.target.value.toUpperCase())} placeholder="BIN-A1" required />
            <Button type="submit" variant="contained" sx={{ bgcolor: '#f97316' }}>Validate</Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">Received Items</Typography>
          {items.length ? items.map((it) => (
            <Paper key={it.task_id} sx={{ p: 1, mt: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography sx={{ fontWeight: 800 }}>{it.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{it.notes}</Typography>
                </div>
                <Button variant="contained" sx={{ bgcolor: '#f97316' }} onClick={() => confirmPutaway(it.task_id)}>Putaway</Button>
              </Stack>
            </Paper>
          )) : <Typography sx={{ mt: 1 }}>No items to putaway</Typography>}
        </Paper>
      </Box>
    </Box>
  );
}

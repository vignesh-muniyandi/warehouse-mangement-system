import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function CollectShipment() {
  const [shipmentId, setShipmentId] = useState('');
  const [message, setMessage] = useState('');

  const handleCollect = async () => {
    try {
      await api.post('/delivery/collect', { order_id: Number(shipmentId) });
      setMessage('Collected');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to collect');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Collect Shipment</Typography>
        {message && <Alert sx={{ mt: 2 }}>{message}</Alert>}
        <TextField label="Order ID" value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} sx={{ mt: 2 }} />
        <Button variant="contained" sx={{ mt: 2 }} onClick={handleCollect}>Collect</Button>
      </Box>
    </Box>
  );
}

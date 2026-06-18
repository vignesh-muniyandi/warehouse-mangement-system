import React, { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import Sidebar from '../components/Sidebar';
import PODUploader from '../components/PODUploader';
import api from '../api/axios';

export default function DeliveryConfirmation() {
  const [shipmentId, setShipmentId] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (formData) => {
    try {
      await api.post('/delivery/proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStatus('Uploaded');
    } catch (err) {
      setStatus('Upload failed');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Delivery Confirmation</Typography>
        <PODUploader onSubmit={handleSubmit} />
        {status && <Typography sx={{ mt: 2 }}>{status}</Typography>}
      </Box>
    </Box>
  );
}

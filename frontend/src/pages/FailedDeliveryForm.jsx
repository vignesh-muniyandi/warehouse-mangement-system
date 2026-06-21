import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

const reasons = ['Customer Not Found','Address Not Found','Customer Refused','Other'];

export default function FailedDeliveryForm() {
  const [shipmentId, setShipmentId] = useState('');
  const [reason, setReason] = useState(reasons[0]);
  const [notes, setNotes] = useState('');

  const submit = async () => {
    await api.post('/delivery/failed', { order_id: Number(shipmentId), reason, notes });
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Record Failed Delivery</Typography>
        <TextField label="Order ID" value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} sx={{ mt: 2 }} />
        <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 2 }}>
          {reasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} multiline rows={4} />
        <Button variant="contained" sx={{ mt: 2 }} onClick={submit}>Submit</Button>
      </Box>
    </Box>
  );
}

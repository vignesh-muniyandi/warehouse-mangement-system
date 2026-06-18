import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import { useParams } from 'react-router-dom';

export default function ShipmentDetails() {
  const { id } = useParams();
  const [shipment, setShipment] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!id) return;
    api.get(`/delivery/shipment/${id}`).then((r) => {
      setShipment(r.data.data.shipment);
      setItems(r.data.data.items || []);
    }).catch(() => {});
  }, [id]);

  if (!shipment) return (<Box sx={{ display: 'flex' }}><Sidebar /><Box sx={{ p: 3 }}>Loading...</Box></Box>);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Shipment {shipment.shipment_id}</Typography>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1">Customer</Typography>
          <Typography>{shipment.customer_name} — {shipment.phone}</Typography>
          <Typography>{shipment.address}</Typography>
        </Paper>

        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1">Items</Typography>
          {items.map((it) => (
            <Box key={it.id} sx={{ p: 1 }}>{it.product_id} — qty: {it.quantity}</Box>
          ))}
        </Paper>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={async () => {
            await api.post('/delivery/collect', { shipment_id: shipment.shipment_id });
            window.location.reload();
          }}>Collect</Button>
          <Button variant="outlined" onClick={async () => {
            await api.post('/delivery/dispatch', { shipment_ids: [shipment.shipment_id] });
            window.location.reload();
          }}>Dispatch</Button>
        </Stack>
      </Box>
    </Box>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Button, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import Sidebar from '../components/Sidebar';
import RouteMap from '../components/RouteMap';
import api from '../api/axios';

export default function RouteTracking() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState('');
  const [position, setPosition] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [trackingStatus, setTrackingStatus] = useState('idle');
  const watchIdRef = useRef(null);

  useEffect(() => {
    api.get('/delivery/shipments')
      .then((r) => setShipments(r.data.data || []))
      .catch(() => setShipments([]));
  }, []);

  useEffect(() => {
    if (!selectedShipment) return;
    api.get(`/delivery/tracking/${selectedShipment}`)
      .then((r) => setTrackingHistory(r.data.data || []))
      .catch(() => setTrackingHistory([]));
  }, [selectedShipment]);

  const startTracking = () => {
    if (!selectedShipment || !navigator.geolocation) return;
    setTrackingStatus('tracking');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        api.post('/delivery/location', { shipment_id: selectedShipment, latitude: lat, longitude: lng }).catch(() => {});
      },
      (err) => {
        console.error(err);
        setTrackingStatus('error');
      },
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setTrackingStatus('stopped');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Route Tracking</Typography>
        <Paper sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel id="shipment-select-label">Shipment</InputLabel>
              <Select
                labelId="shipment-select-label"
                value={selectedShipment}
                label="Shipment"
                onChange={(event) => setSelectedShipment(event.target.value)}
              >
                <MenuItem value="">Select a shipment</MenuItem>
                {shipments.map((shipment) => (
                  <MenuItem key={shipment.shipment_id} value={shipment.shipment_id}>
                    {`#${shipment.shipment_id} — ${shipment.customer_name}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={startTracking} disabled={!selectedShipment || trackingStatus === 'tracking'}>
              Start Tracking
            </Button>
            <Button variant="outlined" onClick={stopTracking} disabled={trackingStatus !== 'tracking'}>
              Stop Tracking
            </Button>
          </Stack>
          <RouteMap position={position} trackingPoints={trackingHistory} />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            {trackingStatus === 'tracking' ? 'Tracking in progress...' : trackingStatus === 'stopped' ? 'Tracking stopped.' : 'Choose a shipment and start tracking to stream location updates.'}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import Sidebar from '../components/Sidebar';
import RouteMap from '../components/RouteMap';
import api from '../api/axios';

export default function RouteTracking() {
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [position, setPosition] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    // Optionally initialize map or fetch route info
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPosition({ lat, lng });
      // post to API (optionally include shipment id)
      api.post('/delivery/location', { shipment_id: selectedShipment, latitude: lat, longitude: lng }).catch(() => {});
    }, console.error, { enableHighAccuracy: true });
  };

  const stopTracking = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5">Route Tracking</Typography>
        <Paper sx={{ p: 2, mt: 2 }}>
          <RouteMap position={position} />
          <Button variant="contained" sx={{ mt: 2 }} onClick={startTracking}>Start Tracking</Button>
          <Button variant="outlined" sx={{ mt: 2, ml: 1 }} onClick={stopTracking}>Stop Tracking</Button>
        </Paper>
      </Box>
    </Box>
  );
}

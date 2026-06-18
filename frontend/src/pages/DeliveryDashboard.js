import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RouteIcon from '@mui/icons-material/Route';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import usePermission from '../hooks/usePermission';
import api from '../api/axios';

const purple = '#7c3aed';

function SummaryCard({ label, value, icon, tone = purple }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #ddd6fe', minHeight: 98 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: tone }}>{value}</Typography>
        </Box>
        <Box sx={{ bgcolor: '#f5f3ff', color: tone, p: 1, borderRadius: 2, display: 'flex' }}>{icon}</Box>
      </Stack>
    </Paper>
  );
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [summary, setSummary] = useState({});
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [form, setForm] = useState({
    customer_verified: false,
    cod_collected: false,
    proof_of_delivery: '',
    delivery_failure_reason: '',
    rescheduled_date: '',
  });
  const [position, setPosition] = useState({ lat: 12.9716, lng: 77.5946 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => String(shipment.shipment_id) === String(selectedShipmentId)) || shipments[0],
    [shipments, selectedShipmentId]
  );

  const loadShipments = async () => {
    setError('');
    const calls = [
      api.get('/dashboard/delivery/summary').then((res) => setSummary(res.data.data || {})),
      api.get('/shipments').then((res) => setShipments(res.data.data || [])),
    ];
    const results = await Promise.allSettled(calls);
    if (results.some((result) => result.status === 'rejected')) setError('Delivery data could not be loaded.');
  };

  useEffect(() => {
    if (hasPermission('shipments:read_own')) loadShipments();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosition((current) => ({
        lat: Number((current.lat + 0.0007).toFixed(6)),
        lng: Number((current.lng + 0.0005).toFixed(6)),
      }));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedShipment && !selectedShipmentId) setSelectedShipmentId(selectedShipment.shipment_id);
  }, [selectedShipment, selectedShipmentId]);

  const resetForm = () => setForm({
    customer_verified: false,
    cod_collected: false,
    proof_of_delivery: '',
    delivery_failure_reason: '',
    rescheduled_date: '',
  });

  const updateStatus = async (shipmentId, status, extra = {}) => {
    if (!shipmentId) return;
    setError('');
    try {
      await api.put(`/shipments/${shipmentId}/status`, {
        status,
        gps_lat: position.lat,
        gps_lng: position.lng,
        ...extra,
      });
      setMessage(`Shipment #${shipmentId} updated to ${status}.`);
      resetForm();
      loadShipments();
    } catch (err) {
      setError(err.response?.data?.message || 'Shipment update failed.');
    }
  };

  const completeDelivery = () => {
    updateStatus(selectedShipment?.shipment_id, 'Delivered', {
      customer_verified: form.customer_verified,
      cod_collected: selectedShipment?.cod_amount > 0 ? form.cod_collected : true,
      proof_of_delivery: form.proof_of_delivery,
    });
  };

  const failDelivery = () => {
    updateStatus(selectedShipment?.shipment_id, 'Delivery Failed', {
      delivery_failure_reason: form.delivery_failure_reason,
      rescheduled_date: form.rescheduled_date || null,
    });
  };

  const exportReport = async (type, format) => {
    const response = await api.get(`/reports/${type}/export?format=${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-report.${format === 'excel' ? 'xlsx' : format}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const cards = [
    ['Assigned Shipments', summary.assignedShipments || 0, <AssignmentTurnedInIcon />],
    ["Today's Route", summary.todaysRoute || 0, <RouteIcon />],
    ['Pending Deliveries', summary.pendingDeliveries || 0, <LocalShippingIcon />],
    ['Out for Delivery', summary.outForDelivery || 0, <GpsFixedIcon />],
    ['Delivered Today', summary.deliveredToday || 0, <CheckCircleIcon />],
    ['COD to Collect', `$${Number(summary.codToCollect || 0).toLocaleString()}`, <LocalAtmIcon />, '#9333ea'],
    ['Failed Deliveries', summary.failedDeliveries || 0, <WarningAmberIcon />, '#b91c1c'],
    ['Total Distance', `${Number(summary.totalDistance || 0).toFixed(1)} km`, <RouteIcon />],
    ['Total Packages', summary.totalPackages || 0, <LocalShippingIcon />],
    ['Notifications', summary.notifications || 0, <NotificationsIcon />],
  ];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#faf5ff', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: { xs: 1.5, md: 3 }, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#581c87' }}>Delivery Team</Typography>
            <Typography color="text.secondary">Hi, {user?.first_name}. Collect, dispatch, track route, verify customer, and close the day.</Typography>
          </Box>
          <Chip label="Purple route mode" sx={{ bgcolor: '#ede9fe', color: purple, fontWeight: 800, alignSelf: 'flex-start' }} />
        </Stack>

        {message && <Alert severity="success" onClose={() => setMessage('')} sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {cards.map(([label, value, icon, tone]) => (
            <Grid item xs={6} md={3} key={label}>
              <SummaryCard label={label} value={value} icon={icon} tone={tone} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Stack spacing={2}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>View Shipments</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {shipments.map((shipment) => (
                    <Paper
                      key={shipment.shipment_id}
                      onClick={() => setSelectedShipmentId(shipment.shipment_id)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        border: String(selectedShipment?.shipment_id) === String(shipment.shipment_id) ? `2px solid ${purple}` : '1px solid #e9d5ff',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>#{shipment.shipment_id} {shipment.customer_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{shipment.delivery_address}</Typography>
                        </Box>
                        <Chip size="small" label={shipment.status} color={shipment.status === 'Delivered' ? 'success' : 'secondary'} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>

              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Track Route</Typography>
                <Box sx={{ mt: 2, p: 2, minHeight: 180, borderRadius: 2, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', inset: 24, borderTop: `3px dashed ${purple}`, transform: 'rotate(-12deg)', transformOrigin: 'center' }} />
                  <Box sx={{ position: 'absolute', left: '18%', top: '58%', width: 18, height: 18, borderRadius: '50%', bgcolor: purple }} />
                  <Box sx={{ position: 'absolute', left: '68%', top: '24%', width: 18, height: 18, borderRadius: '50%', bgcolor: '#16a34a' }} />
                  <Box sx={{ position: 'absolute', left: `${30 + ((position.lat * 1000) % 35)}%`, top: `${28 + ((position.lng * 1000) % 34)}%`, color: purple }}>
                    <GpsFixedIcon />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">GPS simulation: {position.lat}, {position.lng}</Typography>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Stack spacing={2}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Workflow Modules</Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  {['View Shipments', 'Collect Packages', 'Dispatch', 'Track Route', 'Deliver', 'Delivery Outcome', 'Complete Day', 'Reports & Documents'].map((step) => (
                    <Grid item xs={6} md={4} key={step}>
                      <Paper sx={{ p: 1.5, border: '1px solid #ddd6fe', bgcolor: '#fff' }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#581c87' }}>{step}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Selected Shipment #{selectedShipment?.shipment_id || '-'}</Typography>
                    <Typography color="text.secondary">{selectedShipment?.customer_name}</Typography>
                    <Typography variant="body2">{selectedShipment?.delivery_address}</Typography>
                    {selectedShipment?.cod_amount > 0 && <Chip sx={{ mt: 1 }} color="secondary" label={`COD $${Number(selectedShipment.cod_amount).toLocaleString()}`} />}
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" onClick={() => updateStatus(selectedShipment?.shipment_id, 'Collected')}>Update Status: Collected</Button>
                    <Button variant="outlined" onClick={() => updateStatus(selectedShipment?.shipment_id, 'Dispatched')}>Update Status: Dispatched</Button>
                    <Button variant="contained" sx={{ bgcolor: purple }} onClick={() => updateStatus(selectedShipment?.shipment_id, 'En Route')}>Update Status: En Route</Button>
                  </Stack>
                </Stack>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Customer Verification</Typography>
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                      <FormControlLabel control={<Checkbox checked={form.customer_verified} onChange={(e) => setForm({ ...form, customer_verified: e.target.checked })} />} label="Customer identity verified" />
                      {selectedShipment?.cod_amount > 0 && (
                        <FormControlLabel control={<Checkbox checked={form.cod_collected} onChange={(e) => setForm({ ...form, cod_collected: e.target.checked })} />} label="COD collected" />
                      )}
                      <TextField label="Signature or photo reference" value={form.proof_of_delivery} onChange={(e) => setForm({ ...form, proof_of_delivery: e.target.value })} placeholder="signature:Ravi or photo:pod-1002.jpg" InputProps={{ startAdornment: <CameraAltIcon sx={{ mr: 1, color: purple }} /> }} />
                      <Button variant="contained" sx={{ bgcolor: purple }} onClick={completeDelivery}>Complete Delivery</Button>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Failure & Reschedule</Typography>
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                      <TextField select label="Failure reason" value={form.delivery_failure_reason} onChange={(e) => setForm({ ...form, delivery_failure_reason: e.target.value })}>
                        <MenuItem value="Customer unavailable">Customer unavailable</MenuItem>
                        <MenuItem value="Address not found">Address not found</MenuItem>
                        <MenuItem value="Payment not available">Payment not available</MenuItem>
                        <MenuItem value="Package damaged">Package damaged</MenuItem>
                      </TextField>
                      <TextField type="datetime-local" label="Reschedule time" InputLabelProps={{ shrink: true }} value={form.rescheduled_date} onChange={(e) => setForm({ ...form, rescheduled_date: e.target.value })} />
                      <Button variant="outlined" color="error" onClick={failDelivery}>Mark Failed / Reschedule</Button>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Complete Day Checklist</Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  {['All packages reconciled?', 'COD deposited?', 'Failed deliveries reasoned?', 'Route closed?'].map((step) => (
                    <Grid item xs={12} sm={6} md={3} key={step}>
                      <Paper sx={{ p: 1.5, textAlign: 'center', border: '1px solid #ddd6fe', bgcolor: '#f5f3ff' }}>
                        <Typography variant="subtitle2" sx={{ color: '#581c87', fontWeight: 900 }}>{step}</Typography>
                        <Typography variant="caption">No: resolve exception. Yes: close.</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Reports & Documents</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {['delivery', 'delivery_performance', 'failed_delivery', 'payment_collection', 'route_summary', 'customer_feedback'].map((type) => (
                    ['csv', 'excel', 'pdf'].map((format) => (
                      <Button key={`${type}-${format}`} size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => exportReport(type, format)} sx={{ borderColor: purple, color: purple }}>
                        {type.replaceAll('_', ' ')} {format.toUpperCase()}
                      </Button>
                    ))
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

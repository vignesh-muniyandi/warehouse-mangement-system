import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import NotificationsIcon from '@mui/icons-material/Notifications';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ReplayIcon from '@mui/icons-material/Replay';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import usePermission from '../hooks/usePermission';
import api from '../api/axios';

const orange = '#f97316';

function SummaryCard({ label, value, icon }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #fed7aa', minHeight: 98 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: orange }}>{value}</Typography>
        </Box>
        <Box sx={{ bgcolor: '#fff7ed', color: orange, p: 1, borderRadius: 2, display: 'flex' }}>{icon}</Box>
      </Stack>
    </Paper>
  );
}

function StatusRail({ status }) {
  const steps = ['Pending', 'In Progress', 'Picked', 'Packed', 'Completed'];
  const current = Math.max(0, steps.findIndex((step) => step === status));
  return (
    <Stack direction="row" spacing={0.75} sx={{ mt: 1, overflowX: 'auto' }}>
      {steps.map((step, index) => (
        <Chip key={step} size="small" label={step} color={index <= current ? 'warning' : 'default'} variant={index <= current ? 'filled' : 'outlined'} />
      ))}
    </Stack>
  );
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState({});
  const [tasks, setTasks] = useState([]);
  const [pickList, setPickList] = useState([]);
  const [scanCode, setScanCode] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [locationResult, setLocationResult] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const taskGroups = useMemo(() => ({
    receive: tasks.filter((task) => task.task_type === 'receive'),
    putaway: tasks.filter((task) => task.task_type === 'putaway'),
    pack: tasks.filter((task) => ['pack', 'general'].includes(task.task_type)),
  }), [tasks]);

  const loadData = async () => {
    setError('');
    const calls = [
      api.get('/dashboard/worker/summary').then((res) => setSummary(res.data.data || {})),
    ];
    if (hasPermission('tasks:read_own')) calls.push(api.get('/tasks').then((res) => setTasks(res.data.data || [])));
    if (hasPermission('pick:read_own')) calls.push(api.get('/pick-list').then((res) => setPickList(res.data.data || [])));
    const results = await Promise.allSettled(calls);
    if (results.some((result) => result.status === 'rejected')) setError('Some assigned work could not be loaded.');
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateTask = async (taskId, status, extra = {}) => {
    if (status === 'In Progress') {
      await api.patch(`/worker/tasks/${taskId}/start`, extra);
    } else if (status === 'Completed') {
      await api.patch(`/worker/tasks/${taskId}/complete`, extra);
    } else {
      await api.put(`/tasks/${taskId}`, { status, ...extra });
    }
    setMessage(`Task moved to ${status}.`);
    loadData();
  };

  const updatePick = async (taskId) => {
    await api.put(`/pick-list/${taskId}`, { status: 'Picked' });
    setMessage('Pick validated and marked picked.');
    loadData();
  };

  const updatePack = async (taskId) => {
    await api.put(`/pack-station/${taskId}`, { status: 'Packed' });
    setMessage('Pack completed and staged for dispatch.');
    loadData();
  };

  const scanInventory = async (event) => {
    event.preventDefault();
    setError('');
    setScanResult(null);
    try {
      const res = await api.post('/inventory/scan', { barcode: scanCode, sku: scanCode });
      setScanResult(res.data.data);
      setMessage('Item valid. Continue to location validation.');
    } catch (err) {
      setError(err.response?.data?.message || 'Item not valid. Retry scan.');
    }
  };

  const validateLocation = async (event) => {
    event.preventDefault();
    setError('');
    setLocationResult(null);
    try {
      const res = await api.post('/locations/validate', { location_code: locationCode });
      setLocationResult(res.data.data);
      setMessage('Location valid. You can complete the workflow step.');
    } catch (err) {
      setError(err.response?.data?.message || 'Location not valid. Retry location scan.');
    }
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
    ['Assigned Tasks', summary.assignedTasks || 0, <AssignmentIcon />],
    ['Pending Pick Orders', summary.pendingPickOrders || 0, <QrCodeScannerIcon />],
    ['Pending Pack Orders', summary.pendingPackOrders || 0, <InventoryIcon />],
    ['Orders Completed', summary.ordersCompleted || 0, <CheckCircleIcon />],
    ["Today's Target", summary.todaysTarget || 0, <CheckCircleIcon />],
    ['Tasks in Progress', summary.tasksInProgress || 0, <AssignmentIcon />],
    ['Performance Overview', `${summary.performanceOverview || 0}%`, <CheckCircleIcon />],
    ['Notifications', summary.notifications || 0, <NotificationsIcon />],
  ];

  const completion = summary.assignedTasks ? Math.round(((summary.todaysTarget || 0) / summary.assignedTasks) * 100) : 0;

  return (
    <Box sx={{ display: 'flex', bgcolor: '#fff7ed', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: { xs: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#9a3412' }}>Worker / Operator</Typography>
            <Typography color="text.secondary">Hello, {user?.first_name}. Scan, validate, update, and complete floor work.</Typography>
          </Box>
          <Chip label="Orange mobile floor mode" sx={{ bgcolor: '#fed7aa', color: '#9a3412', fontWeight: 800, alignSelf: 'flex-start' }} />
        </Stack>

        {message && <Alert severity="success" onClose={() => setMessage('')} sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {cards.map(([label, value, icon]) => (
            <Grid item xs={6} md={3} key={label}>
              <SummaryCard label={label} value={value} icon={icon} />
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Daily progress</Typography>
            <Typography variant="body2">{completion}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(completion, 100)} sx={{ height: 8, borderRadius: 1, bgcolor: '#ffedd5', '& .MuiLinearProgress-bar': { bgcolor: orange } }} />
        </Paper>

        <Tabs value={tab} onChange={(e, value) => setTab(value)} variant="scrollable" sx={{ mb: 2, '& .Mui-selected': { color: '#c2410c !important' } }}>
          <Tab label="Assigned Tasks" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="Receive Goods" icon={<LocalShippingIcon />} iconPosition="start" />
          <Tab label="Putaway" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="Pick Items" icon={<QrCodeScannerIcon />} iconPosition="start" />
          <Tab label="Pack Items" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="Update & Complete" icon={<CheckCircleIcon />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {tasks.map((task) => (
              <Grid item xs={12} md={6} key={task.task_id}>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{task.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{task.task_type} | {task.location_code || 'No location'} | Target {task.target_quantity || 1}</Typography>
                    </Box>
                    <Chip label={task.status} color={task.status === 'Completed' ? 'success' : 'warning'} size="small" />
                  </Stack>
                  <StatusRail status={task.status} />
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => updateTask(task.task_id, 'In Progress')}>Start</Button>
                    <Button variant="contained" onClick={() => updateTask(task.task_id, 'Completed')} sx={{ bgcolor: orange }}>Complete</Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            {taskGroups.receive.map((task) => (
              <Paper key={task.task_id} sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{task.title}</Typography>
                <Typography color="text.secondary" variant="body2">{task.notes}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button fullWidth variant="outlined" color="error" onClick={() => setError('Issue reported to supervisor for receiving exception.')}>Report Issue</Button>
                </Stack>
                <Button fullWidth size="large" variant="contained" sx={{ mt: 2, bgcolor: orange }} onClick={() => updateTask(task.task_id, 'Received')}>Validate ASN & Mark Received</Button>
              </Paper>
            ))}
          </Stack>
        )}

        {tab === 2 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Putaway Location Validation</Typography>
            <Box component="form" onSubmit={validateLocation} sx={{ mt: 2 }}>
              <Stack spacing={1.5}>
                <TextField label="Location code" value={locationCode} onChange={(e) => setLocationCode(e.target.value.toUpperCase())} placeholder="BIN-A1" required />
                <Button type="submit" variant="contained" sx={{ bgcolor: orange }}>Validate Location</Button>
                {locationResult && <Alert severity="success">{locationResult.location_code} accepted. Store item and update task.</Alert>}
                <Button startIcon={<ReplayIcon />} onClick={() => { setLocationCode(''); setLocationResult(null); }}>Retry Location Scan</Button>
              </Stack>
            </Box>
          </Paper>
        )}

        {tab === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper component="form" onSubmit={scanInventory} sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Barcode / QR Scan</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <TextField label="Barcode or SKU" value={scanCode} onChange={(e) => setScanCode(e.target.value)} required />
                  <Button type="submit" size="large" variant="contained" startIcon={<QrCodeScannerIcon />} sx={{ bgcolor: orange }}>Scan Item</Button>
                  {scanResult && <Alert severity="success">{scanResult.sku} - {scanResult.name}: {scanResult.quantity_available} available</Alert>}
                  <Button startIcon={<ReplayIcon />} onClick={() => { setScanCode(''); setScanResult(null); }}>Retry Scan</Button>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                {pickList.map((task) => (
                  <Paper key={task.task_id} sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{task.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{task.notes}</Typography>
                    {scanResult && Number(scanResult.quantity_available) <= 0 && <Alert severity="warning" sx={{ mt: 1 }}>Item unavailable. Notify supervisor before picking.</Alert>}
                    <Button fullWidth size="large" variant="contained" disabled={!scanResult} sx={{ mt: 2, bgcolor: orange }} onClick={() => updatePick(task.task_id)}>Mark Picked</Button>
                  </Paper>
                ))}
              </Stack>
            </Grid>
          </Grid>
        )}

        {tab === 4 && (
          <Stack spacing={2}>
            {taskGroups.pack.map((task) => (
              <Paper key={task.task_id} sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{task.title}</Typography>
                <Typography variant="body2" color="text.secondary">{task.notes}</Typography>
                <Button fullWidth size="large" variant="contained" sx={{ mt: 2, bgcolor: orange }} onClick={() => updatePack(task.task_id)}>Pack, Seal & Stage</Button>
              </Paper>
            ))}
          </Stack>
        )}

        {tab === 5 && (
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Update & Complete Flow</Typography>
              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                {['Review task summary', 'Add notes if any', 'Mark task completed', 'Update inventory automatically', 'Return to dashboard'].map((step) => (
                  <Grid item xs={12} sm={6} md={3} key={step}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', border: '1px solid #fed7aa', bgcolor: '#fff7ed', height: '100%' }}>
                      <Typography variant="subtitle2" sx={{ color: '#9a3412', fontWeight: 900 }}>{step}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Reports & Performance</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {['task_performance', 'worker_productivity', 'inventory'].map((type) => (
                  ['csv', 'excel', 'pdf'].map((format) => (
                    <Button key={`${type}-${format}`} size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => exportReport(type, format)} sx={{ borderColor: orange, color: '#c2410c' }}>
                      {type.replaceAll('_', ' ')} {format.toUpperCase()}
                    </Button>
                  ))
                ))}
              </Stack>
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

import React, { useState } from 'react';
import { Box, Paper, Stack, TextField, Button, Typography, Alert } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function ReceiveGoods() {
  const [po, setPo] = useState('');
  const [barcode, setBarcode] = useState('');
  const [poResult, setPoResult] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  const scanPo = async (e) => {
    e.preventDefault();
    setError('');
    setPoResult(null);
    try {
      const res = await api.post('/receiving/scan-po', { po_number: po });
      setPoResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'PO not found');
    }
  };

  const scanBarcode = async (e) => {
    e.preventDefault();
    setError('');
    setScanResult(null);
    try {
      const res = await api.post('/receiving/scan-barcode', { barcode });
      setScanResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Item not valid');
    }
  };

  const confirmReceive = async () => {
    try {
      await api.patch('/receiving/confirm', { po_number: po, barcode, quantity: scanResult?.quantity || 1 });
      setPo(''); setBarcode(''); setPoResult(null); setScanResult(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff7ed' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: '#9a3412', fontWeight: 800 }}>Receive Goods</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Scan / Enter PO Number</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }} component="form" onSubmit={scanPo}>
            <TextField value={po} onChange={(e) => setPo(e.target.value)} placeholder="PO-12345" required />
            <Button type="submit" variant="contained" sx={{ bgcolor: '#f97316' }}>Load PO</Button>
          </Stack>
          {poResult && <Alert sx={{ mt: 2 }} severity="success">PO loaded: {poResult.po_number || po}</Alert>}
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Scan Item Barcode</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }} component="form" onSubmit={scanBarcode}>
            <TextField value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode or SKU" required />
            <Button type="submit" variant="contained" sx={{ bgcolor: '#f97316' }}>Scan</Button>
          </Stack>
          {scanResult && <Alert sx={{ mt: 2 }} severity="success">Item: {scanResult.name} (SKU: {scanResult.sku})</Alert>}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => { setPo(''); setBarcode(''); setPoResult(null); setScanResult(null); }}>Reset</Button>
            <Button variant="contained" sx={{ bgcolor: '#f97316' }} onClick={confirmReceive} disabled={!poResult || !scanResult}>Confirm Receive</Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

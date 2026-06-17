import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';

// Icons
import AddIcon from '@mui/icons-material/Add';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SearchIcon from '@mui/icons-material/Search';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

export default function InventoryManagement() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ available: 0, reserved: 0, damaged: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Dialog State
  const [openAdjust, setOpenAdjust] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    warehouse_id: '',
    to_warehouse_id: '',
    adjustment_type: 'add',
    quantity: '',
    remarks: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (search = '') => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get(`/inventory?search=${encodeURIComponent(search)}`),
        api.get('/inventory/stats')
      ]);
      if (itemsRes.data.success && statsRes.data.success) {
        setItems(itemsRes.data.data);
        setStats(statsRes.data.data);
      } else {
        setError('Failed to fetch inventory data');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchData(val);
  };

  const handleOpenAdjust = async () => {
    try {
      const [prodRes, whRes] = await Promise.all([
        api.get('/products'),
        api.get('/warehouses')
      ]);
      if (prodRes.data.success && whRes.data.success) {
        setProducts(prodRes.data.data);
        setWarehouses(whRes.data.data);
        setAdjustForm({
          product_id: prodRes.data.data[0]?.product_id || '',
          warehouse_id: whRes.data.data[0]?.warehouse_id || '',
          to_warehouse_id: whRes.data.data[1]?.warehouse_id || '',
          adjustment_type: 'add',
          quantity: '',
          remarks: ''
        });
        setOpenAdjust(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load products and warehouses list');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setAdjustForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    setFormError('');

    const qty = parseInt(adjustForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive integer');
      return;
    }

    if (adjustForm.adjustment_type === 'transfer' && adjustForm.warehouse_id === adjustForm.to_warehouse_id) {
      setFormError('Source and destination warehouses must be different');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/inventory/adjust', {
        product_id: parseInt(adjustForm.product_id),
        warehouse_id: parseInt(adjustForm.warehouse_id),
        to_warehouse_id: adjustForm.adjustment_type === 'transfer' ? parseInt(adjustForm.to_warehouse_id) : undefined,
        adjustment_type: adjustForm.adjustment_type,
        quantity: qty,
        remarks: adjustForm.remarks
      });

      if (res.data.success) {
        setOpenAdjust(false);
        fetchData(searchQuery);
      } else {
        setFormError(res.data.message || 'Failed to save stock adjustment');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Error occurred while saving adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Page Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Inventory Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track available, reserved, and damaged stock levels; adjust stock and perform transfers.
      </Typography>

      {/* Summary Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Available Stock
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
              {stats.available}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Reserved Stock
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
              {stats.reserved}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '8px', borderLeft: '4px solid #f43f5e' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Damaged Stock
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
              {stats.damaged}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '8px', borderLeft: `4px solid ${stats.lowStock > 0 ? '#f59e0b' : '#64748b'}` }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Low Stock Items
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: stats.lowStock > 0 ? '#b45309' : '#0f172a' }}>
              {stats.lowStock}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <TextField
          placeholder="Search by SKU, barcode, or product name..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearch}
          sx={{ width: { xs: '100%', sm: 360 } }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdjust}
          sx={{
            backgroundColor: '#2563eb',
            '&:hover': { backgroundColor: '#1d4ed8' }
          }}
        >
          Stock Adjustment
        </Button>
      </Paper>

      {/* Inventory Table */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : items.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No inventory items found. Try searching for something else.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Barcode</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Available</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Reserved</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Damaged</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => {
                const isLowStock = row.quantity_available <= row.reorder_level;
                return (
                  <TableRow key={row.inventory_id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.sku}</TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>{row.barcode || '-'}</TableCell>
                    <TableCell>{row.warehouse_name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{row.quantity_available}</TableCell>
                    <TableCell align="right">{row.quantity_reserved}</TableCell>
                    <TableCell align="right">{row.damaged_quantity}</TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Chip label="Low Stock" size="small" color="warning" sx={{ fontWeight: 500 }} />
                      ) : (
                        <Chip label="Healthy" size="small" color="success" sx={{ fontWeight: 500 }} />
                      )}
                    </TableCell>
                    <TableCell>{new Date(row.last_updated).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Floating Back Button */}
      <FloatingBackButton />

      {/* Stock Adjustment Dialog */}
      <Dialog open={openAdjust} onClose={() => !submitting && setOpenAdjust(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Stock Adjustment / Transfer Wizard</DialogTitle>
        <form onSubmit={handleSaveAdjustment}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2}>
              {/* Adjustment Type */}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Adjustment Action"
                  name="adjustment_type"
                  value={adjustForm.adjustment_type}
                  onChange={handleFormChange}
                  size="small"
                >
                  <MenuItem value="add">Add Stock (Inbound / Intake)</MenuItem>
                  <MenuItem value="remove">Remove Stock (Outbound / Damage)</MenuItem>
                  <MenuItem value="transfer">Transfer Stock (Between Warehouses)</MenuItem>
                </TextField>
              </Grid>

              {/* Product */}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Select Product"
                  name="product_id"
                  value={adjustForm.product_id}
                  onChange={handleFormChange}
                  size="small"
                >
                  {products.map(p => (
                    <MenuItem key={p.product_id} value={p.product_id}>
                      {p.name} ({p.sku})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Source Warehouse */}
              <Grid item xs={12} sm={adjustForm.adjustment_type === 'transfer' ? 6 : 12}>
                <TextField
                  select
                  fullWidth
                  label={adjustForm.adjustment_type === 'transfer' ? "From Warehouse" : "Warehouse"}
                  name="warehouse_id"
                  value={adjustForm.warehouse_id}
                  onChange={handleFormChange}
                  size="small"
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Destination Warehouse (only for transfer) */}
              {adjustForm.adjustment_type === 'transfer' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="To Warehouse"
                    name="to_warehouse_id"
                    value={adjustForm.to_warehouse_id}
                    onChange={handleFormChange}
                    size="small"
                  >
                    {warehouses.map(w => (
                      <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              {/* Quantity */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  name="quantity"
                  value={adjustForm.quantity}
                  onChange={handleFormChange}
                  size="small"
                  placeholder="Enter positive integer"
                  required
                />
              </Grid>

              {/* Remarks */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks / Reference"
                  name="remarks"
                  value={adjustForm.remarks}
                  onChange={handleFormChange}
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Reason for adjustment, PO/SO reference"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAdjust(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Save Adjustment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

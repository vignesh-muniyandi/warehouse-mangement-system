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
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';

// Icons
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import InventoryIcon from '@mui/icons-material/Inventory';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

export default function PurchaseManagement() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog & Detail States
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);

  // Form selections lists
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    supplier_id: '',
    warehouse_id: '',
    expected_delivery_date: '',
    items: [] // { product_id, quantity, unit_price }
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/purchase-orders');
      if (res.data.success) {
        setPurchases(res.data.data);
      } else {
        setError('Failed to fetch purchase orders');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const [supRes, whRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/warehouses'),
        api.get('/products')
      ]);
      if (supRes.data.success && whRes.data.success && prodRes.data.success) {
        setSuppliers(supRes.data.data);
        setWarehouses(whRes.data.data);
        setProducts(prodRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load PO options lists', err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchFormOptions();
  }, []);

  const handleOpenCreate = () => {
    setCreateForm({
      supplier_id: suppliers[0]?.supplier_id || '',
      warehouse_id: warehouses[0]?.warehouse_id || '',
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ product_id: products[0]?.product_id || '', quantity: '50', unit_price: products[0]?.unit_price || '0.00' }]
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleItemProductChange = (index, value) => {
    const matchedProduct = products.find(p => p.product_id === parseInt(value));
    const newItems = [...createForm.items];
    newItems[index] = {
      product_id: value,
      quantity: newItems[index].quantity,
      unit_price: matchedProduct ? matchedProduct.unit_price.toString() : '0.00'
    };
    setCreateForm(prev => ({ ...prev, items: newItems }));
  };

  const handleItemChange = (index, name, value) => {
    const newItems = [...createForm.items];
    newItems[index][name] = value;
    setCreateForm(prev => ({ ...prev, items: newItems }));
  };

  const handleAddItem = () => {
    setCreateForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0]?.product_id || '', quantity: '10', unit_price: products[0]?.unit_price || '0.00' }]
    }));
  };

  const handleRemoveItem = (index) => {
    const newItems = createForm.items.filter((_, i) => i !== index);
    setCreateForm(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return createForm.items.reduce((sum, item) => {
      const q = parseInt(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      return sum + (q * p);
    }, 0);
  };

  const handleSavePo = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!createForm.items.length) {
      setFormError('Please add at least one product to the purchase order');
      return;
    }

    for (const item of createForm.items) {
      const q = parseInt(item.quantity);
      const p = parseFloat(item.unit_price);
      if (isNaN(q) || q <= 0) {
        setFormError('Quantity must be a positive integer');
        return;
      }
      if (isNaN(p) || p < 0) {
        setFormError('Price must be a non-negative number');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post('/purchase-orders', {
        supplier_id: parseInt(createForm.supplier_id),
        warehouse_id: parseInt(createForm.warehouse_id),
        expected_delivery_date: createForm.expected_delivery_date,
        items: createForm.items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      });

      if (res.data.success) {
        setOpenCreate(false);
        fetchPurchases();
      } else {
        setFormError(res.data.message || 'Failed to save PO');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Error occurred while saving PO.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (poId) => {
    setLoading(true);
    try {
      const res = await api.get(`/purchase-orders/${poId}`);
      if (res.data.success) {
        setSelectedPo(res.data.data);
        setOpenDetails(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load PO details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (newStatus) => {
    if (!selectedPo) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/purchase-orders/${selectedPo.purchase_order_id}/status`, { status: newStatus });
      if (res.data.success) {
        // Refresh detail view
        const detailRes = await api.get(`/purchase-orders/${selectedPo.purchase_order_id}`);
        if (detailRes.data.success) {
          setSelectedPo(detailRes.data.data);
        }
        // Refresh master list
        fetchPurchases();
      } else {
        alert(res.data.message || 'Status transition failed');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Purchase Orders Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Procure products, request supplier validation, process receipts and automate inventory replenishment.
      </Typography>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
        >
          Create Purchase Order
        </Button>
      </Paper>

      {/* PO List */}
      {loading && !openDetails ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : purchases.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No purchase orders found. Click 'Create Purchase Order' to begin.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>PO ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Warehouse Destination</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Expected Delivery</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Received Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((row) => (
                <TableRow key={row.purchase_order_id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>PO #{row.purchase_order_id}</TableCell>
                  <TableCell>{row.supplier_name}</TableCell>
                  <TableCell>{row.warehouse_name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_amount)}
                  </TableCell>
                  <TableCell>{row.expected_delivery_date ? new Date(row.expected_delivery_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{row.received_date ? new Date(row.received_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      color={
                        row.status === 'Pending' ? 'default' :
                        row.status === 'Submitted' ? 'info' :
                        row.status === 'Approved' ? 'success' :
                        row.status === 'Rejected' ? 'error' : 'secondary'
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewDetails(row.purchase_order_id)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Floating Back Button */}
      <FloatingBackButton />

      {/* Create PO Dialog */}
      <Dialog open={openCreate} onClose={() => !submitting && setOpenCreate(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700 }}>Procurement Purchase Order Wizard</DialogTitle>
        <form onSubmit={handleSavePo}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Supplier */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Select Supplier"
                  name="supplier_id"
                  value={createForm.supplier_id}
                  onChange={handleCreateFormChange}
                  size="small"
                  required
                >
                  {suppliers.map(s => (
                    <MenuItem key={s.supplier_id} value={s.supplier_id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Warehouse */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Destination Warehouse"
                  name="warehouse_id"
                  value={createForm.warehouse_id}
                  onChange={handleCreateFormChange}
                  size="small"
                  required
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Delivery Date */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expected Delivery"
                  name="expected_delivery_date"
                  value={createForm.expected_delivery_date}
                  onChange={handleCreateFormChange}
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
              Requested Items List
            </Typography>

            {createForm.items.map((item, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2, alignItems: 'center' }}>
                <Grid item xs={12} sm={5}>
                  <TextField
                    select
                    fullWidth
                    label="Select Product"
                    value={item.product_id}
                    onChange={(e) => handleItemProductChange(index, e.target.value)}
                    size="small"
                    required
                  >
                    {products.map(p => (
                      <MenuItem key={p.product_id} value={p.product_id}>
                        {p.name} ({p.sku})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    label="Unit Cost ($)"
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    size="small"
                    required
                    inputProps={{ step: '0.01' }}
                  />
                </Grid>
                <Grid item xs={12} sm={1} align="center">
                  <IconButton
                    color="error"
                    disabled={createForm.items.length === 1}
                    onClick={() => handleRemoveItem(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddItem} sx={{ mt: 1 }}>
              Add Product Line
            </Button>

            <Box sx={{ mt: 4, p: 2, bgcolor: '#f8fafc', borderRadius: '4px', textAlign: 'right' }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Subtotal Value:{' '}
                <strong>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculateTotal())}
                </strong>
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCreate(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* PO Details Dialog */}
      <Dialog open={openDetails} onClose={() => !submitting && setOpenDetails(false)} fullWidth maxWidth="md">
        {selectedPo && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Purchase Order Details — PO #{selectedPo.purchase_order_id}</span>
              <Chip
                label={selectedPo.status}
                color={
                  selectedPo.status === 'Pending' ? 'default' :
                  selectedPo.status === 'Submitted' ? 'info' :
                  selectedPo.status === 'Approved' ? 'success' :
                  selectedPo.status === 'Rejected' ? 'error' : 'secondary'
                }
              />
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    SUPPLIER SOURCE
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                    {selectedPo.supplier_name}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    DESTINATION WAREHOUSE
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                    {selectedPo.warehouse_name}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    TOTAL ORDER AMOUNT
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedPo.total_amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    DATE CREATED
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    {new Date(selectedPo.created_at).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    EXPECTED DELIVERY
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    {selectedPo.expected_delivery_date ? new Date(selectedPo.expected_delivery_date).toLocaleDateString() : '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    RECEIVED DATE
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    {selectedPo.received_date ? new Date(selectedPo.received_date).toLocaleString() : 'Not received yet'}
                  </Typography>
                </Grid>
              </Grid>

              {/* Workflow controls */}
              <Card sx={{ p: 2.5, mb: 4, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1.5 }}>
                  Workflow Controls & Supplier Approval Simulator
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {selectedPo.status === 'Pending' && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SendIcon />}
                      disabled={submitting}
                      onClick={() => handleStatusTransition('Submitted')}
                    >
                      Submit PO for Approval
                    </Button>
                  )}

                  {selectedPo.status === 'Submitted' && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        disabled={submitting}
                        onClick={() => handleStatusTransition('Approved')}
                      >
                        Approve (as Supplier)
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        disabled={submitting}
                        onClick={() => handleStatusTransition('Rejected')}
                      >
                        Reject (as Supplier)
                      </Button>
                    </>
                  )}

                  {selectedPo.status === 'Approved' && (
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<InventoryIcon />}
                      disabled={submitting}
                      onClick={() => handleStatusTransition('Received')}
                      sx={{ backgroundColor: '#8b5cf6', '&:hover': { backgroundColor: '#7c3aed' } }}
                    >
                      Process & Receive Goods (Increment Stock)
                    </Button>
                  )}

                  {selectedPo.status === 'Rejected' && (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<SendIcon />}
                      disabled={submitting}
                      onClick={() => handleStatusTransition('Pending')}
                    >
                      Revise Purchase Order
                    </Button>
                  )}

                  {selectedPo.status === 'Received' && (
                    <Typography color="success.main" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon /> Goods Received. Stock values have been updated.
                    </Typography>
                  )}
                </Box>
              </Card>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Line Items
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Ordered Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Cost</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Total Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPo.items?.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell sx={{ fontWeight: 500 }}>{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="right">{item.quantity_ordered}</TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.unit_price)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.quantity_ordered * item.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenDetails(false)} disabled={submitting}>
                Close Details
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

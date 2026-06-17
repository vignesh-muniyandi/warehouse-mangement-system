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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Divider from '@mui/material/Divider';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

const STATUS_STEPS = ['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered'];

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending'); // Tab value
  const [error, setError] = useState('');

  // Details Dialog State
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async (searchVal = '', statusVal = 'Pending') => {
    try {
      const res = await api.get(`/orders?search=${encodeURIComponent(searchVal)}&status=${statusVal === 'All' ? '' : statusVal}`);
      if (res.data.success) {
        setOrders(res.data.data);
      } else {
        setError('Failed to fetch sales orders');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading orders list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff');
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load warehouse staff list', err);
    }
  };

  useEffect(() => {
    fetchOrders(search, statusFilter);
    fetchStaff();
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchOrders(val, statusFilter);
  };

  const handleTabChange = (event, newValue) => {
    setStatusFilter(newValue);
    fetchOrders(search, newValue);
  };

  const handleViewDetails = async (orderId) => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data);
        setOpenDetails(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (staffId) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/orders/${selectedOrder.order_id}/assign`, { assigned_user_id: staffId || null });
      if (res.data.success) {
        // Refresh detail view
        const detailRes = await api.get(`/orders/${selectedOrder.order_id}`);
        if (detailRes.data.success) {
          setSelectedOrder(detailRes.data.data);
        }
        // Refresh master list
        fetchOrders(search, statusFilter);
      } else {
        alert(res.data.message || 'Staff assignment failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/orders/${selectedOrder.order_id}/status`, { status: newStatus });
      if (res.data.success) {
        // Refresh detail view
        const detailRes = await api.get(`/orders/${selectedOrder.order_id}`);
        if (detailRes.data.success) {
          setSelectedOrder(detailRes.data.data);
        }
        // Refresh master list
        fetchOrders(search, statusFilter);
      } else {
        alert(res.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating order status');
    } finally {
      setSubmitting(false);
    }
  };

  const getActiveStep = (status) => {
    return STATUS_STEPS.indexOf(status);
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Orders Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track sales orders, allocate processing operators, and monitor delivery progress.
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={statusFilter}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Pending" value="Pending" />
          <Tab label="Processing" value="Processing" />
          <Tab label="Packed" value="Packed" />
          <Tab label="Shipped" value="Shipped" />
          <Tab label="Delivered" value="Delivered" />
          <Tab label="All Orders" value="All" />
        </Tabs>
      </Paper>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search by Order ID or Customer Name..."
          variant="outlined"
          size="small"
          value={search}
          onChange={handleSearch}
          sx={{ width: { xs: '100%', sm: 360 } }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
        />
      </Paper>

      {/* Orders Table */}
      {loading && !openDetails ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : orders.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No orders found matching this status or search query.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Delivery Address</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Assigned Operator</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((row) => (
                <TableRow key={row.order_id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>SO #{row.order_id}</TableCell>
                  <TableCell>{row.customer_name}</TableCell>
                  <TableCell>{row.delivery_address}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_amount)}
                  </TableCell>
                  <TableCell>
                    {row.first_name ? `${row.first_name} ${row.last_name}` : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      color={
                        row.status === 'Pending' ? 'default' :
                        row.status === 'Processing' ? 'primary' :
                        row.status === 'Packed' ? 'warning' :
                        row.status === 'Shipped' ? 'info' : 'success'
                      }
                    />
                  </TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewDetails(row.order_id)}
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

      {/* Order Details Dialog */}
      <Dialog open={openDetails} onClose={() => !submitting && setOpenDetails(false)} fullWidth maxWidth="md">
        {selectedOrder && (
          <>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Sales Order Details — SO #{selectedOrder.order_id}</span>
              <Chip
                label={selectedOrder.status}
                color={
                  selectedOrder.status === 'Pending' ? 'default' :
                  selectedOrder.status === 'Processing' ? 'primary' :
                  selectedOrder.status === 'Packed' ? 'warning' :
                  selectedOrder.status === 'Shipped' ? 'info' : 'success'
                }
              />
            </DialogTitle>
            <DialogContent dividers>
              {/* Stepper tracking progress */}
              <Box sx={{ width: '100%', py: 3, mb: 4 }}>
                <Stepper activeStep={getActiveStep(selectedOrder.status)}>
                  {STATUS_STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    CUSTOMER
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                    {selectedOrder.customer_name}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    DELIVERY ADDRESS
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#1e293b' }}>
                    {selectedOrder.delivery_address}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    TOTAL AMOUNT
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedOrder.total_amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    ORDER DATE
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    LAST UPDATED
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>
                    {new Date(selectedOrder.updated_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              {/* Assignment Controls */}
              <Grid container spacing={2} sx={{ mb: 4, alignItems: 'center' }}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AssignmentIndIcon color="primary" />
                    <TextField
                      select
                      fullWidth
                      label="Assign Warehouse Staff"
                      value={selectedOrder.assigned_user_id || ''}
                      onChange={(e) => handleAssignStaff(e.target.value)}
                      size="small"
                      disabled={submitting}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {staffList.map((s) => (
                        <MenuItem key={s.user_id} value={s.user_id}>
                          {s.first_name} {s.last_name} ({s.role_name})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {selectedOrder.status === 'Pending' && (
                      <Button
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        disabled={submitting}
                        onClick={() => handleStatusUpdate('Processing')}
                      >
                        Start Processing
                      </Button>
                    )}

                    {selectedOrder.status === 'Processing' && (
                      <Button
                        variant="contained"
                        color="warning"
                        disabled={submitting}
                        onClick={() => handleStatusUpdate('Packed')}
                      >
                        Mark as Packed
                      </Button>
                    )}

                    {selectedOrder.status === 'Packed' && (
                      <Button
                        variant="contained"
                        color="info"
                        disabled={submitting}
                        onClick={() => handleStatusUpdate('Shipped')}
                      >
                        Dispatch (Shipped)
                      </Button>
                    )}

                    {selectedOrder.status === 'Shipped' && (
                      <Button
                        variant="contained"
                        color="success"
                        disabled={submitting}
                        onClick={() => handleStatusUpdate('Delivered')}
                      >
                        Confirm Delivery
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Order Line Items
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Total Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item) => (
                      <TableRow key={item.order_item_id}>
                        <TableCell sx={{ fontWeight: 500 }}>{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.unit_price)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.quantity * item.unit_price)}
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

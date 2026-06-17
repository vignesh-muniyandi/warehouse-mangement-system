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
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [form, setForm] = useState({
    product_id: '',
    sku: '',
    barcode: '',
    name: '',
    category_id: '',
    supplier_id: '',
    unit_price: '',
    reorder_level: '0',
    description: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async (searchVal = '') => {
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(searchVal)}`);
      if (res.data.success) {
        setProducts(res.data.data);
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers')
      ]);
      if (catRes.data.success && supRes.data.success) {
        setCategories(catRes.data.data);
        setSuppliers(supRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchFilters();
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchProducts(val);
  };

  const handleOpenAdd = () => {
    setDialogMode('add');
    setForm({
      product_id: '',
      sku: '',
      barcode: '',
      name: '',
      category_id: categories[0]?.category_id || '',
      supplier_id: suppliers[0]?.supplier_id || '',
      unit_price: '',
      reorder_level: '10',
      description: ''
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEdit = (prod) => {
    setDialogMode('edit');
    setForm({
      product_id: prod.product_id,
      sku: prod.sku,
      barcode: prod.barcode || '',
      name: prod.name,
      category_id: prod.category_id || '',
      supplier_id: prod.supplier_id || '',
      unit_price: prod.unit_price,
      reorder_level: prod.reorder_level.toString(),
      description: prod.description || ''
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.sku || !form.name || !form.unit_price) {
      setFormError('SKU, product name, and unit price are required');
      return;
    }

    const price = parseFloat(form.unit_price);
    if (isNaN(price) || price < 0) {
      setFormError('Unit price must be a non-negative number');
      return;
    }

    const reorder = parseInt(form.reorder_level);
    if (isNaN(reorder) || reorder < 0) {
      setFormError('Reorder level must be a non-negative integer');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        unit_price: price,
        reorder_level: reorder
      };

      if (dialogMode === 'add') {
        res = await api.post('/products', payload);
      } else {
        res = await api.put(`/products/${form.product_id}`, payload);
      }

      if (res.data.success) {
        setOpenDialog(false);
        fetchProducts(search);
      } else {
        setFormError(res.data.message || 'Failed to save product');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Error occurred while saving product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Products Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure stock products, pricing parameters, SKU identifiers, and associate supplier sources.
      </Typography>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextField
          placeholder="Search by SKU, barcode, or name..."
          variant="outlined"
          size="small"
          value={search}
          onChange={handleSearch}
          sx={{ width: { xs: '100%', sm: 360 } }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
        >
          Add Product
        </Button>
      </Paper>

      {/* Products Table */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : products.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Product Not Found
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
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Reorder Level</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Stock Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((row) => (
                <TableRow key={row.product_id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{row.sku}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.barcode || '-'}</TableCell>
                  <TableCell>{row.category_name || '-'}</TableCell>
                  <TableCell>{row.supplier_name || '-'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.unit_price)}
                  </TableCell>
                  <TableCell align="right">{row.reorder_level}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{row.stock_quantity}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Floating Back Button */}
      <FloatingBackButton />

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={() => !submitting && setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === 'add' ? 'Add New Product Spec' : 'Modify Product Settings'}
        </DialogTitle>
        <form onSubmit={handleSaveProduct}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SKU Code"
                  name="sku"
                  value={form.sku}
                  onChange={handleFormChange}
                  size="small"
                  required
                  placeholder="e.g. P-1004"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Barcode (EAN/UPC)"
                  name="barcode"
                  value={form.barcode}
                  onChange={handleFormChange}
                  size="small"
                  placeholder="e.g. 100000004"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  size="small"
                  required
                  placeholder="e.g. Laser Scanner Stand"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  name="category_id"
                  value={form.category_id}
                  onChange={handleFormChange}
                  size="small"
                >
                  <MenuItem value="">None</MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c.category_id} value={c.category_id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Primary Supplier"
                  name="supplier_id"
                  value={form.supplier_id}
                  onChange={handleFormChange}
                  size="small"
                >
                  <MenuItem value="">None</MenuItem>
                  {suppliers.map(s => (
                    <MenuItem key={s.supplier_id} value={s.supplier_id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unit Price ($)"
                  type="number"
                  name="unit_price"
                  value={form.unit_price}
                  onChange={handleFormChange}
                  size="small"
                  required
                  placeholder="0.00"
                  inputProps={{ step: '0.01' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reorder Level (Alert Limit)"
                  type="number"
                  name="reorder_level"
                  value={form.reorder_level}
                  onChange={handleFormChange}
                  size="small"
                  required
                  placeholder="10"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  size="small"
                  multiline
                  rows={3}
                  placeholder="Product specifications, size, weight details"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Save Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

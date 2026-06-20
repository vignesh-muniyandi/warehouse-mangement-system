import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

const DEFAULT_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  phone: '',
  role_id: '',
  warehouse_id: '',
  status: 'Active',
};

export default function AddUserModal({ open, mode = 'add', initialData = null, onClose, onSubmit, roles, warehouses, loading, error }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setForm({
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          email: initialData.email || '',
          password: '',
          phone: initialData.phone || '',
          role_id: initialData.role_id || '',
          warehouse_id: initialData.warehouse_id || '',
          status: initialData.status || 'Active',
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setLocalError('');
    }
  }, [open, mode, initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!form.first_name || !form.last_name || !form.email || !form.role_id || !form.warehouse_id || !form.status) {
      setLocalError('Please fill all required fields before saving.');
      return;
    }

    if (mode === 'add' && !form.password) {
      setLocalError('Password is required for new users.');
      return;
    }

    try {
      await onSubmit({ ...form, role_id: Number(form.role_id), warehouse_id: Number(form.warehouse_id) });
    } catch (submitError) {
      setLocalError(submitError?.message || 'Unable to save user');
    }
  };

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'add' ? 'Create New User' : 'Edit User'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {(localError || error) && <Alert severity="error" sx={{ mb: 2 }}>{localError || error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={mode === 'add' ? 'Password' : 'New Password (leave empty to retain)'}
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                size="small"
                required={mode === 'add'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Role"
                name="role_id"
                value={form.role_id}
                onChange={handleChange}
                size="small"
                required
              >
                <MenuItem value="">Select role</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Warehouse"
                name="warehouse_id"
                value={form.warehouse_id}
                onChange={handleChange}
                size="small"
                required
              >
                <MenuItem value="">Select warehouse</MenuItem>
                {warehouses.map((warehouse) => (
                  <MenuItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={form.status}
                onChange={handleChange}
                size="small"
                required
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Locked">Locked</MenuItem>
                <MenuItem value="Suspended">Suspended</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => onClose()} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}>
            {loading ? <CircularProgress size={20} /> : mode === 'add' ? 'Save User' : 'Update User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

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
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Detail Drawer State
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // CRUD Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [form, setForm] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    role_id: '',
    status: 'Active'
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Dialog State
  const [openDelete, setOpenDelete] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async (searchVal = '', roleVal = '') => {
    try {
      const res = await api.get(`/users?search=${encodeURIComponent(searchVal)}&role=${encodeURIComponent(roleVal)}`);
      if (res.data.success) {
        setUsers(res.data.data);
      } else {
        setError('Failed to load users list');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchUsers(val, roleFilter);
  };

  const handleRoleFilter = (e) => {
    const val = e.target.value;
    setRoleFilter(val);
    fetchUsers(search, val);
  };

  const handleOpenAdd = () => {
    setDialogMode('add');
    setForm({
      user_id: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      role_id: roles[0]?.role_id || '',
      status: 'Active'
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEdit = (user, e) => {
    e.stopPropagation(); // Avoid triggering row click / drawer
    setDialogMode('edit');
    setForm({
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '', // Leave empty to keep unchanged
      phone: user.phone || '',
      role_id: roles.find(r => r.role_name === user.role_name)?.role_id || '',
      status: user.status
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenDelete = (user, e) => {
    e.stopPropagation();
    setUserToDelete(user);
    setOpenDelete(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.first_name || !form.last_name || !form.email || !form.role_id) {
      setFormError('First name, last name, email and role are required');
      return;
    }

    if (dialogMode === 'add' && !form.password) {
      setFormError('Password is required for new users');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (dialogMode === 'add') {
        res = await api.post('/users', form);
      } else {
        res = await api.put(`/users/${form.user_id}`, form);
      }

      if (res.data.success) {
        setOpenDialog(false);
        fetchUsers(search, roleFilter);
      } else {
        setFormError(res.data.message || 'Failed to save user');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Error occurred while saving user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/users/${userToDelete.user_id}`);
      if (res.data.success) {
        setOpenDelete(false);
        fetchUsers(search, roleFilter);
      } else {
        alert(res.data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error occurred while deleting user.');
    } finally {
      setSubmitting(false);
      setUserToDelete(null);
    }
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Users Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage warehouse operators, managers, and delivery personnel authorization profiles.
      </Typography>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1, maxSelfAlign: 'stretch' }}>
          <TextField
            placeholder="Search users by name or email..."
            variant="outlined"
            size="small"
            value={search}
            onChange={handleSearch}
            sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
            }}
          />

          <TextField
            select
            label="Role"
            variant="outlined"
            size="small"
            value={roleFilter}
            onChange={handleRoleFilter}
            sx={{ width: 160 }}
          >
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Warehouse Manager">Warehouse Manager</MenuItem>
            <MenuItem value="Worker/Operator">Worker/Operator</MenuItem>
            <MenuItem value="Delivery Team">Delivery Team</MenuItem>
          </TextField>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
        >
          Add User
        </Button>
      </Paper>

      {/* Users Table */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : users.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            User Not Found
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Full Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((row) => (
                <TableRow
                  key={row.user_id}
                  hover
                  onClick={() => handleRowClick(row)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
                    {row.first_name} {row.last_name}
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip label={row.role_name} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      color={row.status === 'Active' ? 'success' : row.status === 'Locked' ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" color="primary" onClick={(e) => handleOpenEdit(row, e)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={(e) => handleOpenDelete(row, e)}>
                      <DeleteIcon fontSize="small" />
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

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={() => !submitting && setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === 'add' ? 'Create New User Account' : 'Edit User Settings'}
        </DialogTitle>
        <form onSubmit={handleSaveUser}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleFormChange}
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
                  onChange={handleFormChange}
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={dialogMode === 'add' ? "Password" : "New Password (leave empty to retain)"}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  size="small"
                  required={dialogMode === 'add'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Role Profile"
                  name="role_id"
                  value={form.role_id}
                  onChange={handleFormChange}
                  size="small"
                  required
                >
                  {roles.map(r => (
                    <MenuItem key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Account Status"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  size="small"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Locked">Locked (Failed attempts)</MenuItem>
                  <MenuItem value="Suspended">Suspended</MenuItem>
                </TextField>
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
              {submitting ? <CircularProgress size={24} /> : 'Save User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm User Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete user <strong>{userToDelete?.first_name} {userToDelete?.last_name}</strong> ({userToDelete?.email})? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDelete(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Slide-out Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 300, sm: 380 }, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ bgcolor: '#eff6ff', width: 48, height: 48 }}>
              <PersonIcon color="primary" fontSize="medium" />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                User Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Profile view and history
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {selectedUser && (
            <Grid container spacing={3.5}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  FULL NAME
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  EMAIL ADDRESS
                </Typography>
                <Typography variant="body1" sx={{ color: '#1e293b' }}>
                  {selectedUser.email}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  PHONE NUMBER
                </Typography>
                <Typography variant="body1" sx={{ color: '#1e293b' }}>
                  {selectedUser.phone || 'Not specified'}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ROLE ASSIGNMENT
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={selectedUser.role_name} variant="outlined" color="primary" />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ACCOUNT STATUS
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedUser.status}
                    color={selectedUser.status === 'Active' ? 'success' : selectedUser.status === 'Locked' ? 'warning' : 'error'}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  LAST LOGIN
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never logged in'}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  CREATED ON
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  {new Date(selectedUser.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}

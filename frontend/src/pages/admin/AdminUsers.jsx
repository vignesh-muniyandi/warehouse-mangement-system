import React, { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import adminService from '../../services/adminService';
import SearchBox from '../../components/SearchBox';
import UserTable from '../../components/UserTable';
import AddUserModal from '../../components/AddUserModal';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const result = await adminService.fetchUsers();
      if (result.success) {
        setUsers(result.data);
      } else {
        setError(result.message || 'Unable to load users');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMetadata = async () => {
    setLoadingMeta(true);
    try {
      const [rolesResult, warehousesResult] = await Promise.all([adminService.fetchRoles(), adminService.fetchWarehouses()]);
      console.log('[AdminUsers] Roles Result:', rolesResult);
      console.log('[AdminUsers] Warehouses Result:', warehousesResult);
      
      if (rolesResult.success) {
        setRoles(rolesResult.data);
      } else {
        console.error('[AdminUsers] Roles fetch failed:', rolesResult.message);
      }
      if (warehousesResult.success) {
        setWarehouses(warehousesResult.data);
      } else {
        console.error('[AdminUsers] Warehouses fetch failed:', warehousesResult.message);
      }
    } catch (err) {
      console.error('[AdminUsers] Metadata fetch error:', err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedUser(null);
    setSubmitError('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setSubmitError('');
  };

  useEffect(() => {
    fetchAllUsers();
    fetchMetadata();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm) {
        fetchAllUsers();
        return;
      }

      setLoadingUsers(true);
      try {
        const result = await adminService.searchUsers(searchTerm);
        if (result.success) {
          setUsers(result.data);
          setError('');
        } else {
          setError(result.message || 'Unable to search users');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Unable to search users');
      } finally {
        setLoadingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCreateUser = async (payload) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await adminService.createUser(payload);
      if (result.success) {
        setModalOpen(false);
        await fetchAllUsers();
      } else {
        setSubmitError(result.message || 'Failed to create user');
        throw new Error(result.message || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
      if (!submitError) {
        setSubmitError(err.response?.data?.message || err.message || 'Failed to create user');
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const openEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setModalOpen(true);
    setSubmitError('');
  };

  const handleUpdateUser = async (payload) => {
    if (!selectedUser) {
      throw new Error('No user selected for update');
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await adminService.updateUser(selectedUser.user_id, payload);
      if (result.success) {
        setModalOpen(false);
        setSelectedUser(null);
        await fetchAllUsers();
      } else {
        setSubmitError(result.message || 'Failed to update user');
        throw new Error(result.message || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
      if (!submitError) {
        setSubmitError(err.response?.data?.message || err.message || 'Failed to update user');
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  };


  const loading = loadingUsers || loadingMeta;

  const renderedContent = useMemo(() => {
    return (
      <UserTable
        users={users}
        loading={loadingUsers}
        error={error}
        noDataMessage={searchTerm ? 'No matching users found.' : 'No users available.'}
        onEdit={openEditUser}
      />
    );
  }, [users, loadingUsers, error, searchTerm]);

  return (
    <Box sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Admin User Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create, search, and manage user accounts for warehouse staff, managers, and delivery teams.
      </Typography>

      <Paper sx={{ p: 3, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <SearchBox value={searchTerm} onChange={handleSearchChange} />
          </Grid>
        </Grid>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}>
          Add User
        </Button>
      </Paper>

      {renderedContent}

      <AddUserModal
        open={modalOpen}
        mode={modalMode}
        initialData={selectedUser}
        onClose={handleCloseModal}
        onSubmit={modalMode === 'add' ? handleCreateUser : handleUpdateUser}
        roles={roles}
        warehouses={warehouses}
        loading={submitting}
        error={submitError}
      />
      {loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && !loading && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
    </Box>
  );
}

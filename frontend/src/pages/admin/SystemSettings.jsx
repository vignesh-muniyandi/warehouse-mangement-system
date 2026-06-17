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
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

const MODULES = ['dashboard', 'users', 'products', 'inventory', 'purchase', 'orders', 'reports', 'settings'];
const ACTIONS = ['read', 'write', 'delete'];

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    'warehouse.name': '',
    'notifications.email_enabled': 'false',
    'audit.retention_days': '90'
  });

  // Roles state
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchSettingsData = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        const { settings: settingsList, roles: rolesList } = res.data.data;

        // Map settings array to key-value object
        const settingsObj = {};
        settingsList.forEach(s => {
          settingsObj[s.key] = s.value;
        });

        setSettings(settingsObj);
        setRoles(rolesList);
      } else {
        setError('Failed to fetch settings data');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSuccessMsg('');
    setError('');
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await api.post('/settings', { settings });
      if (res.data.success) {
        setSuccessMsg('System configurations saved successfully');
      } else {
        setError(res.data.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while saving configurations.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if a role has specific module permission
  const checkPermission = (role, moduleName, actionName) => {
    const permString = role.permissions[moduleName] || '';
    const perms = permString.split(',').map(p => p.trim());
    return perms.includes(actionName);
  };

  // Toggle permission for a role
  const handleTogglePermission = async (roleId, moduleName, actionName) => {
    const updatedRoles = roles.map(role => {
      if (role.role_id === roleId) {
        const permString = role.permissions[moduleName] || '';
        let perms = permString ? permString.split(',').map(p => p.trim()) : [];

        if (perms.includes(actionName)) {
          perms = perms.filter(p => p !== actionName);
        } else {
          perms.push(actionName);
        }

        const newPermissions = {
          ...role.permissions,
          [moduleName]: perms.join(',')
        };

        // If no permissions left for the module, remove the module key
        if (perms.length === 0) {
          delete newPermissions[moduleName];
        }

        return {
          ...role,
          permissions: newPermissions
        };
      }
      return role;
    });

    setRoles(updatedRoles);
    
    // Auto-save the specific role permission change
    const changedRole = updatedRoles.find(r => r.role_id === roleId);
    try {
      await api.put(`/roles/${roleId}/permissions`, { permissions: changedRole.permissions });
      setSuccessMsg(`Permissions updated for role ${changedRole.role_name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to auto-save permissions change');
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        System Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure warehouse profile properties, alerts retention periods, and manage authorization levels.
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Warehouse Profile & Alerts" />
          <Tab label="Role Permissions Matrix" />
        </Tabs>
      </Paper>

      {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : activeTab === 0 ? (
        /* WAREHOUSE SETTINGS FORM */
        <Paper sx={{ p: 4 }}>
          <form onSubmit={handleSaveSettings}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  General System Config
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Warehouse System Name"
                  name="warehouse.name"
                  value={settings['warehouse.name'] || ''}
                  onChange={handleSettingChange}
                  size="small"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Audit Log Retention (Days)"
                  type="number"
                  name="audit.retention_days"
                  value={settings['audit.retention_days'] || ''}
                  onChange={handleSettingChange}
                  size="small"
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
                  Alert & Notifications Configurations
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="notifications.email_enabled"
                      checked={settings['notifications.email_enabled'] === 'true'}
                      onChange={handleSettingChange}
                      color="primary"
                    />
                  }
                  label="Enable Email Alerts (low stock, system notifications)"
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Save Configurations'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      ) : (
        /* ROLE PERMISSIONS GRID MATRIX */
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Toggling switches below automatically updates and commits the corresponding role authorizations in real-time.
          </Alert>

          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Role Profile</TableCell>
                  {MODULES.map(mod => (
                    <TableCell key={mod} align="center" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {mod}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role.role_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{role.role_name}</TableCell>
                    {MODULES.map(mod => (
                      <TableCell key={mod} align="center" sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          {ACTIONS.map(action => {
                            // Don't show delete checkbox for non-user/product modules to keep clean
                            if (action === 'delete' && !['users', 'products'].includes(mod)) {
                              return null;
                            }
                            const hasPerm = checkPermission(role, mod, action);
                            return (
                              <FormControlLabel
                                key={action}
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={hasPerm}
                                    disabled={role.role_name === 'Admin'} // Admin has absolute locks
                                    onChange={() => handleTogglePermission(role.role_id, mod, action)}
                                  />
                                }
                                label={
                                  <Typography variant="caption" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>
                                    {action}
                                  </Typography>
                                }
                                sx={{ m: 0 }}
                              />
                            );
                          })}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Floating Back Button */}
      <FloatingBackButton />
    </Box>
  );
}

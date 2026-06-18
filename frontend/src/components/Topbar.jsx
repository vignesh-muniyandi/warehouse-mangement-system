import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

// Map route segments to readable page titles
const PAGE_TITLES = {
  overview: 'Dashboard Overview',
  admin: 'Dashboard Overview',
  users: 'Users Management',
  products: 'Products Management',
  inventory: 'Inventory Management',
  'purchase-orders': 'Purchase Orders',
  orders: 'Orders Management',
  reports: 'Reports & Analytics',
  settings: 'System Settings',
};

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const segment = location.pathname.split('/').filter(Boolean).pop();
  const pageTitle = title || PAGE_TITLES[segment] || 'Warehouse Management System';

  // Generate avatar initials
  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
    : 'A';

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        color: '#1e293b',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 3, minHeight: '64px !important' }}>
        {/* Page Title */}
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>
          {pageTitle}
        </Typography>

        {/* Right Side Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Role Badge */}
          <Chip
            label={user?.role_name || 'Admin'}
            size="small"
            sx={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />

          <IconButton
            aria-label="Notifications"
            size="small"
            sx={{
              border: '1px solid #e2e8f0',
              color: '#475569',
              '&:hover': { backgroundColor: '#eff6ff', color: '#2563eb' },
            }}
          >
            <NotificationsNoneIcon fontSize="small" />
          </IconButton>

          {/* Avatar */}
          <Avatar
            sx={{
              width: 36,
              height: 36,
              backgroundColor: '#2563eb',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>

          {/* Name */}
          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
            {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
          </Typography>

          {/* Logout */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={logout}
            sx={{
              borderColor: '#e2e8f0',
              color: '#64748b',
              fontSize: '0.8rem',
              '&:hover': {
                borderColor: '#ef4444',
                color: '#ef4444',
                backgroundColor: '#fff1f2',
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

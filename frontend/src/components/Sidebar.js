import React from 'react';
import { NavLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';

import { useAuth } from '../context/AuthContext';

const itemsByRole = {
  Admin: [
    { label: 'Dashboard', path: '/dashboard/admin', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Users', path: '/dashboard/admin/users', icon: <PeopleIcon fontSize="small" /> },
    { label: 'Products', path: '/dashboard/admin/products', icon: <ShoppingBagIcon fontSize="small" /> },
    { label: 'Inventory', path: '/dashboard/admin/inventory', icon: <WarehouseIcon fontSize="small" /> },
    { label: 'Purchase Orders', path: '/dashboard/admin/purchase-orders', icon: <LocalShippingIcon fontSize="small" /> },
    { label: 'Orders', path: '/dashboard/admin/orders', icon: <ShoppingCartIcon fontSize="small" /> },
    { label: 'Reports', path: '/dashboard/admin/reports', icon: <AssessmentIcon fontSize="small" /> },
    { label: 'Settings', path: '/dashboard/admin/settings', icon: <SettingsIcon fontSize="small" /> },
  ],
  'Warehouse Manager': [
    { label: 'Dashboard', path: '/dashboard/overview', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Inventory', path: '/dashboard/inventory', icon: <WarehouseIcon fontSize="small" /> },
    { label: 'Orders', path: '/dashboard/orders', icon: <ShoppingCartIcon fontSize="small" /> },
    { label: 'Reports', path: '/dashboard/reports', icon: <AssessmentIcon fontSize="small" /> },
  ],
  'Worker/Operator': [
    { label: 'Dashboard', path: '/dashboard/overview', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Inventory', path: '/dashboard/inventory', icon: <WarehouseIcon fontSize="small" /> },
    { label: 'My Tasks', path: '/dashboard/orders', icon: <AssignmentIcon fontSize="small" /> },
  ],
  'Delivery Team': [
    { label: 'Dashboard', path: '/dashboard/overview', icon: <DashboardIcon fontSize="small" /> },
    { label: 'My Deliveries', path: '/dashboard/orders', icon: <DeliveryDiningIcon fontSize="small" /> },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const items = itemsByRole[user?.role_name] || itemsByRole['Admin'];

  return (
    <Box
      sx={{
        width: 240,
        minHeight: '100vh',
        borderRight: '1px solid #e2e8f0',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo / Brand */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarehouseIcon sx={{ color: '#60a5fa', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#f1f5f9', fontWeight: 700, lineHeight: 1.2 }}>
              WMS Admin
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {user?.role_name || 'Management'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#334155', mx: 2, mb: 1 }} />

      {/* Navigation Items */}
      <List sx={{ px: 1.5, flex: 1, pt: 1 }}>
        {items.map((item) => (
          <ListItem
            key={item.path}
            component={NavLink}
            to={item.path}
            disablePadding
            sx={{
              mb: 0.5,
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'block',
              textDecoration: 'none',
              color: '#94a3b8',
              '&.active': {
                color: '#f1f5f9',
                backgroundColor: 'rgba(255,255,255,0.08)',
                '& .MuiListItemIcon-root': { color: '#60a5fa' },
                '& .MuiListItemText-primary': { fontWeight: 600, color: '#f1f5f9' },
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#f1f5f9',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1.1, gap: 1.5 }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 0 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500, fontSize: '0.875rem' }}
                sx={{ m: 0 }}
              />
            </Box>
          </ListItem>
        ))}
      </List>

      {/* Bottom user info */}
      <Box sx={{ p: 2, borderTop: '1px solid #334155' }}>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Signed in as
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500, mt: 0.25 }}>
          {user?.first_name} {user?.last_name}
        </Typography>
      </Box>
    </Box>
  );
}

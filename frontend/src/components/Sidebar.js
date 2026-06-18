import React from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';

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
import LogoutIcon from '@mui/icons-material/Logout';
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';

import { useAuth } from '../context/AuthContext';

const itemsByRole = {
  Admin: [
    { label: 'Dashboard', path: '/admin', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Users', path: '/admin/users', icon: <PeopleIcon fontSize="small" /> },
    { label: 'Products', path: '/admin/products', icon: <ShoppingBagIcon fontSize="small" /> },
    { label: 'Inventory', path: '/admin/inventory', icon: <WarehouseIcon fontSize="small" /> },
    { label: 'Purchase Orders', path: '/admin/purchase-orders', icon: <LocalShippingIcon fontSize="small" /> },
    { label: 'Orders', path: '/admin/orders', icon: <ShoppingCartIcon fontSize="small" /> },
    { label: 'Reports', path: '/admin/reports', icon: <AssessmentIcon fontSize="small" /> },
    { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon fontSize="small" /> },
  ],
  'Warehouse Manager': [
    { label: 'Dashboard Summary', module: 'dashboard', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Inventory Monitoring', module: 'inventory', icon: <WarehouseIcon fontSize="small" /> },
    { label: 'Order Management', module: 'orders', icon: <ShoppingCartIcon fontSize="small" /> },
    { label: 'Task Management', module: 'tasks', icon: <AssignmentIcon fontSize="small" /> },
    { label: 'Inbound Management', module: 'inbound', icon: <InputIcon fontSize="small" /> },
    { label: 'Outbound Management', module: 'outbound', icon: <OutputIcon fontSize="small" /> },
    { label: 'Reports & Analytics', module: 'reports', icon: <AssessmentIcon fontSize="small" /> },
    { label: 'Settings', module: 'settings', icon: <SettingsIcon fontSize="small" /> },
  ],
  'Worker/Operator': [
    { label: 'My Tasks', path: '/worker', icon: <AssignmentIcon fontSize="small" /> },
    { label: 'Scan', path: '/worker', icon: <QrCodeScannerIcon fontSize="small" /> },
  ],
  'Delivery Team': [
    { label: 'My Deliveries', path: '/delivery', icon: <DeliveryDiningIcon fontSize="small" /> },
    { label: 'Routes', path: '/delivery', icon: <LocalShippingIcon fontSize="small" /> },
  ],
};

function ManagerNavItem({ item, activeModule, onSelect }) {
  const isActive = activeModule === item.module;
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={() => onSelect(item.module)}
        sx={{
          borderRadius: '8px',
          color: isActive ? '#f1f5f9' : '#94a3b8',
          backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#f1f5f9',
          },
        }}
      >
        <ListItemIcon sx={{ color: isActive ? '#60a5fa' : 'inherit', minWidth: 36 }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ variant: 'body2', fontWeight: isActive ? 600 : 500, fontSize: '0.875rem' }}
        />
      </ListItemButton>
    </ListItem>
  );
}

export default function Sidebar({ activeModule, onModuleChange }) {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const items = itemsByRole[user?.role_name] || itemsByRole.Admin;
  const isManager = user?.role_name === 'Warehouse Manager';
  const currentModule = activeModule || searchParams.get('module') || 'dashboard';

  const handleModuleSelect = (module) => {
    if (onModuleChange) {
      onModuleChange(module);
    } else {
      setSearchParams({ module });
    }
  };

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
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarehouseIcon sx={{ color: '#60a5fa', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#f1f5f9', fontWeight: 700, lineHeight: 1.2 }}>
              WMS
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {user?.role_name || 'Management'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#334155', mx: 2, mb: 1 }} />

      <List sx={{ px: 1.5, flex: 1, pt: 1 }}>
        {isManager
          ? items.map((item) => (
              <ManagerNavItem
                key={item.module}
                item={item}
                activeModule={currentModule}
                onSelect={handleModuleSelect}
              />
            ))
          : items.map((item) => (
              <ListItem
                key={item.path}
                component={NavLink}
                to={item.path}
                end={item.path === '/admin'}
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

      <Box sx={{ p: 2, borderTop: '1px solid #334155' }}>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Signed in as
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500, mt: 0.25 }}>
          {user?.first_name} {user?.last_name}
        </Typography>
        <Button
          fullWidth
          size="small"
          startIcon={<LogoutIcon />}
          onClick={logout}
          sx={{ mt: 1.5, color: '#f8fafc', borderColor: '#475569' }}
          variant="outlined"
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
}

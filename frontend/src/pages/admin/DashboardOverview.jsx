import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WarningIcon from '@mui/icons-material/Warning';
import TodayIcon from '@mui/icons-material/Today';

import api from '../../api/axios';
import DashboardCard from '../../components/DashboardCard';

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [recentData, setRecentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.get('/dashboard/admin/summary'),
          api.get('/dashboard/notifications')
        ]);
        if (statsRes.data.success && recentRes.data.success) {
          setStats(statsRes.data.data);
          setRecentData(recentRes.data.data);
        } else {
          setError('Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading dashboard statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading dashboard data...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  // Map dynamic backend stats to front-end cards with appropriate styling and icons
  const summaryCards = [
    { title: 'Total Products', value: stats.totalProducts, icon: <ShoppingBagIcon />, color: '#0ea5e9', bg: '#e0f2fe' },
    { title: 'Total Categories', value: stats.totalCategories, icon: <CategoryIcon />, color: '#8b5cf6', bg: '#f5f3ff' },
    { title: 'Total Suppliers', value: stats.totalSuppliers, icon: <BusinessIcon />, color: '#10b981', bg: '#ecfdf5' },
    { title: 'Total Purchase Orders', value: stats.totalPurchaseOrders, icon: <ReceiptLongIcon />, color: '#f59e0b', bg: '#fffbeb' },
    { title: 'Total Sales Orders', value: stats.totalSalesOrders, icon: <ShoppingCartIcon />, color: '#ec4899', bg: '#fdf2f8' },
    { 
      title: 'Current Stock Value', 
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.currentStockValue), 
      icon: <MonetizationOnIcon />, 
      color: '#06b6d4', 
      bg: '#ecfeff' 
    },
    { 
      title: 'Low Stock Alerts', 
      value: stats.lowStockAlerts, 
      icon: <WarningIcon />, 
      color: stats.lowStockAlerts > 0 ? '#ef4444' : '#64748b', 
      bg: stats.lowStockAlerts > 0 ? '#fee2e2' : '#f1f5f9' 
    },
    { title: 'Pending Deliveries', value: stats.pendingDeliveries, icon: <LocalShippingIcon />, color: '#3b82f6', bg: '#eff6ff' },
    { title: "Today's Activities", value: stats.todayActivities, icon: <TodayIcon />, color: '#14b8a6', bg: '#f0fdfa' },
    { 
      title: 'System Notifications', 
      value: stats.systemNotifications, 
      icon: <NotificationsIcon />, 
      color: stats.systemNotifications > 0 ? '#f43f5e' : '#64748b', 
      bg: stats.systemNotifications > 0 ? '#fff1f2' : '#f1f5f9' 
    },
  ];

  // 6 Main navigation entry points
  const moduleCards = [
    {
      title: 'Users Management',
      description: 'Add, edit, delete users and manage user access details.',
      path: '/dashboard/admin/users',
      icon: <PeopleIcon sx={{ fontSize: 36, color: '#3b82f6' }} />,
      borderColor: '#3b82f6'
    },
    {
      title: 'Products Management',
      description: 'Manage SKU, product details, categories, and unit pricing.',
      path: '/dashboard/admin/products',
      icon: <ShoppingBagIcon sx={{ fontSize: 36, color: '#8b5cf6' }} />,
      borderColor: '#8b5cf6'
    },
    {
      title: 'Inventory Management',
      description: 'Monitor stock levels, adjust quantity, and process transfers.',
      path: '/dashboard/admin/inventory',
      icon: <WarehouseIcon sx={{ fontSize: 36, color: '#10b981' }} />,
      borderColor: '#10b981'
    },
    {
      title: 'Purchase Orders',
      description: 'Create POs, request supplier approval, and receive warehouse goods.',
      path: '/dashboard/admin/purchase-orders',
      icon: <LocalShippingIcon sx={{ fontSize: 36, color: '#f59e0b' }} />,
      borderColor: '#f59e0b'
    },
    {
      title: 'Orders Management',
      description: 'Track sales orders, update statuses, and assign operators.',
      path: '/dashboard/admin/orders',
      icon: <ShoppingCartIcon sx={{ fontSize: 36, color: '#ec4899' }} />,
      borderColor: '#ec4899'
    },
    {
      title: 'System Settings',
      description: 'Configure warehouse properties, permissions, and security parameters.',
      path: '/dashboard/admin/settings',
      icon: <SettingsIcon sx={{ fontSize: 36, color: '#64748b' }} />,
      borderColor: '#64748b'
    }
  ];

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
        Operations Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Real-time status overview of the Warehouse Management System database.
      </Typography>

      {/* 10 Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {summaryCards.map((card) => (
          <Grid item key={card.title} xs={12} sm={6} md={4} lg={2.4}>
            <DashboardCard 
              title={card.title} 
              value={card.value} 
              icon={card.icon} 
              iconColor={card.color} 
              iconBg={card.bg}
            />
          </Grid>
        ))}
      </Grid>

      {/* 6 Clickable Module Cards */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 3 }}>
        Management Modules
      </Typography>
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {moduleCards.map((mod) => (
          <Grid item key={mod.title} xs={12} sm={6} md={4}>
            <Paper
              onClick={() => navigate(mod.path)}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                borderTop: `4px solid ${mod.borderColor}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <Avatar sx={{ bgcolor: '#f8fafc', width: 56, height: 56 }}>
                  {mod.icon}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {mod.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                {mod.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Notifications and Activity */}
      <Grid container spacing={3}>
        {/* System Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '8px', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                System Notifications
              </Typography>
            </Box>
            <Divider />
            <List>
              {recentData?.notifications?.length > 0 ? (
                recentData.notifications.map((n) => (
                  <ListItem key={n.notification_id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: n.read_status ? '#f1f5f9' : '#fee2e2' }}>
                        <NotificationsIcon color={n.read_status ? 'action' : 'error'} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={n.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {n.message}
                          </Typography>
                          <br />
                          <Typography component="span" variant="caption" color="text.secondary">
                            {new Date(n.created_at).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No notifications found
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Audit Log / Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '8px', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Recent Activities
              </Typography>
            </Box>
            <Divider />
            <List>
              {recentData?.activities?.length > 0 ? (
                recentData.activities.map((act) => (
                  <ListItem key={act.audit_id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#eff6ff' }}>
                        <HistoryIcon color="primary" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                          {act.action.replace(/_/g, ' ')}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.secondary">
                            By {act.first_name ? `${act.first_name} ${act.last_name}` : 'System'} ({act.ip_address || 'Internal'})
                          </Typography>
                          <br />
                          <Typography component="span" variant="caption" color="text.secondary">
                            {new Date(act.created_at).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No recent activity found
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

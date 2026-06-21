import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/common/Navbar';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import ChartCard from '../components/common/ChartCard';
import TaskCard from '../components/common/TaskCard';
import ModalDialog from '../components/common/ModalDialog';
import { useAuth } from '../context/AuthContext';
import usePermission from '../hooks/usePermission';
import api from '../api/axios';
import useDeliverySocket from '../hooks/useDeliverySocket';


const green = '#15803d';

const MODULE_TITLES = {
  dashboard: 'Dashboard Summary',
  inventory: 'Inventory Monitoring',
  orders: 'Order Management',
  tasks: 'Task Management',
  inbound: 'Inbound Management',
  outbound: 'Outbound Management',
  reports: 'Reports & Analytics',
  settings: 'Settings',
};

export default function ManagerDashboard() {
  const { user, token } = useAuth();
  const { hasPermission } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get('module') || 'dashboard';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [kpis, setKpis] = useState({});
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { connected, events } = useDeliverySocket(token);

  const [inventorySearch, setInventorySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [request, setRequest] = useState({ product_id: '', warehouse_id: '', adjustment_type: 'add', quantity: '', reason: '' });
  const [taskForm, setTaskForm] = useState({ title: '', assigned_user_id: '', task_type: 'pick', priority: 'Normal', notes: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);

  const workers = useMemo(() => staff.filter((person) => person.role_name === 'Worker/Operator'), [staff]);
  const lowStockItems = useMemo(
    () => inventory.filter((item) => Number(item.quantity_available) <= Number(item.reorder_level || 0)),
    [inventory]
  );
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed'), [tasks]);
  const inboundShipments = useMemo(
    () => purchaseOrders.filter((po) => ['Pending', 'Approved', 'In Transit'].includes(po.status)),
    [purchaseOrders]
  );
  const outboundShipments = useMemo(
    () => orders.filter((order) => ['Pending', 'Packed', 'Shipped', 'Out for Delivery'].includes(order.status)),
    [orders]
  );

  const filteredInventory = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter((item) =>
      [item.sku, item.product_name, item.barcode].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [inventory, inventorySearch]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      [order.order_id, order.customer_name, order.status].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [orders, orderSearch]);

  const canReadInventory = hasPermission('inventory:read');
  const canReadOrders = hasPermission('orders:read');
  const canReadTasks = hasPermission('tasks:read');
  const canReadPurchaseOrders = hasPermission('purchase_orders:read');
  const canReadStaff = hasPermission('tasks:create') || hasPermission('orders:assign');
  const canReadSettings = hasPermission('settings:read');

  const [showSettingsWarning, setShowSettingsWarning] = useState(false);

  const loadData = useCallback(async () => {
    console.group('[ManagerDashboard] loadData start');
    console.log({ canReadInventory, canReadOrders, canReadTasks, canReadPurchaseOrders, canReadStaff, canReadSettings, tokenPresent: Boolean(token) });
    setLoading(true);
    setError('');
    const calls = [
      api.get('/dashboard/manager/summary').then((res) => {
        console.log('[ManagerDashboard] summary response', res.data);
        setSummary(res.data.data || {});
      }),
      api.get('/dashboard/manager/kpis').then((res) => {
        console.log('[ManagerDashboard] kpis response', res.data);
        setKpis(res.data.data || {});
      }),
    ];
    if (canReadInventory) calls.push(api.get('/inventory').then((res) => {
      console.log('[ManagerDashboard] inventory response', res.data);
      setInventory(res.data.data || []);
    }));
    if (canReadOrders) calls.push(api.get('/orders').then((res) => {
      console.log('[ManagerDashboard] orders response', res.data);
      setOrders(res.data.data || []);
    }));
    if (canReadTasks) calls.push(api.get('/tasks').then((res) => {
      console.log('[ManagerDashboard] tasks response', res.data);
      setTasks(res.data.data || []);
    }));
    if (canReadPurchaseOrders) calls.push(api.get('/purchase-orders').then((res) => {
      console.log('[ManagerDashboard] purchase-orders response', res.data);
      setPurchaseOrders(res.data.data || []);
    }));
    if (!canReadPurchaseOrders) setShowSettingsWarning(true);
    if (canReadStaff) calls.push(api.get('/staff').then((res) => {
      console.log('[ManagerDashboard] staff response', res.data);
      setStaff(res.data.data || []);
    }));
    if (canReadSettings) calls.push(api.get('/settings').then((res) => {
      console.log('[ManagerDashboard] settings response', res.data);
      setSettings(res.data.data || []);
    }));

    const results = await Promise.allSettled(calls);
    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length) {
      console.error('[ManagerDashboard] loadData failures', rejected.map((result) => result.status === 'rejected' ? result.reason : null));
      setError('Some live data could not be loaded. Check permissions or API health.');
    }
    setLoading(false);
    console.log('[ManagerDashboard] loadData finished', { loading: false });
    console.groupEnd();
  }, [canReadInventory, canReadOrders, canReadTasks, canReadPurchaseOrders, canReadStaff, canReadSettings, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await api.get('/manager/notifications');
        console.log('[ManagerDashboard] notifications response', response.data);
        setNotifications(response.data.data || []);
      } catch (err) {
        console.error('[ManagerDashboard] notifications error', err.response?.data || err.message);
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    if (events.notification) {
      setNotifications((current) => [events.notification, ...current].slice(0, 20));
      setMessage(`New notification: ${events.notification.title}`);
    }
  }, [events.notification]);

  const handleModuleChange = (module) => setSearchParams({ module });


  const submitAdjustmentRequest = async (event) => {
    event.preventDefault();
    await api.post('/inventory/request-adjustment', request);
    setMessage('Adjustment request submitted for approval.');
    setRequest({ product_id: '', warehouse_id: '', adjustment_type: 'add', quantity: '', reason: '' });
  };

  const createTask = async (event) => {
    event.preventDefault();
    await api.post('/tasks', taskForm);
    setMessage('Task created and assigned.');
    setTaskForm({ title: '', assigned_user_id: '', task_type: 'pick', priority: 'Normal', notes: '' });
    loadData();
  };

  const completeTask = async (taskId) => {
    await api.put(`/tasks/${taskId}`, { status: 'Completed' });
    setMessage('Task marked as completed.');
    loadData();
  };

  const assignOrder = async (orderId, assignedUserId) => {
    if (!assignedUserId) return;
    await api.put(`/orders/${orderId}/assign`, { assigned_user_id: assignedUserId });
    setMessage('Order assigned to warehouse staff.');
    loadData();
  };

  const updateOrderStatus = async (orderId, status) => {
    if (!status) return;
    await api.put(`/orders/${orderId}/status`, { status });
    setMessage(`Order #${orderId} updated to ${status}.`);
    loadData();
  };

  const updatePoStatus = async (poId, status) => {
    await api.put(`/purchase-orders/${poId}/status`, { status });
    setMessage(`Inbound shipment #${poId} updated to ${status}.`);
    loadData();
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((notification) => (
        notification.notification_id === notificationId
          ? { ...notification, read_status: true }
          : notification
      )));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to mark notification as read.');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const unreadIds = notifications.filter((notification) => !notification.read_status).map((notification) => notification.notification_id);
      await Promise.all(unreadIds.map((id) => api.patch(`/notifications/${id}/read`)));
      setNotifications((current) => current.map((notification) => ({ ...notification, read_status: true })));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to mark all notifications as read.');
    }
  };

  const exportReport = async (type, format) => {
    const response = await api.get(`/reports/${type}/export?format=${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-report.${format === 'excel' ? 'xlsx' : format}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: 'Total Inventory Value', value: `$${Number(summary.totalInventoryValue || 0).toLocaleString()}`, icon: <Inventory2Icon />, tone: green },
    { label: 'Total Orders', value: summary.totalOrders || 0, icon: <ShoppingCartIcon />, tone: green },
    { label: 'Pending Tasks', value: summary.pendingTasks || 0, icon: <AssignmentTurnedInIcon />, tone: green },
    { label: 'Inbound Shipments', value: summary.inboundShipments || 0, icon: <LocalShippingIcon />, tone: green },
    { label: 'Outbound Shipments', value: summary.outboundShipments || 0, icon: <LocalShippingIcon />, tone: green },
    { label: 'Low Stock Alerts', value: summary.lowStockAlerts || 0, icon: <WarningAmberIcon />, tone: '#b45309' },
    { label: 'Overdue Tasks', value: summary.overdueTasks || 0, icon: <WarningAmberIcon />, tone: '#b91c1c' },
    { label: "Today's Activities", value: summary.todaysActivities || 0, icon: <AssessmentIcon />, tone: green },
    { label: 'Notifications', value: notifications.filter((n) => !n.read_status).length, icon: <WarningAmberIcon />, tone: '#2563eb' },
  ];

  const kpiChartData = [
    { label: 'Inventory Turnover', value: Math.min((kpis.inventoryTurnover || 0) * 10, 100), displayValue: kpis.inventoryTurnover },
    { label: 'Order Fulfillment Rate', value: kpis.orderFulfillmentRate || 0, displayValue: `${kpis.orderFulfillmentRate || 0}%` },
    { label: 'On-Time Delivery', value: kpis.onTimeDelivery || 0, displayValue: `${kpis.onTimeDelivery || 0}%` },
    { label: 'Stock Accuracy', value: kpis.stockAccuracy || 0, displayValue: `${kpis.stockAccuracy || 0}%` },
  ];

  const renderDashboard = () => (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <ChartCard title="KPI Metrics" data={kpiChartData} loading={loading} color={green} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Recent Pending Tasks</Typography>
            <Stack spacing={1.5}>
              {pendingTasks.slice(0, 4).map((task) => (
                <TaskCard key={task.task_id} task={task} showActions={false} />
              ))}
              {!pendingTasks.length && <Typography color="text.secondary">No pending tasks.</Typography>}
            </Stack>
          </Paper>
          <Paper sx={{ p: 2.5, mt: 3, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Latest Notifications</Typography>
              {notifications.some((notification) => !notification.read_status) && (
                <Button size="small" onClick={markAllNotificationsRead}>Mark all read</Button>
              )}
            </Stack>
            {notifications.length ? (
              notifications.slice(0, 5).map((notification) => (
                <Box
                  key={notification.notification_id}
                  sx={{
                    mb: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: notification.read_status ? '#f8fafc' : '#f0f9ff',
                    border: notification.read_status ? '1px solid #e2e8f0' : '1px solid #60a5fa',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{notification.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{notification.message}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(notification.created_at).toLocaleString()}</Typography>
                    </Box>
                    {!notification.read_status && (
                      <Button size="small" onClick={() => markNotificationRead(notification.notification_id)}>
                        Mark read
                      </Button>
                    )}
                  </Stack>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No notifications yet.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );

  const renderInventory = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <DataTable
          title="Inventory Levels"
          loading={loading}
          columns={[
            { key: 'sku', label: 'SKU' },
            { key: 'product_name', label: 'Product' },
            { key: 'quantity_available', label: 'Available' },
            { key: 'reorder_level', label: 'Reorder Level' },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <Chip
                  size="small"
                  color={Number(row.quantity_available) <= Number(row.reorder_level || 0) ? 'warning' : 'success'}
                  label={Number(row.quantity_available) <= Number(row.reorder_level || 0) ? 'Low Stock' : 'OK'}
                />
              ),
            },
          ]}
          rows={filteredInventory.map((item) => ({ ...item, id: item.inventory_id }))}
          emptyMessage={inventorySearch ? 'Item not found' : 'No inventory records'}
        />
      </Grid>
      <Grid item xs={12} lg={4}>
        <Paper sx={{ p: 2.5, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Search by SKU / name / barcode"
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
          />
          <Stack spacing={1} sx={{ mt: 2 }}>
            {lowStockItems.slice(0, 5).map((item) => (
              <Chip key={item.inventory_id} color="warning" label={`${item.sku}: ${item.quantity_available} left`} />
            ))}
          </Stack>
        </Paper>
        <Paper component="form" onSubmit={submitAdjustmentRequest} sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Request Stock Adjustment</Typography>
          <Stack spacing={1.5}>
            <TextField
              select
              size="small"
              label="Product"
              value={request.product_id}
              onChange={(e) => {
                const selected = inventory.find((item) => String(item.product_id) === e.target.value);
                setRequest({ ...request, product_id: e.target.value, warehouse_id: selected?.warehouse_id || '' });
              }}
              required
            >
              {inventory.map((item) => (
                <MenuItem key={item.inventory_id} value={item.product_id}>{item.sku} - {item.product_name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Type" value={request.adjustment_type} onChange={(e) => setRequest({ ...request, adjustment_type: e.target.value })}>
              <MenuItem value="add">Add stock</MenuItem>
              <MenuItem value="remove">Remove stock</MenuItem>
            </TextField>
            <TextField size="small" label="Quantity" type="number" value={request.quantity} onChange={(e) => setRequest({ ...request, quantity: e.target.value })} required />
            <TextField size="small" label="Reason" value={request.reason} onChange={(e) => setRequest({ ...request, reason: e.target.value })} required />
            <Button type="submit" variant="contained" sx={{ bgcolor: green }}>Submit Request</Button>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderOrders = () => (
    <DataTable
      title="Orders"
      loading={loading}
      columns={[
        { key: 'order_id', label: 'Order #' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'status', label: 'Status' },
        {
          key: 'total_amount',
          label: 'Total',
          render: (row) => `$${Number(row.total_amount || 0).toLocaleString()}`,
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <Button size="small" onClick={() => setSelectedOrder(row)}>Manage</Button>
          ),
        },
      ]}
      rows={filteredOrders.map((order) => ({ ...order, id: order.order_id }))}
      emptyMessage={orderSearch ? 'Order not found' : 'No orders found'}
    />
  );

  const renderTasks = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Paper component="form" onSubmit={createTask} sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Create Task</Typography>
          <Stack spacing={1.5}>
            <TextField size="small" label="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
            <TextField select size="small" label="Assign to" value={taskForm.assigned_user_id} onChange={(e) => setTaskForm({ ...taskForm, assigned_user_id: e.target.value })} required>
              {workers.map((person) => (
                <MenuItem key={person.user_id} value={person.user_id}>{person.first_name} {person.last_name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Type" value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}>
              <MenuItem value="receive">Receive</MenuItem>
              <MenuItem value="putaway">Putaway</MenuItem>
              <MenuItem value="pick">Pick</MenuItem>
              <MenuItem value="pack">Pack</MenuItem>
            </TextField>
            <TextField select size="small" label="Priority" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
            <TextField size="small" label="Notes" value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} />
            <Button type="submit" variant="contained" sx={{ bgcolor: green }}>Create Task</Button>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Task Progress</Typography>
          <Stack spacing={1.5}>
            {tasks.map((task) => (
              <TaskCard
                key={task.task_id}
                task={task}
                staff={workers}
                onComplete={completeTask}
              />
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderInbound = () => (
    <DataTable
      title="Inbound Shipments"
      loading={loading}
      columns={[
        { key: 'purchase_order_id', label: 'PO #' },
        { key: 'supplier_name', label: 'Supplier' },
        { key: 'status', label: 'Status' },
        { key: 'expected_delivery_date', label: 'ETA' },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setSelectedPo(row)}>Details</Button>
              {row.status === 'In Transit' && (
                <Button size="small" color="success" onClick={() => updatePoStatus(row.purchase_order_id, 'Received')}>
                  Receive
                </Button>
              )}
            </Stack>
          ),
        },
      ]}
      rows={inboundShipments.map((po) => ({ ...po, id: po.purchase_order_id }))}
      emptyMessage="No inbound shipments"
    />
  );

  const renderOutbound = () => (
    <DataTable
      title="Outbound Shipments"
      loading={loading}
      columns={[
        { key: 'order_id', label: 'Order #' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'status', label: 'Status' },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setSelectedOrder(row)}>Review</Button>
              {row.status === 'Packed' && (
                <Button size="small" color="success" onClick={() => updateOrderStatus(row.order_id, 'Shipped')}>
                  Approve Shipment
                </Button>
              )}
            </Stack>
          ),
        },
      ]}
      rows={outboundShipments.map((order) => ({ ...order, id: order.order_id }))}
      emptyMessage="No outbound shipments"
    />
  );

  const renderReports = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <ChartCard title="Performance KPIs" data={kpiChartData} loading={loading} color={green} />
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Export Reports</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {['inventory', 'stock_movement', 'order', 'inbound', 'outbound', 'warehouse_performance', 'task_performance'].map((type) =>
              ['csv', 'excel', 'pdf'].map((format) => (
                <Button
                  key={`${type}-${format}`}
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => exportReport(type, format)}
                  sx={{ borderColor: green, color: green }}
                >
                  {type.replaceAll('_', ' ')} {format.toUpperCase()}
                </Button>
              ))
            )}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderSettings = () => (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Warehouse Settings</Typography>
      <Stack spacing={1}>
        {settings.length
          ? settings.map((setting) => (
              <Chip key={setting.setting_key} label={`${setting.setting_key}: ${setting.setting_value}`} variant="outlined" />
            ))
          : ['Configure warehouse settings', 'Manage locations & zones', 'Set alerts & notifications', 'Warehouse scope enforced'].map((label) => (
              <Chip key={label} label={label} color="success" variant="outlined" />
            ))}
      </Stack>
    </Paper>
  );

  const moduleContent = {
    dashboard: renderDashboard,
    inventory: renderInventory,
    orders: renderOrders,
    tasks: renderTasks,
    inbound: renderInbound,
    outbound: renderOutbound,
    reports: renderReports,
    settings: renderSettings,
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar title={MODULE_TITLES[activeModule]} />
        <Box sx={{ flex: 1, p: { xs: 2, lg: 4 }, overflow: 'auto' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#14532d' }}>
                {MODULE_TITLES[activeModule]}
              </Typography>
              <Typography color="text.secondary">
                Welcome, {user?.first_name}. Manage warehouse operations in real time.
              </Typography>
            </Box>
            {activeModule === 'orders' && (
              <TextField
                size="small"
                label="Search orders"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                sx={{ minWidth: 240 }}
              />
            )}
          </Stack>

          {message && <Alert severity="success" onClose={() => setMessage('')} sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="warning" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
          {showSettingsWarning && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Some manager modules are hidden because your role does not have permission to read purchase orders or settings.
            </Alert>
          )}

          {moduleContent[activeModule]?.()}
        </Box>
      </Box>

      <ModalDialog
        open={Boolean(selectedOrder)}
        title={selectedOrder ? `Order #${selectedOrder.order_id}` : ''}
        onClose={() => setSelectedOrder(null)}
        maxWidth="md"
      >
        {selectedOrder && (
          <Stack spacing={2}>
            <Typography><strong>Customer:</strong> {selectedOrder.customer_name}</Typography>
            <Typography><strong>Status:</strong> {selectedOrder.status}</Typography>
            <Typography><strong>Total:</strong> ${Number(selectedOrder.total_amount || 0).toLocaleString()}</Typography>
            <TextField
              select
              fullWidth
              size="small"
              label="Assign worker"
              defaultValue=""
              onChange={(e) => assignOrder(selectedOrder.order_id, e.target.value)}
            >
              {workers.map((person) => (
                <MenuItem key={person.user_id} value={person.user_id}>{person.first_name} {person.last_name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Update status"
              defaultValue={selectedOrder.status}
              onChange={(e) => updateOrderStatus(selectedOrder.order_id, e.target.value)}
            >
              {['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered'].map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
      </ModalDialog>

      <ModalDialog
        open={Boolean(selectedPo)}
        title={selectedPo ? `Inbound PO #${selectedPo.purchase_order_id}` : ''}
        onClose={() => setSelectedPo(null)}
      >
        {selectedPo && (
          <Stack spacing={1}>
            <Typography><strong>Supplier:</strong> {selectedPo.supplier_name}</Typography>
            <Typography><strong>Warehouse:</strong> {selectedPo.warehouse_name}</Typography>
            <Typography><strong>Status:</strong> {selectedPo.status}</Typography>
            <Typography><strong>Amount:</strong> ${Number(selectedPo.total_amount || 0).toLocaleString()}</Typography>
          </Stack>
        )}
      </ModalDialog>
    </Box>
  );
}

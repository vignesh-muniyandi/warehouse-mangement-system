import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout';
import ManagerDashboard from './pages/ManagerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import AssignedTasks from './pages/AssignedTasks';
import ReceiveGoods from './pages/ReceiveGoods';
import PutawayPage from './pages/PutawayPage';
import PickItems from './pages/PickItems';
import PackItems from './pages/PackItems';
import Reports from './pages/Reports';
import DeliveryDashboard from './pages/DeliveryDashboard';
import Shipments from './pages/Shipments';
import ShipmentDetails from './pages/ShipmentDetails';
import RouteTracking from './pages/RouteTracking';
import CollectShipment from './pages/CollectShipment';
import DeliveryConfirmation from './pages/DeliveryConfirmation';
import FailedDeliveryForm from './pages/FailedDeliveryForm';
import DaySummary from './pages/DaySummary';
import ReportsDelivery from './pages/ReportsDelivery';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { roleRouteMap, roleIdRouteMap } from './hooks/usePermission';

function LegacyDashboardRedirect() {
  const location = useLocation();
  const target = location.pathname.replace('/dashboard', '') + location.search;
  return <Navigate to={target || '/admin'} replace />;
}

function App() {
  const { user } = useAuth();
  const dashboardRoute = roleIdRouteMap[user?.role_id] || roleRouteMap[user?.role_name] || '/admin';
  const [permissionMessage, setPermissionMessage] = useState('');

  useEffect(() => {
    const handler = (event) => setPermissionMessage(event.detail || 'Permission denied');
    window.addEventListener('permission-denied', handler);
    return () => window.removeEventListener('permission-denied', handler);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/dashboard" element={<Navigate to={dashboardRoute} replace />} />
        <Route
          path="/worker/assigned"
          element={
            <ProtectedRoute allowedRoleIds={[3]}>
              <AssignedTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/receive"
          element={
            <ProtectedRoute allowedRoleIds={[3]}>
              <ReceiveGoods />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/putaway"
          element={
            <ProtectedRoute allowedRoleIds={[3]}>
              <PutawayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/pick"
          element={
            <ProtectedRoute allowedRoleIds={[3]}>
              <PickItems />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/pack"
          element={
            <ProtectedRoute allowedRoleIds={[3]}>
              <PackItems />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/reports"
          element={
            <ProtectedRoute allowedRoleIds={[3]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoleIds={[1]} allowedRoles={['Admin']}>
              <AdminDashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoleIds={[2]} allowedRoles={['Warehouse Manager']} requiredPermission="inventory:read">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker"
          element={
            <ProtectedRoute allowedRoleIds={[3]} allowedRoles={['Worker/Operator']} requiredPermission="tasks:read_own">
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute allowedRoleIds={[4]} allowedRoles={['Delivery Team']} requiredPermission="shipments:read_own">
              <DeliveryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/shipments"
          element={
            <ProtectedRoute allowedRoleIds={[4]}>
              <Shipments />
            </ProtectedRoute>
          }
        />
        <Route path="/delivery/shipment/:id" element={<ProtectedRoute allowedRoleIds={[4]}><ShipmentDetails /></ProtectedRoute>} />
        <Route path="/delivery/track" element={<ProtectedRoute allowedRoleIds={[4]}><RouteTracking /></ProtectedRoute>} />
        <Route path="/delivery/collect" element={<ProtectedRoute allowedRoleIds={[4]}><CollectShipment /></ProtectedRoute>} />
        <Route path="/delivery/confirm" element={<ProtectedRoute allowedRoleIds={[4]}><DeliveryConfirmation /></ProtectedRoute>} />
        <Route path="/delivery/failed" element={<ProtectedRoute allowedRoleIds={[4]}><FailedDeliveryForm /></ProtectedRoute>} />
        <Route path="/delivery/day-summary" element={<ProtectedRoute allowedRoleIds={[4]}><DaySummary /></ProtectedRoute>} />
        <Route path="/delivery/reports" element={<ProtectedRoute allowedRoleIds={[4]}><ReportsDelivery /></ProtectedRoute>} />
        <Route path="/dashboard/admin/*" element={<LegacyDashboardRedirect />} />
        <Route path="/dashboard/manager" element={<Navigate to="/manager" replace />} />
        <Route path="/dashboard/worker" element={<Navigate to="/worker" replace />} />
        <Route path="/dashboard/delivery" element={<Navigate to="/delivery" replace />} />
        <Route path="/*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Snackbar open={Boolean(permissionMessage)} autoHideDuration={3500} onClose={() => setPermissionMessage('')}>
        <Alert severity="warning" onClose={() => setPermissionMessage('')}>{permissionMessage}</Alert>
      </Snackbar>
    </>
  );
}

export default App;

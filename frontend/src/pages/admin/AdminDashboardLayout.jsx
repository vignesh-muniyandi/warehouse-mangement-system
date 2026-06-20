import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import DashboardOverview from './DashboardOverview';
import AdminUsers from './AdminUsers';
import ProductsManagement from './ProductsManagement';
import InventoryManagement from './InventoryManagement';
import PurchaseManagement from './PurchaseManagement';
import OrdersManagement from './OrdersManagement';
import ReportsManagement from './ReportsManagement';
import SystemSettings from './SystemSettings';
import NotFoundPage from '../NotFoundPage';

export default function AdminDashboardLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <Box component="main" sx={{ flex: 1, p: 3, backgroundColor: '#f8fafc' }}>
          <Routes>
            <Route path="" element={<DashboardOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<ProductsManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="purchase-orders" element={<PurchaseManagement />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="reports" element={<ReportsManagement />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

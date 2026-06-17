import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
      <Route
        path="/dashboard/admin/*"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboardLayout />
          </ProtectedRoute>
        }
      />
      <Route path="/*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

import React from 'react';
import { Navigate } from 'react-router-dom';

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const payload = decodeToken(token) || {};
  const roleId = payload.roleId || payload.role_id || payload.role || payload.roleId;
  if (allowedRoles.length && !allowedRoles.includes(Number(roleId))) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

export default ProtectedRoute;

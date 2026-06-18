import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usePermission, { roleIdNameMap } from '../hooks/usePermission';

export function ProtectedRoute({ allowedRoles, allowedRoleIds, requiredPermission, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const { hasPermission } = usePermission();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div>Loading...</div></div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoleIds && Array.isArray(allowedRoleIds)) {
    const roleId = Number(user.role_id);
    if (!allowedRoleIds.map(Number).includes(roleId)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (allowedRoles && Array.isArray(allowedRoles)) {
    const roleName = user.role_name || roleIdNameMap[Number(user.role_id)];
    if (!allowedRoles.includes(roleName)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

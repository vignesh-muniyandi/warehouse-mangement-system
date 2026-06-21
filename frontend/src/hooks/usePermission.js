import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export const ROLES = {
  ADMIN: 1,
  MANAGER: 2,
  WORKER: 3,
  DELIVERY: 4,
};

export const roleRouteMap = {
  Admin: '/admin',
  'Warehouse Manager': '/manager',
  'Worker/Operator': '/worker',
  'Delivery Team': '/delivery',
};

export const roleIdRouteMap = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.MANAGER]: '/manager',
  [ROLES.WORKER]: '/worker',
  [ROLES.DELIVERY]: '/delivery',
};

export const roleIdNameMap = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Warehouse Manager',
  [ROLES.WORKER]: 'Worker/Operator',
  [ROLES.DELIVERY]: 'Delivery Team',
};

export default function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (user?.role_name === 'Admin') return true;
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    if (permissions.includes(permission) || permissions.includes('*:*')) return true;
    const [resource] = permission.split(':');
    return permissions.includes(`${resource}:*`);
  };

  const hasAnyPermission = (permissions) => {
    if (!permissions?.length) return true;
    return permissions.some((permission) => hasPermission(permission));
  };

  return useMemo(() => ({
    hasAnyPermission,
    hasPermission,
    roleRouteMap,
    roleIdRouteMap,
    roleIdNameMap,
    ROLES,
    user,
  }), [user]);
}

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleRouteMap } from '../hooks/usePermission';

export default function Unauthorized() {
  const { user } = useAuth();
  const returnPath = roleRouteMap[user?.role_name] || '/login';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#f5f6fa', p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        You do not have permission to view this page.
      </Typography>
      <Button component={Link} to={returnPath} variant="contained" color="primary">
        Return to dashboard
      </Button>
    </Box>
  );
}

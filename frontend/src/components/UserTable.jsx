import React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';

export default function UserTable({ users, loading, error, noDataMessage = 'No users found.', onEdit }) {
  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  if (!users?.length) {
    return (
      <Paper sx={{ p: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {noDataMessage}
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="users table">
        <TableHead sx={{ backgroundColor: '#f8fafc' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>User ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Full Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.user_id} hover>
              <TableCell>{user.user_id}</TableCell>
              <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.phone || '-'}</TableCell>
              <TableCell>
                <Chip label={user.role_name} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip
                  label={user.status}
                  size="small"
                  color={user.status === 'Active' ? 'success' : user.status === 'Locked' ? 'warning' : 'error'}
                />
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" color="primary" onClick={() => onEdit?.(user)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

import React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export default function NotFoundPage() {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Page Not Found
      </Typography>
      <Typography color="text.secondary">
        The page you are looking for does not exist. Please choose a module from the sidebar.
      </Typography>
    </Paper>
  );
}

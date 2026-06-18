import React from 'react';
import { Paper, Typography } from '@mui/material';

export default function StatCard({ title, value }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="h6" sx={{ mt: 1 }}>{value ?? 0}</Typography>
    </Paper>
  );
}

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function StatCard({ label, value, icon, tone = '#15803d', loading = false }) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        minHeight: 104,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: tone, mt: 0.5 }}>
            {loading ? '—' : value}
          </Typography>
        </Box>
        {icon && (
          <Box sx={{ color: tone, bgcolor: `${tone}15`, borderRadius: 2, p: 1, display: 'flex' }}>
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function DashboardCard({ title, value, icon, iconColor = '#2563eb', iconBg = '#eff6ff' }) {
  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '8px', border: '1px solid #f1f5f9' }} elevation={1}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '8px', backgroundColor: iconBg, display: 'grid', placeItems: 'center', color: iconColor }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 32, lineHeight: 1.2 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: '#0f172a' }}>
        {value}
      </Typography>
    </Paper>
  );
}

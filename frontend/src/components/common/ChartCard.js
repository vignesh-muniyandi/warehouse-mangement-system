import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import LoadingSkeleton from './LoadingSkeleton';

export default function ChartCard({ title, data = [], loading = false, color = '#15803d' }) {
  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.map((item) => (
            <Box key={item.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.displayValue ?? `${item.value}%`}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: '#f1f5f9', borderRadius: 1, height: 10, overflow: 'hidden' }}>
                <Box
                  sx={{
                    width: `${(Number(item.value) / maxValue) * 100}%`,
                    bgcolor: color,
                    height: '100%',
                    borderRadius: 1,
                    transition: 'width 0.4s ease',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Fab from '@mui/material/Fab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Tooltip from '@mui/material/Tooltip';

export default function FloatingBackButton() {
  const navigate = useNavigate();

  return (
    <Tooltip title="Back" placement="left">
      <Fab
        color="primary"
        aria-label="back"
        onClick={() => navigate('/dashboard/overview')}
        sx={{
          position: 'fixed',
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          boxShadow: 4,
          backgroundColor: '#2563eb',
          color: '#ffffff',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: '#1d4ed8',
            transform: 'translateY(-50%) scale(1.1)',
          }
        }}
      >
        <ArrowBackIcon />
      </Fab>
    </Tooltip>
  );
}

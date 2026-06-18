import React from 'react';
import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const priorityColors = {
  High: 'error',
  Normal: 'default',
  Low: 'success',
};

export default function TaskCard({ task, onComplete, onAssign, staff = [], showActions = true }) {
  return (
    <Paper sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {task.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {task.task_type} · {task.assigned_first_name ? `${task.assigned_first_name} ${task.assigned_last_name || ''}` : 'Unassigned'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Chip size="small" label={task.priority || 'Normal'} color={priorityColors[task.priority] || 'default'} />
          <Chip size="small" label={task.status} color={task.status === 'Completed' ? 'success' : 'warning'} variant="outlined" />
        </Stack>
      </Stack>

      {task.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {task.notes}
        </Typography>
      )}

      {showActions && task.status !== 'Completed' && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
          {onAssign && staff.length > 0 && (
            <select
              className="text-sm border border-slate-200 rounded px-2 py-1"
              defaultValue=""
              onChange={(e) => onAssign(task.task_id, e.target.value)}
            >
              <option value="" disabled>
                Assign worker
              </option>
              {staff.map((person) => (
                <option key={person.user_id} value={person.user_id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
            </select>
          )}
          {onComplete && (
            <IconButton size="small" color="success" onClick={() => onComplete(task.task_id)} aria-label="Mark completed">
              <CheckCircleOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      )}
    </Paper>
  );
}

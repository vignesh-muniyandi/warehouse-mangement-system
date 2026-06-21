import React, { useEffect, useState } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Typography, Alert } from '@mui/material';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

export default function AssignedTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/tasks');
        setTasks(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startTask = async (id) => {
    try {
      await api.patch(`/worker/tasks/${id}/start`);
      setTasks((t) => t.map((x) => (x.task_id === id ? { ...x, status: 'In Progress' } : x)));
      setMessage('Task started successfully');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start task');
    }
  };

  const completeTask = async (id) => {
    try {
      await api.patch(`/worker/tasks/${id}/complete`);
      setTasks((t) => t.map((x) => (x.task_id === id ? { ...x, status: 'Completed' } : x)));
      setMessage('Task completed successfully');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete task');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff7ed' }}>
      <Sidebar />
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, color: '#9a3412', fontWeight: 800 }}>My Assigned Tasks</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10}>Loading...</TableCell></TableRow>
                ) : tasks.length ? (
                  tasks.map((task) => (
                    <TableRow key={task.task_id}>
                      <TableCell>{task.task_id}</TableCell>
                      <TableCell>{task.task_type}</TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>{task.items || '-'}</TableCell>
                      <TableCell>{task.target_quantity || '-'}</TableCell>
                      <TableCell>{task.location_code || '-'}</TableCell>
                      <TableCell>{task.priority}</TableCell>
                      <TableCell>{task.due_time || '-'}</TableCell>
                      <TableCell>{task.status}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ bgcolor: '#f97316', mr: 1 }}
                          disabled={task.status === 'In Progress' || task.status === 'Completed'}
                          onClick={() => startTask(task.task_id)}
                        >
                          Start
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={task.status === 'Completed'}
                          onClick={() => completeTask(task.task_id)}
                        >
                          Complete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={10}>No tasks assigned</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
}


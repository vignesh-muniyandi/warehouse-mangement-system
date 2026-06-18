import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import LoadingSkeleton from './LoadingSkeleton';

export default function DataTable({ title, columns = [], rows = [], emptyMessage = 'No records found', loading = false }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      {title && (
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
          {title}
        </Typography>
      )}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key} sx={{ fontWeight: 700 }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length ? (
                rows.map((row, index) => (
                  <TableRow key={row.id ?? index} hover>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render ? col.render(row) : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

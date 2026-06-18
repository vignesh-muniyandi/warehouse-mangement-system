import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

export default function ShipmentTable({ rows }) {
  const columns = [
    { field: 'shipment_id', headerName: 'Shipment ID', width: 120 },
    { field: 'order_id', headerName: 'Order ID', width: 120 },
    { field: 'customer_name', headerName: 'Customer', width: 200 },
    { field: 'address', headerName: 'Address', width: 300 },
    { field: 'phone', headerName: 'Contact', width: 150 },
    { field: 'package_count', headerName: 'Packages', width: 120 },
    { field: 'payment_type', headerName: 'Payment', width: 120 },
    { field: 'status', headerName: 'Status', width: 140 },
  ];
  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid rows={rows.map((r) => ({ id: r.shipment_id, ...r }))} columns={columns} pageSize={10} rowsPerPageOptions={[10, 25]} />
    </div>
  );
}

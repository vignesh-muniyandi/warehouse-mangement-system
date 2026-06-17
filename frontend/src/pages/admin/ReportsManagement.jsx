import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';

// Icons
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';

import api from '../../api/axios';
import FloatingBackButton from '../../components/FloatingBackButton';

const REPORTS = [
  { id: 'inventory', title: 'Inventory Report', description: 'Available counts, reorder status, and dollar valuations.' },
  { id: 'stock_movement', title: 'Stock Movement Report', description: 'Tracking history of intake, adjustments, and transfers.' },
  { id: 'purchase', title: 'Purchase Report', description: 'Procurement PO list, supplier totals, and receipt details.' },
  { id: 'sales', title: 'Sales Report', description: 'Sales volume, customer delivery data, and fulfillment.' },
  { id: 'supplier', title: 'Supplier Report', description: 'Supplier lists, product counts, and stock quantities.' },
  { id: 'warehouse_performance', title: 'Warehouse Performance Report', description: 'Capacity thresholds, sales volumes, and transaction metrics.' },
  { id: 'delivery', title: 'Delivery Report', description: 'Dispatched and delivered orders with assigned operators.' }
];

export default function ReportsManagement() {
  const [selectedReport, setSelectedReport] = useState('inventory');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async (reportType) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/reports/${reportType}`);
      if (res.data.success) {
        setReportData(res.data.data);
      } else {
        setError('Failed to fetch report data');
      }
    } catch (err) {
      console.error(err);
      setError('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport]);

  const handleReportSelect = (id) => {
    setSelectedReport(id);
  };

  const handleExport = async (format) => {
    const response = await api.get(`/reports/${selectedReport}/export?format=${format}`, {
      responseType: 'blob',
    });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${selectedReport}-report.${format === 'excel' ? 'xlsx' : format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  // Dynamically render headers based on report type
  const renderHeaders = () => {
    switch (selectedReport) {
      case 'inventory':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Available</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Reserved</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Damaged</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Valuation</TableCell>
          </>
        );
      case 'stock_movement':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Movement Type</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>From Warehouse</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>To Warehouse</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Movement Date</TableCell>
          </>
        );
      case 'purchase':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>PO ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Warehouse Destination</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Amount</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Expected Delivery</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
          </>
        );
      case 'sales':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Customer Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Delivery Address</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Amount</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Assigned Operator</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
          </>
        );
      case 'supplier':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>Supplier ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Supplier Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Contact Person</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Products</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Stock</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
          </>
        );
      case 'warehouse_performance':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>Warehouse ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Capacity</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Sales Orders</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Sales Volume</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Purchases Count</TableCell>
          </>
        );
      case 'delivery':
        return (
          <>
            <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Customer Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Delivery Address</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Assigned Courier</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Amount</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Delivery Date</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
          </>
        );
      default:
        return null;
    }
  };

  // Dynamically render rows based on report type
  const renderRows = () => {
    return reportData.map((row, index) => {
      switch (selectedReport) {
        case 'inventory':
          return (
            <TableRow key={index} hover>
              <TableCell sx={{ fontWeight: 500 }}>{row.sku}</TableCell>
              <TableCell>{row.product_name}</TableCell>
              <TableCell>{row.category_name || '-'}</TableCell>
              <TableCell align="right">{row.quantity_available}</TableCell>
              <TableCell align="right">{row.quantity_reserved}</TableCell>
              <TableCell align="right">{row.damaged_quantity}</TableCell>
              <TableCell align="right">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.unit_price)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.valuation)}
              </TableCell>
            </TableRow>
          );
        case 'stock_movement':
          return (
            <TableRow key={row.movement_id || index} hover>
              <TableCell>{row.movement_id}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{row.sku}</TableCell>
              <TableCell>{row.product_name}</TableCell>
              <TableCell>{row.movement_type}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{row.quantity}</TableCell>
              <TableCell>{row.from_warehouse || '-'}</TableCell>
              <TableCell>{row.to_warehouse || '-'}</TableCell>
              <TableCell>{row.remarks || '-'}</TableCell>
              <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
            </TableRow>
          );
        case 'purchase':
          return (
            <TableRow key={row.purchase_order_id || index} hover>
              <TableCell sx={{ fontWeight: 500 }}>PO #{row.purchase_order_id}</TableCell>
              <TableCell>{row.supplier_name}</TableCell>
              <TableCell>{row.warehouse_name}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_amount)}
              </TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell>{row.expected_delivery_date ? new Date(row.expected_delivery_date).toLocaleDateString() : '-'}</TableCell>
              <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
            </TableRow>
          );
        case 'sales':
          return (
            <TableRow key={row.order_id || index} hover>
              <TableCell sx={{ fontWeight: 500 }}>SO #{row.order_id}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.delivery_address}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_amount)}
              </TableCell>
              <TableCell>{row.first_name ? `${row.first_name} ${row.last_name}` : 'Unassigned'}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          );
        case 'supplier':
          return (
            <TableRow key={row.supplier_id || index} hover>
              <TableCell>{row.supplier_id}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
              <TableCell>{row.contact_person}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.phone}</TableCell>
              <TableCell align="right">{row.total_products}</TableCell>
              <TableCell align="right">{row.total_stock}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          );
        case 'warehouse_performance':
          return (
            <TableRow key={row.warehouse_id || index} hover>
              <TableCell>{row.warehouse_id}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{row.warehouse_code}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.location}</TableCell>
              <TableCell align="right">{row.capacity}</TableCell>
              <TableCell align="right">{row.total_orders}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.sales_volume)}
              </TableCell>
              <TableCell align="right">{row.total_purchases}</TableCell>
            </TableRow>
          );
        case 'delivery':
          return (
            <TableRow key={row.order_id || index} hover>
              <TableCell sx={{ fontWeight: 500 }}>SO #{row.order_id}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.delivery_address}</TableCell>
              <TableCell>{row.delivery_staff ? row.delivery_staff : 'Unassigned'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_amount)}
              </TableCell>
              <TableCell>{row.delivery_date ? new Date(row.delivery_date).toLocaleString() : '-'}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          );
        default:
          return null;
      }
    });
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Title */}
      <Box className="no-print">
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          Reports & Analytical Dashboards
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Generate exportable reports for inventory, sales, procurement tracking, and system performance audit.
        </Typography>
      </Box>

      {/* 7 Report Selection Cards - hide on print */}
      <Grid container spacing={2} sx={{ mb: 4 }} className="no-print">
        {REPORTS.map((rep) => {
          const isSelected = selectedReport === rep.id;
          return (
            <Grid item key={rep.id} xs={12} sm={6} md={3} lg={1.71}>
              <Card
                onClick={() => handleReportSelect(rep.id)}
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  boxShadow: 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                    borderColor: '#3b82f6'
                  }
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: isSelected ? '#2563eb' : '#64748b' }}>
                    <AssessmentIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {rep.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 32, lineHeight: 1.2 }}>
                    {rep.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Control Panel: Exporters - hide on print */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Report Preview: {REPORTS.find(r => r.id === selectedReport)?.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={() => handleExport('csv')}
            disabled={loading || reportData.length === 0}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={() => handleExport('excel')}
            disabled={loading || reportData.length === 0}
          >
            Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={() => handleExport('pdf')}
            disabled={loading || reportData.length === 0}
            sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' } }}
          >
            PDF
          </Button>
        </Box>
      </Paper>

      {/* Printable Area styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Preview Table Container */}
      <Box id="printable-report-area">
        {/* Printable Title Block - only shown on printed media */}
        <Box sx={{ display: 'none', '@media print': { display: 'block' }, mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {REPORTS.find(r => r.id === selectedReport)?.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Warehouse Management System System Audit Report
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Generated on: {new Date().toLocaleString()}
          </Typography>
          <Divider sx={{ my: 2 }} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : reportData.length === 0 ? (
          <Paper sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No records found for this reporting category.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  {renderHeaders()}
                </TableRow>
              </TableHead>
              <TableBody>
                {renderRows()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Floating Back Button */}
      <FloatingBackButton className="no-print" />
    </Box>
  );
}

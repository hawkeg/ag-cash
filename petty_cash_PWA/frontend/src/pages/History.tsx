import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Chip,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Grid,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Collapse,
  Alert,
} from '@mui/material'
import {
  Search as SearchIcon,
  DateRange as DateRangeIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Verified as VerifiedIcon,
  DoneAll as DoneAllIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  ReceiptLong,
  AttachFile,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import { Request, RequestStatus } from '@shared/types'
import { requestsAPI } from '../services/api'

interface HistoryProps {
  // Placeholder for future props like API service
}

type DateRangeFilter = 'week' | 'month' | '3months' | 'custom'
type StatusFilter = 'all' | 'completed' | RequestStatus.APPROVED | RequestStatus.REJECTED | RequestStatus.PAID

const History: React.FC<HistoryProps> = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isRtl = theme.direction === 'rtl'

  const [requests, setRequests] = useState<Request[]>([])
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('3months')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [dateMenuAnchor, setDateMenuAnchor] = useState<null | HTMLElement>(null)
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const res = await requestsAPI.getAll({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
        const all = res.data?.data ?? []
        setRequests(all.filter((r: Request) =>
          [RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.PAID, RequestStatus.CANCELLED].includes(r.status)
        ))
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'تعذر تحميل السجل')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  // Get start date for a date range filter
  const getRangeStartDate = (range: DateRangeFilter): Date | null => {
    const now = new Date()
    switch (range) {
      case 'week': {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        return d
      }
      case 'month': {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 1)
        return d
      }
      case '3months': {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 3)
        return d
      }
      case 'custom':
        return customStartDate ? new Date(customStartDate) : null
      default:
        return null
    }
  }

  // Apply filters and search
  useEffect(() => {
    let filtered = [...requests]

    // Apply date range filter
    const startDate = getRangeStartDate(dateRange)
    if (startDate) {
      filtered = filtered.filter(r => new Date(r.createdAt) >= startDate)
    }
    if (dateRange === 'custom' && customEndDate) {
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(r => new Date(r.createdAt) <= end)
    }

    // Apply status filter
    if (statusFilter === 'completed') {
      // Completed = requests that finished the workflow successfully
      filtered = filtered.filter(r =>
        r.status === RequestStatus.APPROVED || r.status === RequestStatus.PAID
      )
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.odooRequestId?.toString().includes(query) ||
        r.description.toLowerCase().includes(query)
      )
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredRequests(filtered)
  }, [requests, statusFilter, searchQuery, dateRange, customStartDate, customEndDate])

  // Summary statistics
  const stats = useMemo(() => {
    const total = filteredRequests.length
    const totalAmount = filteredRequests.reduce((sum, r) => sum + r.amount, 0)
    const decided = filteredRequests.filter(r =>
      r.status === RequestStatus.APPROVED ||
      r.status === RequestStatus.PAID ||
      r.status === RequestStatus.REJECTED
    ).length
    const approved = filteredRequests.filter(r =>
      r.status === RequestStatus.APPROVED || r.status === RequestStatus.PAID
    ).length
    const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0
    return { total, totalAmount, approvalRate }
  }, [filteredRequests])

  // Status label and color mapping
  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return {
          label: 'معتمد',
          bgColor: alpha(theme.palette.success.main, 0.1),
          textColor: theme.palette.success.dark,
          icon: <VerifiedIcon fontSize="small" />,
        }
      case RequestStatus.REJECTED:
        return {
          label: 'مرفوض',
          bgColor: alpha(theme.palette.error.main, 0.1),
          textColor: theme.palette.error.main,
          icon: <CloseIcon fontSize="small" />,
        }
      case RequestStatus.PAID:
        return {
          label: 'تم الصرف',
          bgColor: alpha(theme.palette.success.main, 0.1),
          textColor: theme.palette.success.dark,
          icon: <DoneAllIcon fontSize="small" />,
        }
      case RequestStatus.CANCELLED:
        return {
          label: 'ملغي',
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
          icon: <CancelIcon fontSize="small" />,
        }
      default:
        return {
          label: status,
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
          icon: <InfoIcon fontSize="small" />,
        }
    }
  }

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Navigate to request detail
  const handleRequestClick = (request: Request) => {
    navigate(`/requests/${request.id}`)
  }

  // Date range menu handlers
  const handleDateMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDateMenuAnchor(event.currentTarget)
  }

  const handleDateMenuClose = () => {
    setDateMenuAnchor(null)
  }

  const handleDateRangeChange = (range: DateRangeFilter) => {
    setDateRange(range)
    handleDateMenuClose()
  }

  // Export menu handlers
  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null)
  }

  // Export to CSV
  const handleExportCsv = () => {
    handleExportMenuClose()
    const headers = ['رقم الطلب', 'الوصف', 'المبلغ', 'الحالة', 'تاريخ الإنشاء']
    const rows = filteredRequests.map(r => [
      r.name || `#${r.odooRequestId}`,
      `"${r.description.replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
      getStatusConfig(r.status).label,
      new Date(r.createdAt).toLocaleDateString('en-CA'),
    ])
    // BOM for correct Arabic display in Excel
    const csvContent = '﻿' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `history-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Export to PDF via print dialog
  const handleExportPdf = () => {
    handleExportMenuClose()
    const rows = filteredRequests.map(r => `
      <tr>
        <td>${r.name || `#${r.odooRequestId}`}</td>
        <td>${r.description}</td>
        <td>${r.amount.toFixed(2)}</td>
        <td>${getStatusConfig(r.status).label}</td>
        <td>${new Date(r.createdAt).toLocaleDateString('en-CA')}</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>سجل الطلبات</title>
          <style>
            body { font-family: Cairo, Tajawal, sans-serif; padding: 24px; }
            h1 { color: #235b54; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
            th { background: #235b54; color: white; }
            tr:nth-child(even) { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>سجل الطلبات - AG-Cash</h1>
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>الوصف</th>
                <th>المبلغ (ر.س)</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const dateRangeLabels: Record<DateRangeFilter, string> = {
    week: 'آخر أسبوع',
    month: 'آخر شهر',
    '3months': 'آخر 3 أشهر',
    custom: 'فترة مخصصة',
  }

  return (
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            سجل الطلبات
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            أرشيف الطلبات المكتملة والمعتمدة والمرفوضة والمصروفة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleDateMenuOpen} title="تصفية بالتاريخ">
            <DateRangeIcon />
          </IconButton>
          <IconButton onClick={handleExportMenuOpen} title="تصدير">
            <DownloadIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              إجمالي الطلبات
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: theme.palette.primary.main }}>
              <span className="number">{stats.total}</span>
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              إجمالي المبلغ
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
              <span className="number">{formatAmount(stats.totalAmount)}</span> ر.س
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              نسبة الاعتماد
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: theme.palette.success.dark }}>
              <span className="number">{stats.approvalRate}٪</span>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search Input */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="ابحث برقم الطلب أو الوصف..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: isRtl ? null : <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            endAdornment: isRtl ? <SearchIcon sx={{ ml: 1, color: 'text.secondary' }} /> : null,
          }}
          sx={{
            bgcolor: 'background.paper',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Active Date Range Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chip
          icon={<DateRangeIcon fontSize="small" />}
          label={dateRangeLabels[dateRange]}
          onClick={handleDateMenuOpen}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            border: 1,
            borderColor: alpha(theme.palette.primary.main, 0.3),
            fontWeight: 'medium',
          }}
        />
      </Box>

      {/* Custom Date Range Inputs */}
      <Collapse in={dateRange === 'custom'}>
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="من تاريخ"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="إلى تاريخ"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Status Filter Chips */}
      <Box sx={{
        display: 'flex',
        gap: 1.5,
        overflowX: 'auto',
        pb: 1,
        mb: 3,
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        <Chip
          label="الكل"
          onClick={() => setStatusFilter('all')}
          icon={<HistoryIcon fontSize="small" />}
          sx={{
            bgcolor: statusFilter === 'all' ? 'primary.main' : 'background.paper',
            color: statusFilter === 'all' ? 'white' : 'text.primary',
            border: 1,
            borderColor: statusFilter === 'all' ? 'primary.main' : 'divider',
            fontWeight: statusFilter === 'all' ? 'bold' : 'normal',
          }}
        />
        <Chip
          label="مكتمل"
          onClick={() => setStatusFilter('completed')}
          icon={<CheckCircleIcon fontSize="small" />}
          sx={{
            bgcolor: statusFilter === 'completed' ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
            color: statusFilter === 'completed' ? theme.palette.primary.main : 'text.primary',
            border: 1,
            borderColor: statusFilter === 'completed' ? theme.palette.primary.main : 'divider',
          }}
        />
        <Chip
          label="معتمد"
          onClick={() => setStatusFilter(RequestStatus.APPROVED)}
          icon={<VerifiedIcon fontSize="small" />}
          sx={{
            bgcolor: statusFilter === RequestStatus.APPROVED ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
            color: statusFilter === RequestStatus.APPROVED ? theme.palette.success.dark : 'text.primary',
            border: 1,
            borderColor: statusFilter === RequestStatus.APPROVED ? theme.palette.success.main : 'divider',
          }}
        />
        <Chip
          label="مرفوض"
          onClick={() => setStatusFilter(RequestStatus.REJECTED)}
          icon={<CloseIcon fontSize="small" />}
          sx={{
            bgcolor: statusFilter === RequestStatus.REJECTED ? alpha(theme.palette.error.main, 0.1) : 'background.paper',
            color: statusFilter === RequestStatus.REJECTED ? theme.palette.error.main : 'text.primary',
            border: 1,
            borderColor: statusFilter === RequestStatus.REJECTED ? theme.palette.error.main : 'divider',
          }}
        />
        <Chip
          label="تم الصرف"
          onClick={() => setStatusFilter(RequestStatus.PAID)}
          icon={<DoneAllIcon fontSize="small" />}
          sx={{
            bgcolor: statusFilter === RequestStatus.PAID ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
            color: statusFilter === RequestStatus.PAID ? theme.palette.success.dark : 'text.primary',
            border: 1,
            borderColor: statusFilter === RequestStatus.PAID ? theme.palette.success.main : 'divider',
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Requests List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!loading && filteredRequests.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              لا توجد طلبات مطابقة في السجل
            </Typography>
          </Box>
        ) : (
          filteredRequests.map((request) => {
            const statusConfig = getStatusConfig(request.status)

            return (
              <Card
                key={request.id}
                onClick={() => handleRequestClick(request)}
                sx={{
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    boxShadow: 2,
                    transform: 'scale(1.01)',
                  },
                  '&:active': {
                    transform: 'scale(0.99)',
                  },
                }}
              >
                <CardContent>
                  {/* Card Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          bgcolor: statusConfig.bgColor,
                          color: statusConfig.textColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {statusConfig.icon}
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                            <span className="number">{request.name || `#${request.odooRequestId}`}</span>
                          </Typography>
                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'divider' }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatDate(request.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Chip
                      label={statusConfig.label}
                      size="small"
                      icon={statusConfig.icon}
                      sx={{
                        bgcolor: statusConfig.bgColor,
                        color: statusConfig.textColor,
                        border: 1,
                        borderColor: alpha(statusConfig.textColor, 0.3),
                        fontWeight: 'medium',
                      }}
                    />
                  </Box>

                  {/* Description */}
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    {request.description}
                  </Typography>

                  {/* Rejection Reason */}
                  {request.status === RequestStatus.REJECTED && request.rejectionReason && (
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
                      سبب الرفض: {request.rejectionReason}
                    </Typography>
                  )}

                  {/* Card Footer */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pt: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Chip
                        icon={<ReceiptLong fontSize="small" />}
                        label={`${request.expenses?.length || 0} بنود مصاريف`}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.text.secondary, 0.08),
                          color: 'text.secondary',
                        }}
                      />
                      {(request.expenses?.length || 0) > 0 && (
                        <Chip
                          icon={<AttachFile fontSize="small" />}
                          label="مرفقات"
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            display: { xs: 'none', sm: 'flex' },
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        <span className="number">{formatAmount(request.amount)}</span> ر.س
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })
        )}
      </Box>

      {/* Date Range Menu */}
      <Menu
        anchorEl={dateMenuAnchor}
        open={Boolean(dateMenuAnchor)}
        onClose={handleDateMenuClose}
      >
        <MenuItem onClick={() => handleDateRangeChange('week')} selected={dateRange === 'week'}>
          آخر أسبوع
        </MenuItem>
        <MenuItem onClick={() => handleDateRangeChange('month')} selected={dateRange === 'month'}>
          آخر شهر
        </MenuItem>
        <MenuItem onClick={() => handleDateRangeChange('3months')} selected={dateRange === '3months'}>
          آخر 3 أشهر
        </MenuItem>
        <MenuItem onClick={() => handleDateRangeChange('custom')} selected={dateRange === 'custom'}>
          فترة مخصصة
        </MenuItem>
      </Menu>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={handleExportCsv}>
          <CsvIcon sx={{ ml: 1, color: 'text.secondary' }} fontSize="small" />
          تصدير CSV
        </MenuItem>
        <MenuItem onClick={handleExportPdf}>
          <PdfIcon sx={{ ml: 1, color: 'text.secondary' }} fontSize="small" />
          تصدير PDF
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default History

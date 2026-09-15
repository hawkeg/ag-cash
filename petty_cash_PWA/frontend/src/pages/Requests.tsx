import React, { useState, useEffect } from 'react'
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
  Fab,
  Grid,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Container,
  Pagination,
  Stack,
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  SwapVert as SortIcon,
  Add as AddIcon,
  Pending as PendingIcon,
  Verified as VerifiedIcon,
  Edit as EditDocumentIcon,
  DoneAll as DoneAllIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  ReceiptLong,
  AttachFile,
  Notifications,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { Request, RequestStatus, AdvanceStatus, Advance } from '@shared/types'
import { requestsAPI, advancesAPI } from '../services/api'

interface RequestsProps {
  // Placeholder for future props like API service
}

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
type StatusFilter = 'all' | RequestStatus

const PAGE_SIZE = 5

const Requests: React.FC<RequestsProps> = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isRtl = theme.direction === 'rtl'

  const [requests, setRequests] = useState<Request[]>([])
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('date-desc')
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [advances, setAdvances] = useState<Advance[]>([])

  // Fetch requests from the API
  const fetchRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const [requestsRes, advancesRes] = await Promise.allSettled([
        requestsAPI.getAll({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
        advancesAPI.getAll({ page: 1, limit: 100 }),
      ])

      if (requestsRes.status === 'rejected') {
        throw requestsRes.reason
      }

      const fetchedRequests = requestsRes.value.data?.data ?? []
      setRequests(fetchedRequests)
      setTotal(requestsRes.value.data?.total ?? fetchedRequests.length)

      // Compute available custody balance: disbursed advances minus paid requests
      const advances = advancesRes.status === 'fulfilled' ? advancesRes.value.data?.data ?? [] : []
      setAdvances(advances)
      const disbursed = advances
        .filter((a) => a.status === AdvanceStatus.DISBURSED || a.status === AdvanceStatus.SETTLED)
        .reduce((sum, a) => sum + a.amount, 0)
      const paidOut = fetchedRequests
        .filter((r) => r.status === RequestStatus.PAID)
        .reduce((sum, r) => sum + r.amount, 0)
      setAvailableBalance(Math.max(0, disbursed - paidOut))
    } catch (err: any) {
      console.error('Failed to load requests:', err)
      setError(err?.response?.data?.error?.message || 'تعذر تحميل الطلبات. تحقق من اتصال الخادم.')
      setRequests([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate status counts
  const statusCounts = {
    all: requests.length,
    [RequestStatus.DRAFT]: requests.filter(r => r.status === RequestStatus.DRAFT).length,
    [RequestStatus.SUBMITTED]: requests.filter(r => r.status === RequestStatus.SUBMITTED).length,
    [RequestStatus.APPROVED]: requests.filter(r => r.status === RequestStatus.APPROVED).length,
    [RequestStatus.REJECTED]: requests.filter(r => r.status === RequestStatus.REJECTED).length,
    [RequestStatus.PAID]: requests.filter(r => r.status === RequestStatus.PAID).length,
  }

  // Apply filters and search
  useEffect(() => {
    setPage(1)
    let filtered = [...requests]

    // Apply status filter
    if (statusFilter !== 'all') {
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

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        default:
          return 0
      }
    })

    setFilteredRequests(filtered)
  }, [requests, statusFilter, searchQuery, sortOption])

  // Client-side pagination over the filtered results
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
  }

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await fetchRequests(true)
  }

  // Sort menu handlers
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget)
  }

  const handleSortMenuClose = () => {
    setSortMenuAnchor(null)
  }

  const handleSortChange = (option: SortOption) => {
    setSortOption(option)
    handleSortMenuClose()
  }

  // Filter menu handlers
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget)
  }

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null)
  }

  // Status label and color mapping
  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.DRAFT:
        return {
          label: 'مسودة',
          color: 'default' as const,
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
          icon: <EditDocumentIcon fontSize="small" />,
        }
      case RequestStatus.SUBMITTED:
        return {
          label: 'قيد المراجعة',
          color: 'warning' as const,
          bgColor: alpha(theme.palette.warning.main, 0.1),
          textColor: theme.palette.warning.dark,
          icon: <PendingIcon fontSize="small" />,
        }
      case RequestStatus.APPROVED:
        return {
          label: 'معتمد',
          color: 'success' as const,
          bgColor: alpha(theme.palette.success.main, 0.1),
          textColor: theme.palette.success.dark,
          icon: <VerifiedIcon fontSize="small" />,
        }
      case RequestStatus.REJECTED:
        return {
          label: 'مرفوض',
          color: 'error' as const,
          bgColor: alpha(theme.palette.error.main, 0.1),
          textColor: theme.palette.error.main,
          icon: <CloseIcon fontSize="small" />,
        }
      case RequestStatus.PAID:
        return {
          label: 'تم الصرف',
          color: 'success' as const,
          bgColor: alpha(theme.palette.success.main, 0.1),
          textColor: theme.palette.success.dark,
          icon: <DoneAllIcon fontSize="small" />,
        }
      case RequestStatus.CANCELLED:
        return {
          label: 'ملغي',
          color: 'default' as const,
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
          icon: <CloseIcon fontSize="small" />,
        }
      default:
        return {
          label: status,
          color: 'default' as const,
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
      day: 'numeric' 
    })
  }

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getAdvanceStatusLabel = (status: AdvanceStatus) => {
    switch (status) {
      case AdvanceStatus.PENDING: return 'قيد المراجعة'
      case AdvanceStatus.APPROVED: return 'معتمدة'
      case AdvanceStatus.DISBURSED: return 'مصروفة'
      case AdvanceStatus.SETTLED: return 'مسوّاة'
      case AdvanceStatus.CANCELLED: return 'ملغاة / مرفوضة'
      default: return status
    }
  }

  const getAdvanceStatusColor = (status: AdvanceStatus) => {
    switch (status) {
      case AdvanceStatus.APPROVED:
      case AdvanceStatus.DISBURSED: return 'success'
      case AdvanceStatus.SETTLED: return 'info'
      case AdvanceStatus.PENDING: return 'warning'
      case AdvanceStatus.CANCELLED: return 'error'
      default: return 'default'
    }
  }

  // Handle request card click (navigate to detail page)
  const handleRequestClick = (request: Request) => {
    navigate(`/requests/${request.id}`)
  }

  // Handle new request click
  const handleNewRequest = () => {
    navigate('/create-request')
  }

  // Summary figures computed from fetched requests
  const now = new Date()
  const isThisMonth = (date: Date | string) => {
    const d = new Date(date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  const monthExpensesTotal = requests
    .filter((r) => isThisMonth(r.createdAt))
    .reduce((sum, r) => sum + r.amount, 0)
  const pendingAmount = requests
    .filter((r) => r.status === RequestStatus.SUBMITTED)
    .reduce((sum, r) => sum + r.amount, 0)
  const approvedAmount = requests
    .filter((r) => r.status === RequestStatus.APPROVED || r.status === RequestStatus.PAID)
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      pb: isMobile ? 8 : 0,
    }}>
      {/* Header */}
      <Box 
        sx={{ 
          position: 'sticky',
          top: 0,
          zIndex: 40,
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Logo placeholder */}
              <Box 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 1,
                  bgcolor: 'white',
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                  AG
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                  AG-Cash
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  الخليج العربي للصيانة والتشغيل
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small">
                <Notifications />
              </IconButton>
              <Box 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {/* User avatar placeholder */}
                <Box sx={{ width: '100%', height: '100%', bgcolor: 'grey.300' }} />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              طلبات العهدة والمصاريف
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              متابعة فورية للمصروفات النثرية والعهد قيد التنفيذ
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleRefresh} disabled={loading || refreshing}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={handleFilterMenuOpen}>
              <FilterIcon />
            </IconButton>
            <IconButton onClick={handleSortMenuOpen}>
              <SortIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search Input */}
        <Box sx={{ mb: 3 }}>
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
            label={isRtl ? `الكل ${statusCounts.all}` : `${statusCounts.all} الكل`}
            onClick={() => setStatusFilter('all')}
            sx={{
              bgcolor: statusFilter === 'all' ? 'primary.main' : 'background.paper',
              color: statusFilter === 'all' ? 'white' : 'text.primary',
              border: 1,
              borderColor: statusFilter === 'all' ? 'primary.main' : 'divider',
              fontWeight: statusFilter === 'all' ? 'bold' : 'normal',
            }}
          />
          <Chip
            label={isRtl ? `قيد المراجعة ${statusCounts[RequestStatus.SUBMITTED]}` : `${statusCounts[RequestStatus.SUBMITTED]} قيد المراجعة`}
            onClick={() => setStatusFilter(RequestStatus.SUBMITTED)}
            icon={<PendingIcon fontSize="small" />}
            sx={{
              bgcolor: statusFilter === RequestStatus.SUBMITTED ? alpha(theme.palette.warning.main, 0.1) : 'background.paper',
              color: statusFilter === RequestStatus.SUBMITTED ? theme.palette.warning.dark : 'text.primary',
              border: 1,
              borderColor: statusFilter === RequestStatus.SUBMITTED ? theme.palette.warning.main : 'divider',
            }}
          />
          <Chip
            label={isRtl ? `معتمد ${statusCounts[RequestStatus.APPROVED]}` : `${statusCounts[RequestStatus.APPROVED]} معتمد`}
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
            label={isRtl ? `مسودة ${statusCounts[RequestStatus.DRAFT]}` : `${statusCounts[RequestStatus.DRAFT]} مسودة`}
            onClick={() => setStatusFilter(RequestStatus.DRAFT)}
            icon={<EditDocumentIcon fontSize="small" />}
            sx={{
              bgcolor: statusFilter === RequestStatus.DRAFT ? alpha(theme.palette.text.disabled, 0.1) : 'background.paper',
              color: statusFilter === RequestStatus.DRAFT ? theme.palette.text.disabled : 'text.primary',
              border: 1,
              borderColor: statusFilter === RequestStatus.DRAFT ? 'divider' : 'divider',
            }}
          />
          <Chip
            label={isRtl ? `مرفوض ${statusCounts[RequestStatus.REJECTED]}` : `${statusCounts[RequestStatus.REJECTED]} مرفوض`}
            onClick={() => setStatusFilter(RequestStatus.REJECTED)}
            icon={<CloseIcon fontSize="small" />}
            sx={{
              bgcolor: statusFilter === RequestStatus.REJECTED ? alpha(theme.palette.error.main, 0.1) : 'background.paper',
              color: statusFilter === RequestStatus.REJECTED ? theme.palette.error.main : 'text.primary',
              border: 1,
              borderColor: statusFilter === RequestStatus.REJECTED ? theme.palette.error.main : 'divider',
            }}
          />
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                إجمالي مصروفات الشهر
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                <span className="number">{formatAmount(monthExpensesTotal)}</span> ر.س
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                المطالبات المعلقة
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: theme.palette.warning.dark }}>
                <span className="number">{formatAmount(pendingAmount)}</span> ر.س
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                طلبات معتمدة
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: theme.palette.success.dark }}>
                <span className="number">{formatAmount(approvedAmount)}</span> ر.س
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                الرصيد المتاح بالعهدة
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: theme.palette.primary.main }}>
                <span className="number">{formatAmount(availableBalance)}</span> ر.س
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Refreshing Indicator */}
        {refreshing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              جاري التحديث...
            </Typography>
          </Box>
        )}

        {/* Requests List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredRequests.length === 0 && !loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                لا توجد طلبات مطابقة للبحث
              </Typography>
            </Box>
          ) : (
            paginatedRequests.map((request) => {
              const statusConfig = getStatusConfig(request.status)
              const isDraft = request.status === RequestStatus.DRAFT

              return (
                <Card
                  key={request.id}
                  onClick={() => handleRequestClick(request)}
                  sx={{
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: isDraft ? '2px dashed' : 1,
                    borderColor: isDraft ? alpha(theme.palette.text.disabled, 0.3) : 'divider',
                    '&:hover': {
                      boxShadow: 2,
                      transform: 'scale(1.01)',
                    },
                    '&:active': {
                      transform: 'scale(0.99)',
                    },
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isDraft && (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        bgcolor: alpha(theme.palette.text.disabled, 0.3),
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ pr: isDraft ? 3 : 2 }}>
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
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, pr: isDraft ? 1 : 0 }}>
                      {request.description}
                    </Typography>

                    {/* Draft Alert */}
                    {isDraft && (
                      <Box sx={{ mb: 2, pr: 1 }}>
                        <Alert
                          severity="info"
                          sx={{
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                            '& .MuiAlert-icon': { fontSize: 16 },
                          }}
                        >
                          <Typography variant="caption">
                            بانتظار إرفاق الفاتورة النهائية وتأكيد الإرسال للتدقيق
                          </Typography>
                        </Alert>
                      </Box>
                    )}

                    {/* Card Footer */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      pt: 2,
                      borderTop: 1,
                      borderColor: 'divider',
                      pr: isDraft ? 1 : 0,
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
                            label="مرفقين (2)"
                            size="small"
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                            }}
                          />
                        )}
                      </Box>
                      {isDraft && (
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Edit draft:', request.id)
                          }}
                          sx={{ color: theme.palette.primary.main }}
                        >
                          متابعة التعديل
                        </Button>
                      )}
                      {!isDraft && (
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            <span className="number">{formatAmount(request.amount)}</span> ر.س
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )
            })
          )}
        </Box>

        {/* Dedicated Custody Requests */}
        {!loading && advances.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              طلبات العهدة المخصصة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {advances.map((adv) => (
                <Card key={adv.id} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          {adv.name || `#${adv.odooAdvanceId}`}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {adv.purpose}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(adv.createdAt).toLocaleDateString('ar-SA')}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          <span className="number">{formatAmount(adv.amount)}</span> ر.س
                        </Typography>
                        <Chip
                          label={getAdvanceStatusLabel(adv.status)}
                          size="small"
                          color={getAdvanceStatusColor(adv.status) as any}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Pagination */}
        {!loading && filteredRequests.length > PAGE_SIZE && (
          <Stack alignItems="center" sx={{ mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
              siblingCount={1}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1 }}>
              عرض {paginatedRequests.length} من {filteredRequests.length} طلب (الإجمالي: {total})
            </Typography>
          </Stack>
        )}
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        onClick={handleNewRequest}
        sx={{
          position: 'fixed',
          bottom: isMobile ? 80 : 24,
          left: isRtl ? 'auto' : 24,
          right: isRtl ? 24 : 'auto',
          borderRadius: 4,
          px: 2,
          gap: 1,
        }}
      >
        <AddIcon />
        {!isMobile && <Typography variant="button">طلب جديد</Typography>}
      </Fab>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortMenuClose}
      >
        <MenuItem onClick={() => handleSortChange('date-desc')} selected={sortOption === 'date-desc'}>
          الأحدث أولاً
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('date-asc')} selected={sortOption === 'date-asc'}>
          الأقدم أولاً
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('amount-desc')} selected={sortOption === 'amount-desc'}>
          المبلغ: الأعلى أولاً
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('amount-asc')} selected={sortOption === 'amount-asc'}>
          المبلغ: الأقل أولاً
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterMenuClose}
      >
        <MenuItem onClick={() => { setStatusFilter('all'); handleFilterMenuClose(); }} selected={statusFilter === 'all'}>
          الكل
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter(RequestStatus.DRAFT); handleFilterMenuClose(); }} selected={statusFilter === RequestStatus.DRAFT}>
          مسودة
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter(RequestStatus.SUBMITTED); handleFilterMenuClose(); }} selected={statusFilter === RequestStatus.SUBMITTED}>
          قيد المراجعة
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter(RequestStatus.APPROVED); handleFilterMenuClose(); }} selected={statusFilter === RequestStatus.APPROVED}>
          معتمد
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter(RequestStatus.REJECTED); handleFilterMenuClose(); }} selected={statusFilter === RequestStatus.REJECTED}>
          مرفوض
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter(RequestStatus.PAID); handleFilterMenuClose(); }} selected={statusFilter === RequestStatus.PAID}>
          تم الصرف
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Requests

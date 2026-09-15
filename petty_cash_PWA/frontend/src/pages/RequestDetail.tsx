import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  ArrowForward as ArrowBackIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Event as EventIcon,
  CreditCard as CreditCardIcon,
  AltRoute as AltRouteIcon,
  Check as CheckIcon,
  HourglassTop as HourglassTopIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  VerifiedUser as VerifiedUserIcon,
  ReceiptLong as ReceiptLongIcon,
  LocalGasStation as LocalGasStationIcon,
  Restaurant as RestaurantIcon,
  AttachFile as AttachFileIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { Request, RequestStatus, Expense } from '../../../shared/types'
import { requestsAPI, expensesAPI } from '../services/api'
import SarSymbol from '../components/SarSymbol'

interface RequestDetailProps {
  // Placeholder for future props like API service
}

interface TimelineStep {
  id: string
  title: string
  description: string
  time: string
  status: 'completed' | 'active' | 'upcoming'
  approver?: string
}

const formatStepTime = (d?: Date | string) =>
  d ? new Date(d).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : ''

const buildTimeline = (request: Request): TimelineStep[] => {
  const steps: TimelineStep[] = [
    {
      id: 'created',
      title: 'إنشاء الطلب',
      description: '',
      time: formatStepTime(request.createdAt),
      status: 'completed',
    },
  ]

  const submitted = !!request.submittedAt || !['DRAFT'].includes(request.status)
  steps.push({
    id: 'submitted',
    title: 'تقديم الطلب',
    description: '',
    time: formatStepTime(request.submittedAt),
    status: request.submittedAt ? 'completed' : submitted ? 'completed' : 'upcoming',
  })

  if (request.status === RequestStatus.REJECTED) {
    steps.push({
      id: 'rejected',
      title: 'رفض الطلب',
      description: request.rejectionReason || '',
      time: formatStepTime(request.rejectedAt || request.updatedAt),
      status: 'active',
      approver: request.rejectedBy,
    })
    return steps
  }

  const approved = !!request.approvedAt || request.status === RequestStatus.APPROVED || request.status === RequestStatus.PAID
  steps.push({
    id: 'approved',
    title: 'اعتماد الطلب',
    description: '',
    time: formatStepTime(request.approvedAt),
    status: approved ? 'completed' : request.status === RequestStatus.SUBMITTED ? 'active' : 'upcoming',
    approver: request.approvedBy,
  })

  if (request.status !== RequestStatus.CANCELLED) {
    steps.push({
      id: 'paid',
      title: 'الصرف والترحيل المحاسبي',
      description: '',
      time: request.status === RequestStatus.PAID ? formatStepTime(request.updatedAt) : '',
      status: request.status === RequestStatus.PAID ? 'completed' : 'upcoming',
    })
  }

  return steps
}

const RequestDetail: React.FC<RequestDetailProps> = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isRtl = theme.direction === 'rtl'
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [request, setRequest] = useState<Request | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const timeline = useMemo(() => (request ? buildTimeline(request) : []), [request])
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Fetch the request and its expense lines from the API
  useEffect(() => {
    if (!id) {
      setError('معرّف الطلب غير موجود')
      setPageLoading(false)
      return
    }

    const fetchRequest = async () => {
      setPageLoading(true)
      setError(null)
      try {
        const res = await requestsAPI.getById(id)
        const fetchedRequest = res.data
        if (!fetchedRequest) {
          throw new Error('Request not found')
        }
        setRequest(fetchedRequest)

        // Fetch related expense lines; fall back to expenses embedded in the request
        try {
          const expensesRes = await expensesAPI.getByRequestId(id)
          setExpenses(expensesRes.data ?? fetchedRequest.expenses ?? [])
        } catch {
          setExpenses(fetchedRequest.expenses ?? [])
        }
      } catch (err: any) {
        console.error('Failed to load request:', err)
        setError(err?.response?.data?.error?.message || 'تعذر تحميل تفاصيل الطلب. تحقق من اتصال الخادم.')
      } finally {
        setPageLoading(false)
      }
    }

    fetchRequest()
  }, [id])

  // Status configuration
  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.DRAFT:
        return {
          label: 'مسودة',
          color: 'default' as const,
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
        }
      case RequestStatus.SUBMITTED:
        return {
          label: 'قيد المراجعة',
          color: 'warning' as const,
          bgColor: alpha(theme.palette.warning.main, 0.1),
          textColor: theme.palette.warning.dark,
        }
      case RequestStatus.APPROVED:
        return {
          label: 'معتمد',
          color: 'success' as const,
          bgColor: alpha(theme.palette.success.main, 0.1),
          textColor: theme.palette.success.dark,
        }
      case RequestStatus.REJECTED:
        return {
          label: 'مرفوض',
          color: 'error' as const,
          bgColor: alpha(theme.palette.error.main, 0.1),
          textColor: theme.palette.error.main,
        }
      case RequestStatus.PAID:
        return {
          label: 'تم الصرف',
          color: 'success' as const,
          bgColor: alpha(theme.palette.success.main, 0.1),
          textColor: theme.palette.success.dark,
        }
      case RequestStatus.CANCELLED:
        return {
          label: 'ملغي',
          color: 'default' as const,
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
        }
      default:
        return {
          label: status,
          color: 'default' as const,
          bgColor: alpha(theme.palette.text.disabled, 0.1),
          textColor: theme.palette.text.disabled,
        }
    }
  }

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
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

  // Get expense icon
  const getExpenseIcon = (description: string) => {
    if (description.includes('وقود') || description.includes('fuel')) {
      return <LocalGasStationIcon />
    }
    if (description.includes('ضيافة') || description.includes('طعام') || description.includes('مطعم')) {
      return <RestaurantIcon />
    }
    return <ReceiptLongIcon />
  }

  // Calculate VAT for expense
  const calculateVAT = (amount: number) => {
    return amount * 0.15
  }

  // Handle back navigation
  const handleBack = () => {
    navigate('/requests')
  }

  // Handle share
  const handleShare = () => {
    if (!request) return
    if (navigator.share) {
      navigator.share({
        title: `طلب مصروف ${request.name || `#${request.odooRequestId}`}`,
        text: `متابعة طلب مصروف عهدة بقيمة ${formatAmount(request.amount)} ر.س على تطبيق AG-Cash`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('تم نسخ رابط الطلب إلى الحافظة بنجاح.')
    }
  }

  // Handle download report
  const handleDownload = async () => {
    setDownloading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setDownloading(false)
  }

  // Handle cancel request
  const handleCancel = async () => {
    if (!request) return
    setCancelling(true)
    try {
      const res = await requestsAPI.updateStatus(request.id, RequestStatus.CANCELLED)
      if (res.data) {
        setRequest(res.data)
      } else {
        setRequest({ ...request, status: RequestStatus.CANCELLED })
      }
      alert('تم إلغاء الطلب بنجاح.')
    } catch (err: any) {
      console.error('Failed to cancel request:', err)
      alert(err?.response?.data?.error?.message || 'تعذر إلغاء الطلب.')
    } finally {
      setCancelling(false)
    }
  }

  // Handle edit request (for draft status)
  const handleEdit = () => {
    if (!request) return
    navigate(`/edit-request/${request.id}`)
  }

  // Handle submit request (for draft status)
  const handleSubmit = async () => {
    if (!request) return
    setLoading(true)
    try {
      const res = await requestsAPI.updateStatus(request.id, RequestStatus.SUBMITTED)
      if (res.data) {
        setRequest(res.data)
      } else {
        setRequest({ ...request, status: RequestStatus.SUBMITTED })
      }
    } catch (err: any) {
      console.error('Failed to submit request:', err)
      alert(err?.response?.data?.error?.message || 'تعذر إرسال الطلب.')
    } finally {
      setLoading(false)
    }
  }

  // Open receipt modal
  const openReceiptModal = (receiptUrl: string, description: string) => {
    setSelectedReceipt(receiptUrl)
  }

  // Close receipt modal
  const closeReceiptModal = () => {
    setSelectedReceipt(null)
  }

  // Loading state
  if (pageLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          جاري تحميل تفاصيل الطلب...
        </Typography>
      </Box>
    )
  }

  // Error / not found state
  if (error || !request) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="md">
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || 'الطلب غير موجود'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon sx={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />}
            onClick={handleBack}
            variant="outlined"
          >
            العودة إلى الطلبات
          </Button>
        </Container>
      </Box>
    )
  }

  const statusConfig = getStatusConfig(request.status)
  const isDraft = request.status === RequestStatus.DRAFT
  const isSubmitted = request.status === RequestStatus.SUBMITTED
  const isApproved = request.status === RequestStatus.APPROVED
  const isPaid = request.status === RequestStatus.PAID
  const isRejected = request.status === RequestStatus.REJECTED

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      pb: isMobile ? 20 : 4,
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
        <Container maxWidth="md" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={handleBack}>
                <ArrowBackIcon sx={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
              </IconButton>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  طلب مصاريف عهدة
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  <span className="number">{request.name || `#${request.odooRequestId}`}</span>
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={handleShare}>
                <ShareIcon />
              </IconButton>
              <IconButton>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Summary Card */}
        <Card 
          elevation={2}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -48,
              left: -48,
              width: 128,
              height: 128,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              filter: 'blur(40px)',
            }}
          />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  المبلغ الإجمالي المستحق
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    <span className="number">{formatAmount(request.amount)}</span>
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    <SarSymbol />
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={statusConfig.label}
                sx={{
                  bgcolor: statusConfig.bgColor,
                  color: statusConfig.textColor,
                  border: 1,
                  borderColor: alpha(statusConfig.textColor, 0.3),
                  fontWeight: 'bold',
                }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  تاريخ التقديم: {formatDate(request.submittedAt || request.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  خصم من عهدة الميدان #02
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card elevation={1} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              وصف الطلب
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {request.description}
            </Typography>
          </CardContent>
        </Card>

        {/* Approval Timeline */}
        <Card elevation={1} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AltRouteIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  دورة الاعتماد والموافقة
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 'medium' }}>
                {(() => {
                  const current = timeline.findIndex(s => s.status !== 'completed')
                  return `المرحلة ${current === -1 ? timeline.length : current + 1} من ${timeline.length}`
                })()}
              </Typography>
            </Box>

            <Box sx={{ position: 'relative', pr: 2 }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 14,
                  bottom: 14,
                  right: 'calc(16px + 13px)',
                  width: 2,
                  bgcolor: 'divider',
                }}
              />

              {timeline.map((step, index) => (
                <Box key={step.id} sx={{ mb: 4, position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    {/* Step indicator */}
                    <Box
                      sx={{
                        position: 'relative',
                        zIndex: 10,
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(step.status === 'completed' && {
                          bgcolor: alpha(theme.palette.success.main, 0.15),
                          border: 1,
                          borderColor: theme.palette.success.main,
                          color: theme.palette.success.main,
                        }),
                        ...(step.status === 'active' && {
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          animation: 'pulse 2s infinite',
                        }),
                        ...(step.status === 'upcoming' && {
                          bgcolor: 'action.hover',
                          border: 1,
                          borderColor: 'divider',
                          color: 'text.disabled',
                        }),
                      }}
                    >
                      {step.status === 'completed' && <CheckIcon fontSize="small" sx={{ fontWeight: 'bold' }} />}
                      {step.status === 'active' && <HourglassTopIcon fontSize="small" />}
                      {step.status === 'upcoming' && <RadioButtonUncheckedIcon fontSize="small" />}
                    </Box>

                    {/* Step content */}
                    <Box sx={{ flexGrow: 1, pt: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {step.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <span className="number">{step.time}</span>
                        </Typography>
                      </Box>

                      {step.approver && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mt: 0.5, px: 2, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <VerifiedUserIcon fontSize="small" sx={{ fontSize: 14 }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            معتمد: {step.approver}
                          </Typography>
                        </Box>
                      )}

                      {step.description && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: step.status === 'active' ? 'text.primary' : 'text.secondary',
                            mt: step.approver ? 0.5 : 0,
                            ...(step.status === 'active' && {
                              bgcolor: alpha(theme.palette.primary.main, 0.05),
                              p: 1.5,
                              borderRadius: 1,
                              border: 1,
                              borderColor: alpha(theme.palette.primary.main, 0.2),
                            }),
                          }}
                        >
                          {step.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Expense Lines */}
        <Card elevation={1} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ReceiptLongIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  بنود المصروفات ({expenses.length})
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                <span className="number">شامل ضريبة 15%</span>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {expenses.map((expense) => (
                <Box
                  key={expense.id}
                  sx={{
                    p: 2.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.palette.primary.main,
                        flexShrink: 0,
                      }}
                    >
                      {getExpenseIcon(expense.description)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {expense.description}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        مصروف عام • ضريبي
                      </Typography>
                      <Chip
                        label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>ضريبة: {formatAmount(calculateVAT(expense.amount))} <SarSymbol /></Box>}
                        size="small"
                        sx={{
                          mt: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      <span className="number">{formatAmount(expense.amount)}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <SarSymbol />
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Receipts/Attachments */}
        <Card elevation={1} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AttachFileIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  المرفقات والإيصالات
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {(() => {
                  const n = expenses.filter(e => e.receiptUrl).length
                  if (n === 0) return 'لا توجد مرفقات'
                  if (n === 1) return 'مرفق واحد'
                  if (n === 2) return 'مرفقان'
                  return `${n} مرفقات`
                })()}
              </Typography>
            </Box>

            {expenses.filter(e => e.receiptUrl).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  لم يتم إرفاق إيصالات لهذا الطلب
                </Typography>
              </Box>
            )}

            <Grid container spacing={2}>
              {expenses.filter(e => e.receiptUrl).map((expense, index) => (
                <Grid item xs={6} key={expense.id}>
                  <Box
                    onClick={() => openReceiptModal(expense.receiptUrl!, expense.description)}
                    sx={{
                      position: 'relative',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      aspectRatio: '1',
                      '&:hover': {
                        '& img': {
                          transform: 'scale(1.05)',
                        },
                      },
                    }}
                  >
                    <img
                      src={expense.receiptUrl}
                      alt={expense.description}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.2s',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        p: 1.5,
                      }}
                    >
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'white', 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '70%'
                          }}
                        >
                          {expense.description.substring(0, 15)}...
                        </Typography>
                        <ZoomInIcon fontSize="small" />
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Administrative Notes */}
        {isApproved && (
          <Card elevation={1} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <ReceiptLongIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  الملاحظات الإدارية
                </Typography>
              </Box>

              <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRight: 4, borderColor: theme.palette.primary.main, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    م. خالد السعيد (مدير العمليات)
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    منذ 3 ساعات
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  "تم التدقيق والموافقة، نرجو استكمال الترحيل المحاسبي وتغذية العهدة وفق جدول الصرف الأسبوعي المعتمد."
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Rejection Reason */}
        {isRejected && request.rejectionReason && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              سبب الرفض
            </Typography>
            <Typography variant="body2">
              {request.rejectionReason}
            </Typography>
          </Alert>
        )}
      </Container>

      {/* Sticky Bottom Action Bar */}
      <Box
        sx={{
          position: 'fixed',
          // On mobile sit above the fixed bottom nav (56px + safe area)
          bottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          boxShadow: 3,
          zIndex: 30,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Draft Actions */}
            {isDraft && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={cancelling ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <CancelIcon />}
                  onClick={handleCancel}
                  disabled={cancelling}
                  sx={{ flex: 1, height: 48 }}
                >
                  {cancelling ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{ flex: 1, height: 48 }}
                >
                  تعديل
                </Button>
                <Button
                  variant="contained"
                  startIcon={loading ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <SendIcon />}
                  onClick={handleSubmit}
                  disabled={loading}
                  sx={{ flex: 2, height: 48 }}
                >
                  {loading ? 'جاري الإرسال...' : 'إرسال للموافقة'}
                </Button>
              </>
            )}

            {/* Submitted Actions */}
            {isSubmitted && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={cancelling ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <CancelIcon />}
                  onClick={handleCancel}
                  disabled={cancelling}
                  sx={{ flex: 1, height: 48 }}
                >
                  {cancelling ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={downloading ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={downloading}
                  sx={{ flex: 2, height: 48 }}
                >
                  {downloading ? 'جاري الإنشاء...' : 'تحميل تقرير المصروف (PDF)'}
                </Button>
              </>
            )}

            {/* Approved/Paid Actions */}
            {(isApproved || isPaid) && (
              <Button
                variant="contained"
                fullWidth
                startIcon={downloading ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={downloading}
                sx={{ height: 48 }}
              >
                {downloading ? 'جاري الإنشاء...' : 'تحميل تقرير المصروف (PDF)'}
              </Button>
            )}

            {/* Rejected Actions */}
            {isRejected && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{ flex: 1, height: 48 }}
                >
                  تعديل وإعادة الإرسال
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  sx={{ flex: 1, height: 48 }}
                >
                  إلغاء الطلب
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* Receipt Modal */}
      <Dialog
        open={selectedReceipt !== null}
        onClose={closeReceiptModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            معاينة الإيصال الضريبي
          </Typography>
          <IconButton onClick={closeReceiptModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selectedReceipt && (
            <img
              src={selectedReceipt}
              alt="Receipt"
              style={{
                maxWidth: '100%',
                maxHeight: '530px',
                objectFit: 'contain',
                borderRadius: 1,
                cursor: 'zoom-in',
              }}
              onClick={(e) => {
                e.currentTarget.style.transform = 
                  e.currentTarget.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)'
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>
            انقر على الصورة للتكبير / التصغير
          </Typography>
          <Button
            startIcon={<DownloadIcon />}
            sx={{ color: theme.palette.primary.main }}
            onClick={() => {
              // Download functionality would go here
              alert('جاري تنزيل الأصل...')
            }}
          >
            تنزيل الأصل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RequestDetail

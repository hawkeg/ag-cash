import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import {
  ArrowForward,
  Send,
  AccountBalanceWallet,
  CalendarToday,
  Description,
  AttachMoney,
  ArrowBack,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { CreateAdvanceDto } from '@shared/types'

enum AdvanceType {
  TRAVEL = 'TRAVEL',
  OPERATIONAL = 'OPERATIONAL',
  EMERGENCY = 'EMERGENCY',
  PROJECT = 'PROJECT',
  TRAINING = 'TRAINING',
}

interface AdvanceRequestProps {
  onSubmit?: (advance: CreateAdvanceDto) => Promise<void>
  loading?: boolean
}

const AdvanceRequest: React.FC<AdvanceRequestProps> = ({
  onSubmit,
  loading = false,
}) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateAdvanceDto>({
    amount: 0,
    purpose: '',
    expectedReturnDate: undefined,
  })
  const [advanceType, setAdvanceType] = useState<AdvanceType>(AdvanceType.OPERATIONAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const advanceTypeLabels: Record<AdvanceType, string> = {
    [AdvanceType.TRAVEL]: 'سفر / مكث ميداني',
    [AdvanceType.OPERATIONAL]: 'تشغيلي /日常 مصاريف',
    [AdvanceType.EMERGENCY]: 'طوارئ / مستعجل',
    [AdvanceType.PROJECT]: 'مشروع خاص',
    [AdvanceType.TRAINING]: 'تدريب / دورة',
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!advanceType) {
      newErrors.advanceType = 'الرجاء اختيار نوع السلفة'
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'الرجاء إدخال مبلغ صحيح'
    } else if (formData.amount < 100) {
      newErrors.amount = 'الحد الأدنى للسلفة 100 ريال'
    } else if (formData.amount > 50000) {
      newErrors.amount = 'الحد الأقصى للسلفة 50,000 ريال'
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'الرجاء إدخال الغرض من السلفة'
    } else if (formData.purpose.length < 10) {
      newErrors.purpose = 'الوصف يجب أن يكون 10 أحرف على الأقل'
    }

    if (!formData.expectedReturnDate) {
      newErrors.expectedReturnDate = 'الرجاء تحديد تاريخ الاسترجاع المتوقع'
    } else {
      const returnDate = new Date(formData.expectedReturnDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (returnDate <= today) {
        newErrors.expectedReturnDate = 'تاريخ الاسترجاع يجب أن يكون في المستقبل'
      }

      const maxReturnDate = new Date()
      maxReturnDate.setMonth(maxReturnDate.getMonth() + 6)
      if (returnDate > maxReturnDate) {
        newErrors.expectedReturnDate = 'الحد الأقصى لفترة السلفة 6 أشهر'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const advanceDto: CreateAdvanceDto = {
        ...formData,
        purpose: `[${advanceTypeLabels[advanceType]}] ${formData.purpose}`,
      }

      if (onSubmit) {
        await onSubmit(advanceDto)
      } else {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('Advance request submitted:', advanceDto)
        navigate('/requests')
      }
    } catch (error) {
      console.error('Error submitting advance request:', error)
      setErrors({ submit: 'حدث خطأ أثناء إرسال الطلب' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount)
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('ar-SA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      pb: 10,
      direction: 'rtl'
    }}>
      {/* Header */}
      <Paper 
        elevation={1}
        sx={{ 
          position: 'sticky',
          top: 0,
          zIndex: 40,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="md" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate(-1)}>
                <ArrowForward sx={{ transform: 'rotate(180deg)' }} />
              </IconButton>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'Cairo' }}>
                  طلب سلفة جديدة
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  سلفة عهدة الصندوق الصغير
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Form Card */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2, 
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main'
              }}>
                <AccountBalanceWallet />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'Cairo', fontWeight: 600 }}>
                  بيانات السلفة
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  أدخل تفاصيل طلب السلفة المطلوب
                </Typography>
              </Box>
            </Box>

            {errors.submit && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.submit}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Advance Type */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  نوع السلفة <span style={{ color: '#ba1a1a' }}>*</span>
                </Typography>
                <FormControl fullWidth error={!!errors.advanceType}>
                  <InputLabel id="advance-type-label">اختر نوع السلفة</InputLabel>
                  <Select
                    labelId="advance-type-label"
                    value={advanceType}
                    label="اختر نوع السلفة"
                    onChange={(e) => {
                      setAdvanceType(e.target.value as AdvanceType)
                      if (errors.advanceType) {
                        setErrors({ ...errors, advanceType: '' })
                      }
                    }}
                  >
                    {Object.entries(advanceTypeLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.advanceType && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.advanceType}
                    </Typography>
                  )}
                </FormControl>
              </Box>

              {/* Amount */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  مبلغ السلفة (ريال سعودي) <span style={{ color: '#ba1a1a' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  placeholder="أدخل المبلغ المطلوب"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    setFormData({ ...formData, amount: value })
                    if (errors.amount) {
                      setErrors({ ...errors, amount: '' })
                    }
                  }}
                  error={!!errors.amount}
                  helperText={errors.amount || 'الحد الأدنى: 100 ريال | الحد الأقصى: 50,000 ريال'}
                  InputProps={{
                    startAdornment: <AttachMoney sx={{ mr: 1, color: 'text.secondary' }} />,
                    inputProps: { 
                      min: 100, 
                      max: 50000,
                      step: 0.01
                    }
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      fontFamily: 'Inter',
                    }
                  }}
                />
                {formData.amount > 0 && (
                  <Typography variant="body2" color="primary.main" sx={{ mt: 1, fontWeight: 600 }}>
                    المبلغ: <span className="number">{formatCurrency(formData.amount)}</span>
                  </Typography>
                )}
              </Box>

              {/* Purpose/Description */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  الغرض من السلفة <span style={{ color: '#ba1a1a' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="اشرح بالتفصيل الغرض من السلفة والمصاريف المتوقعة..."
                  value={formData.purpose}
                  onChange={(e) => {
                    setFormData({ ...formData, purpose: e.target.value })
                    if (errors.purpose) {
                      setErrors({ ...errors, purpose: '' })
                    }
                  }}
                  error={!!errors.purpose}
                  helperText={errors.purpose || 'أدخل وصفاً تفصيلياً للغرض من السلفة (أقل 10 أحرف)'}
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      fontFamily: 'Tajawal',
                    }
                  }}
                />
              </Box>

              {/* Expected Return Date */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  تاريخ الاسترجاع المتوقع <span style={{ color: '#ba1a1a' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.expectedReturnDate ? new Date(formData.expectedReturnDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    setFormData({ ...formData, expectedReturnDate: date })
                    if (errors.expectedReturnDate) {
                      setErrors({ ...errors, expectedReturnDate: '' })
                    }
                  }}
                  error={!!errors.expectedReturnDate}
                  helperText={errors.expectedReturnDate || 'الحد الأقصى لفترة السلفة: 6 أشهر من تاريخ الطلب'}
                  InputProps={{
                    startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0],
                    max: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  }}
                />
                {formData.expectedReturnDate && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    التاريخ المحدد: <span className="number">{formatDate(formData.expectedReturnDate)}</span>
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card elevation={1} sx={{ mb: 3, bgcolor: 'primary.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Description color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                ملخص الطلب
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  نوع السلفة
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {advanceTypeLabels[advanceType]}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  المبلغ المطلوب
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  <span className="number">{formatCurrency(formData.amount || 0)}</span>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  تاريخ الاسترجاع
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  <span className="number">{formData.expectedReturnDate ? formatDate(formData.expectedReturnDate) : 'غير محدد'}</span>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={isSubmitting || loading}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
          sx={{
            py: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
            fontFamily: 'Cairo',
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
            }
          }}
        >
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال للموافقة'}
        </Button>

        {/* Info Note */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="caption" color="info.dark">
            ⚠️ ملاحظة: سيتم مراجعة طلبك من قبل المدير المختص. سيتم إشعارك بقرار الموافقة أو الرفض عبر البريد الإلكتروني وتطبيق الهاتف.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default AdvanceRequest

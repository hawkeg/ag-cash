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
  Description,
  AttachMoney,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { CreateAdvanceDto } from '@shared/types'
import { advancesAPI } from '../services/api'

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
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'الرجاء إدخال مبلغ صحيح أكبر من صفر'
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'الرجاء إدخال الغرض من العهدة'
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = 'الوصف يجب أن يكون 10 أحرف على الأقل'
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
        amount: formData.amount,
        purpose: formData.purpose.trim(),
      }

      if (onSubmit) {
        await onSubmit(advanceDto)
      } else {
        const res = await advancesAPI.create(advanceDto)
        if (res.success) {
          navigate('/')
          return
        }
        throw new Error(res.error?.message || 'Failed to create advance request')
      }
    } catch (error: any) {
      console.error('Error submitting advance request:', error)
      setErrors({
        submit: error?.response?.data?.error?.message || error?.message || 'حدث خطأ أثناء إرسال الطلب',
      })
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
                  طلب عهدة مخصصة
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  طلب صرف مبلغ مخصص من الصندوق الصغير
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
                color: '#e8f5f2'
              }}>
                <AccountBalanceWallet />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'Cairo', fontWeight: 600 }}>
                  بيانات العهدة المخصصة
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  أدخل تفاصيل طلب العهدة المطلوب
                </Typography>
              </Box>
            </Box>

            {errors.submit && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.submit}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Amount */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  مبلغ العهدة (ريال سعودي) <span style={{ color: '#ba1a1a' }}>*</span>
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
                  helperText={errors.amount}
                  InputProps={{
                    startAdornment: <AttachMoney sx={{ mr: 1, color: 'text.secondary' }} />,
                    inputProps: {
                      min: 0,
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

              {/* Reason */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  الغرض / سبب الطلب <span style={{ color: '#ba1a1a' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="اشرح بالتفصيل الغرض من العهدة والمصاريف المتوقعة..."
                  value={formData.purpose}
                  onChange={(e) => {
                    setFormData({ ...formData, purpose: e.target.value })
                    if (errors.purpose) {
                      setErrors({ ...errors, purpose: '' })
                    }
                  }}
                  error={!!errors.purpose}
                  helperText={errors.purpose || 'أدخل وصفاً تفصيلياً للغرض من العهدة (أقل 10 أحرف)'}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'Tajawal',
                    }
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card elevation={1} sx={{ mb: 3, bgcolor: 'primary.light', color: '#e8f5f2' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Description sx={{ color: '#e8f5f2' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e8f5f2' }}>
                ملخص الطلب
              </Typography>
            </Box>
            <Divider sx={{ mb: 2, borderColor: 'rgba(232,245,242,0.3)' }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'rgba(232,245,242,0.75)' }}>
                  نوع الطلب
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#e8f5f2' }}>
                  عهدة مخصصة
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'rgba(232,245,242,0.75)' }}>
                  المبلغ المطلوب
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#e8f5f2' }}>
                  <span className="number">{formatCurrency(formData.amount || 0)}</span>
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
            ملاحظة: سيتم مراجعة طلبك من قبل المدير المختص. بعد الاعتماد والصرف يتم تسوية العهدة المخصصة عبر طلب مصروف مرتبط بها.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default AdvanceRequest

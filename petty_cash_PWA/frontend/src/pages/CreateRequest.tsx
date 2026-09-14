import React, { useState, useEffect } from 'react'
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
  Chip,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material'
import {
  ArrowForward,
  Save,
  Badge,
  CalendarToday,
  AddCircle,
  Restaurant,
  Inventory2,
  Edit,
  Delete,
  PhotoCamera,
  AddPhotoAlternate,
  Check,
  Calculate,
  Drafts,
  Send,
  ExpandMore,
  Storefront,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { 
  RequestType, 
  RequestStatus, 
  Category, 
  CreateRequestDto,
  Expense 
} from '@shared/types'
import { requestsAPI, expensesAPI } from '../services/api'

interface ExpenseLine {
  id: string
  description: string
  categoryId?: number
  vendorId?: number
  vendorName?: string
  amount: number
  hasVAT: boolean
  receiptUrl?: string
}

interface VendorOption {
  id: number
  name: string
  vat?: string
}

interface CreateRequestProps {
  categories?: Category[]
  onSubmit?: (request: CreateRequestDto) => Promise<void>
  onSaveDraft?: (request: CreateRequestDto) => Promise<void>
  loading?: boolean
}

const CreateRequest: React.FC<CreateRequestProps> = ({
  categories: categoriesProp,
  onSubmit,
  onSaveDraft,
  loading = false,
}) => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>(categoriesProp ?? [])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const holderName = localStorage.getItem('userName') || ''

  useEffect(() => {
    if (categoriesProp && categoriesProp.length) return
    expensesAPI.getCategories()
      .then((res) => setCategories(res.data ?? []))
      .catch(() => {})
  }, [])

  // Vendor search (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      setVendorsLoading(true)
      expensesAPI.getVendors(vendorSearch || undefined)
        .then((res) => setVendors(res.data ?? []))
        .catch(() => {})
        .finally(() => setVendorsLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [vendorSearch])

  const selectedCategory = categories.find((c) => c.odooCategoryId === currentExpense.categoryId) as any
  const [requestDescription, setRequestDescription] = useState('')
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([])
  const [currentExpense, setCurrentExpense] = useState<ExpenseLine>({
    id: '',
    description: '',
    categoryId: undefined,
    vendorName: '',
    amount: 0,
    hasVAT: false,
    receiptUrl: undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!requestDescription.trim()) {
      newErrors.requestDescription = 'الرجاء إدخال وصف الطلب'
    } else if (requestDescription.trim().length < 5) {
      newErrors.requestDescription = 'وصف الطلب يجب أن يكون 5 أحرف على الأقل'
    }

    if (expenseLines.length === 0) {
      newErrors.expenseLines = 'الرجاء إضافة بند مصروف واحد على الأقل'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateExpenseLine = (expense: ExpenseLine): boolean => {
    const newErrors: Record<string, string> = {}

    if (!expense.description.trim()) {
      newErrors.description = 'الرجاء إدخال وصف البند'
    } else if (expense.description.trim().length < 5) {
      newErrors.description = 'وصف البند يجب أن يكون 5 أحرف على الأقل'
    }

    if (!expense.categoryId) {
      newErrors.categoryId = 'الرجاء اختيار التصنيف المالي'
    }

    // Category-driven validation rules from Odoo (require_vendor / require_attachment)
    const cat = categories.find((c) => c.odooCategoryId === expense.categoryId) as any
    if (cat?.requireVendor && !expense.vendorId && !expense.vendorName?.trim()) {
      newErrors.vendorId = 'هذا التصنيف يتطلب اختيار مورد'
    }
    if (cat?.requireAttachment && !expense.receiptUrl) {
      newErrors.receiptUrl = 'هذا التصنيف يتطلب إرفاق إيصال'
    }

    if (expense.amount <= 0) {
      newErrors.amount = 'الرجاء إدخال مبلغ صحيح'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddExpense = async () => {
    if (!validateExpenseLine(currentExpense)) {
      return
    }

    let vendorId = currentExpense.vendorId
    const vendorName = currentExpense.vendorName?.trim()

    // If a free-typed vendor name has no Odoo partner yet, create it now
    if (!vendorId && vendorName) {
      try {
        const res = await expensesAPI.createVendor({ name: vendorName })
        vendorId = res.data?.odooVendorId
      } catch (e) {
        // Vendor creation is best-effort; keep the name as a note
        console.warn('Could not create vendor in Odoo:', e)
      }
    }

    const newExpense: ExpenseLine = {
      ...currentExpense,
      vendorId,
      vendorName,
      id: Date.now().toString(),
    }

    setExpenseLines([...expenseLines, newExpense])
    setCurrentExpense({
      id: '',
      description: '',
      categoryId: undefined,
      vendorId: undefined,
      vendorName: '',
      amount: 0,
      hasVAT: false,
      receiptUrl: undefined,
    })
    setShowExpenseForm(false)
    setErrors({})
  }

  const handleDeleteExpense = (id: string) => {
    setExpenseLines(expenseLines.filter((line) => line.id !== id))
  }

  const handleEditExpense = (id: string) => {
    const expense = expenseLines.find((line) => line.id === id)
    if (expense) {
      setCurrentExpense(expense)
      setShowExpenseForm(true)
      setExpenseLines(expenseLines.filter((line) => line.id !== id))
    }
  }

  const handleCameraCapture = () => {
    // Placeholder for camera integration
    console.log('Camera capture - to be implemented')
    // In a real implementation, this would open the camera
    // and capture the receipt image
  }

  const handleGalleryUpload = () => {
    // Placeholder for gallery upload
    console.log('Gallery upload - to be implemented')
    // In a real implementation, this would open the file picker
  }

  const calculateTotals = () => {
    const subtotal = expenseLines.reduce((sum, line) => sum + line.amount, 0)
    const vat = expenseLines.reduce((sum, line) => {
      return line.hasVAT ? sum + (line.amount * 0.15) : sum
    }, 0)
    const total = subtotal + vat

    return { subtotal, vat, total }
  }

  const handleSubmit = async (isDraft: boolean) => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const requestDto: CreateRequestDto = {
        type: RequestType.EXPENSE,
        amount: calculateTotals().total,
        description: requestDescription,
        submit: !isDraft,
        expenses: expenseLines.map((line) => ({
          categoryId: line.categoryId,
          vendorId: line.vendorId,
          amount: line.amount,
          description: line.description,
          receiptUrl: line.receiptUrl,
          ...(line.vendorName && !line.vendorId ? { notes: `المورد: ${line.vendorName}` } : {}),
        } as any)),
      }

      if (isDraft) {
        if (onSaveDraft) {
          await onSaveDraft(requestDto)
          return
        }
      } else if (onSubmit) {
        await onSubmit(requestDto)
        return
      }

      const res = await requestsAPI.create(requestDto)
      if (res.success && res.data) {
        navigate(`/requests/${res.data.id}`)
        return
      }
      throw new Error(res.error?.message || 'Failed to create request')
    } catch (error: any) {
      console.error('Error submitting request:', error)
      setErrors({
        submit: error?.response?.data?.error?.message || error?.message || 'حدث خطأ أثناء إرسال الطلب',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryIcon = (categoryId?: number) => {
    // Simple icon mapping based on category
    switch (categoryId) {
      case 1:
        return <Restaurant />
      case 2:
        return <Inventory2 />
      default:
        return <Badge />
    }
  }

  const getCategoryName = (categoryId?: number) => {
    const category = categories.find((cat) => cat.odooCategoryId === categoryId)
    return category ? (category.nameAr || category.name) : ''
  }

  const { subtotal, vat, total } = calculateTotals()

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'Cairo' }}>
            طلب صرف عهدة جديد
          </Typography>
          <Typography variant="caption" color="text.secondary">
            طلب جديد — يتم إنشاء الرقم تلقائياً في Odoo
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Save />}
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          size="small"
        >
          حفظ مسودة
        </Button>
      </Box>

      <Box sx={{ py: 2 }}>
        {/* General Info Card */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 1, 
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main'
                }}>
                  <Badge fontSize="small" />
                </Box>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Cairo', fontWeight: 600 }}>
                  البيانات الأساسية للطلب
                </Typography>
              </Box>
              <Chip 
                label="عهدة تشغيلية نشطة"
                size="small"
                color="primary"
                variant="filled"
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  اسم صاحب العهدة
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'divider'
                }}>
                  <Box sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%',
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    fontWeight: 'bold',
                    fontSize: '0.75rem'
                  }}>
                    {holderName ? holderName.replace(/\[.*?\]/g, '').trim().charAt(0) : '؟'}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {holderName || 'صاحب العهدة'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
                    (محدد تلقائياً)
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  تاريخ الطلب
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'divider'
                }}>
                  <Typography variant="body2" sx={{ fontFamily: 'Inter' }}>
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                  <CalendarToday fontSize="small" color="action" />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                الغرض العام من الصرف والبيان
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="أدخل ملخصاً لمصاريف الزيارة الميدانية أو المشتريات المستعجلة..."
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                error={!!errors.requestDescription}
                helperText={errors.requestDescription}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    fontFamily: 'Tajawal',
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Expense Lines Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Cairo' }}>
                بنود المصاريف
              </Typography>
              <Chip 
                label={expenseLines.length}
                size="small"
                color="primary"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              إرفاق الفاتورة إلزامي لكل بند
            </Typography>
          </Box>

          {/* Add Expense Button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowExpenseForm(true)}
            sx={{ 
              height: 48,
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: 'primary.main',
              bgcolor: 'primary.light',
              color: 'primary.main',
              fontWeight: 600,
              mb: 2,
              '&:hover': {
                bgcolor: 'primary.light',
                borderColor: 'primary.main',
              }
            }}
            startIcon={<AddCircle />}
          >
            + إضافة بند مصروف جديد
          </Button>

          {/* Expense List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {expenseLines.map((expense) => (
              <Card key={expense.id} elevation={1}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 1, 
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'primary.main',
                        flexShrink: 0
                      }}>
                        {getCategoryIcon(expense.categoryId)}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {expense.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip 
                            label={getCategoryName(expense.categoryId)}
                            size="small"
                            variant="outlined"
                          />
                          {expense.vendorName && (
                            <Typography variant="caption" color="text.secondary">
                              • {expense.vendorName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ fontFamily: 'Inter', fontWeight: 'bold' }}>
                        {expense.amount.toFixed(2)} <Typography variant="caption" color="text.secondary">ر.س</Typography>
                      </Typography>
                      {expense.hasVAT && (
                        <Chip 
                          label="شامل الضريبة 15%"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ mt: 0.5, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {expense.receiptUrl ? (
                        <>
                          <Box sx={{ 
                            width: 28, 
                            height: 28, 
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                            overflow: 'hidden',
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check fontSize="small" color="primary" />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Check fontSize="inherit" color="primary" />
                            مرفق الإيصال الأصلي
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="error">
                          لم يتم إرفاق الإيصال
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEditExpense(expense.id)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteExpense(expense.id)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Expense Entry Form */}
        {showExpenseForm && (
          <Card 
            elevation={2} 
            sx={{ 
              mb: 3,
              border: 2,
              borderColor: 'primary.main',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    animation: 'pulse 2s infinite'
                  }} />
                  <Typography variant="h6" sx={{ fontFamily: 'Cairo' }}>
                    إدخال تفاصيل البند
                  </Typography>
                </Box>
                <Chip 
                  label={`بند جديد #${expenseLines.length + 1}`}
                  size="small"
                  color="primary"
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Description */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    وصف البند / الغرض من الشراء <span style={{ color: '#ba1a1a' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="مثال: رسوم شحن طرد مستندات قانونية"
                    value={currentExpense.description}
                    onChange={(e) => setCurrentExpense({ ...currentExpense, description: e.target.value })}
                    error={!!errors.description}
                    helperText={errors.description}
                  />
                </Box>

                {/* Category Select */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    التصنيف المالي المعتمد <span style={{ color: '#ba1a1a' }}>*</span>
                  </Typography>
                  <FormControl fullWidth size="small" error={!!errors.categoryId}>
                    <Select
                      value={currentExpense.categoryId || ''}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, categoryId: Number(e.target.value) })}
                      displayEmpty
                      IconComponent={ExpandMore}
                    >
                      <MenuItem value="" disabled>
                        اختر التصنيف
                      </MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.odooCategoryId}>
                          {category.nameAr || category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {errors.categoryId && (
                    <Typography variant="caption" color="error">{errors.categoryId}</Typography>
                  )}
                </Box>

                {/* Vendor Name (Odoo res.partner picker) */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    اسم المورد / المتجر {selectedCategory?.requireVendor && <span style={{ color: '#ba1a1a' }}>*</span>}
                  </Typography>
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={vendors}
                    loading={vendorsLoading}
                    getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
                    inputValue={currentExpense.vendorName || ''}
                    onInputChange={(_e, value, reason) => {
                      setCurrentExpense({ ...currentExpense, vendorName: value, vendorId: reason === 'reset' ? currentExpense.vendorId : undefined })
                      setVendorSearch(value)
                    }}
                    onChange={async (_e, value) => {
                      if (value && typeof value !== 'string') {
                        setCurrentExpense({ ...currentExpense, vendorId: value.id, vendorName: value.name })
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="مثال: شركة سمسا للنقل السريع"
                        error={!!errors.vendorId}
                        helperText={errors.vendorId || 'ابحث في موردي Odoo — اكتب اسماً جديداً لإنشائه عند الإرسال'}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <Storefront sx={{ mr: 1, color: 'text.secondary' }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>

                {/* Amount & VAT */}
                <Paper sx={{ p: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      المبلغ الإجمالي (ر.س) <span style={{ color: '#ba1a1a' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="0.00"
                      value={currentExpense.amount || ''}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, amount: Number(e.target.value) })}
                      error={!!errors.amount}
                      helperText={errors.amount}
                      InputProps={{
                        sx: { fontFamily: 'Inter', textAlign: 'left' },
                        startAdornment: <Typography sx={{ mr: 1, fontWeight: 'bold', color: 'text.secondary' }}>ر.س</Typography>,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentExpense.hasVAT}
                          onChange={(e) => setCurrentExpense({ ...currentExpense, hasVAT: e.target.checked })}
                          color="primary"
                        />
                      }
                      label="خاضع لضريبة القيمة المضافة (15%)"
                      sx={{ '& .MuiFormControlLabel-label': { fontFamily: 'Tajawal', fontWeight: 600 } }}
                    />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        مبلغ الضريبة المحسوب
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontFamily: 'Inter', fontWeight: 'bold', color: 'primary.main' }}>
                        {(currentExpense.amount * 0.15).toFixed(2)} ر.س
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Receipt Upload */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    إرفاق إيصال الدفع / الفاتورة الضريبية <span style={{ color: '#ba1a1a' }}>*</span>
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleCameraCapture}
                        sx={{ 
                          height: 56,
                          border: 2,
                          borderColor: 'primary.main',
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1
                        }}
                        startIcon={
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <PhotoCamera />
                          </Box>
                        }
                      >
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'block' }}>
                            التقاط عبر الكاميرا
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                            مسح فوري للفاتورة
                          </Typography>
                        </Box>
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleGalleryUpload}
                        sx={{ 
                          height: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1
                        }}
                        startIcon={
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%',
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <AddPhotoAlternate />
                          </Box>
                        }
                      >
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'block' }}>
                            اختيار من المعرض
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            ملف PDF أو صورة PNG/JPG
                          </Typography>
                        </Box>
                      </Button>
                    </Grid>
                  </Grid>
                  {errors.receiptUrl && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {errors.receiptUrl}
                    </Typography>
                  )}
                </Box>

                {/* Confirm Button */}
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleAddExpense}
                  sx={{ 
                    height: 48,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}
                  startIcon={<Check />}
                >
                  تأكيد وحفظ البند الحالي
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Calculate color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                ملخص المبالغ المالية للطلب
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  المجموع قبل الضريبة ({expenseLines.length} بنود):
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Inter', fontWeight: 600 }}>
                  {subtotal.toFixed(2)} ر.س
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  ضريبة القيمة المضافة (15%):
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Inter', fontWeight: 600, color: 'primary.main' }}>
                  {vat.toFixed(2)} ر.س
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  الإجمالي النهائي المستحق:
                </Typography>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h5" sx={{ fontFamily: 'Inter', fontWeight: 'bold', color: 'primary.main' }}>
                    {total.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Tajawal', fontWeight: 600, color: 'primary.main', mr: 0.5 }}>
                    ر.س
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.submit}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mt: 3,
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 10
        }}>
          <Button
            variant="outlined"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            sx={{ 
              flex: 1,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
            startIcon={<Drafts />}
          >
            حفظ كمسودة
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || loading}
            sx={{ 
              flex: 2,
              height: 48,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
          >
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال للاعتماد والموافقة'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default CreateRequest

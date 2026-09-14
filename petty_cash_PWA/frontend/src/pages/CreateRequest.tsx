import React, { useState, useEffect, useRef } from 'react'
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
  InputAdornment,
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
  Mic,
  LocationOn,
  AutoAwesome,
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
  invoiceDate?: string
  vendorVat?: string
  vendorCr?: string
  ocrDocumentId?: number
  receiptUrl?: string
  receiptFile?: string
  receiptFilename?: string
  latitude?: number
  longitude?: number
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
  const [isScanning, setIsScanning] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const selectedCategory = categories.find((c) => c.odooCategoryId === currentExpense.categoryId) as any

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

    const geo = await captureLocation()

    const newExpense: ExpenseLine = {
      ...currentExpense,
      vendorId,
      vendorName,
      ...geo,
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

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const draftLoadedRef = useRef(false)

  // Persist the in-progress form so an Android tab reload (camera eviction)
  // doesn't wipe the draft
  const DRAFT_KEY = 'agcash_request_draft'
  const persistDraft = () => {
    try {
      // Strip heavy base64 receipt data — a reload loses the File anyway
      const strip = (l: ExpenseLine) => ({ ...l, receiptUrl: undefined, receiptFile: undefined })
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        requestDescription,
        expenseLines: expenseLines.map(strip),
        currentExpense: strip(currentExpense),
        showExpenseForm: true,
      }))
    } catch {}
  }
  const clearDraft = () => sessionStorage.removeItem(DRAFT_KEY)

  useEffect(() => {
    if (draftLoadedRef.current) return
    draftLoadedRef.current = true
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.requestDescription) setRequestDescription(d.requestDescription)
        if (d.expenseLines?.length) setExpenseLines(d.expenseLines)
        if (d.currentExpense) setCurrentExpense(d.currentExpense)
        if (d.showExpenseForm) setShowExpenseForm(true)
      }
    } catch {}
  }, [])

  const handleCameraCapture = () => {
    persistDraft()
    cameraInputRef.current?.click()
  }

  const handleGalleryUpload = () => {
    persistDraft()
    galleryInputRef.current?.click()
  }

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receiptUrl: 'حجم الملف يتجاوز 15 ميجابايت' }))
      return
    }
    const processImage = (dataUrl: string, fileName: string) => {
      const base64 = dataUrl.split(',')[1]
      setCurrentExpense((prev) => ({
        ...prev,
        receiptUrl: dataUrl,
        receiptFile: base64,
        receiptFilename: fileName,
      }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next.receiptUrl
        return next
      })
      // Auto-scan the receipt with Odoo OCR to prefill vendor/amount/category
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setIsScanning(true)
        expensesAPI.scanReceipt({ file: base64, fileName })
          .then((res) => {
            const d = res.data
            if (!d) return
            setCurrentExpense((prev) => ({
              ...prev,
              vendorId: prev.vendorId ?? d.vendorId,
              vendorName: prev.vendorName || d.vendorName || '',
              amount: prev.amount > 0 ? prev.amount : d.amount || prev.amount,
              categoryId: prev.categoryId ?? d.categoryId,
              invoiceDate: prev.invoiceDate || d.invoiceDate || undefined,
              vendorVat: prev.vendorVat || d.vendorVat || undefined,
              vendorCr: prev.vendorCr || d.vendorCr || undefined,
              ocrDocumentId: d.documentId,
              hasVAT: d.taxAmount ? true : prev.hasVAT,
            }))
          })
          .catch(() => {})
          .finally(() => setIsScanning(false))
      }
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Downscale photos to max 1600px JPEG — keeps base64 small enough for
      // upload limits and faster OCR, and reduces tab memory pressure
      if (file.type.startsWith('image/')) {
        const img = new Image()
        img.onload = () => {
          const MAX = 1600
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          processImage(canvas.toDataURL('image/jpeg', 0.8), file.name.replace(/\.\w+$/, '.jpg'))
        }
        img.onerror = () => processImage(dataUrl, file.name)
        img.src = dataUrl
      } else {
        processImage(dataUrl, file.name)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrors((prev) => ({ ...prev, description: 'الإدخال الصوتي غير مدعوم في هذا المتصفح' }))
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'ar-SA'
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      setCurrentExpense((prev) => ({
        ...prev,
        description: prev.description ? `${prev.description} ${text}` : text,
      }))
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    recognitionRef.current = rec
    rec.start()
    setIsListening(true)
  }

  const captureLocation = (): Promise<{ latitude?: number; longitude?: number }> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000, maximumAge: 60000 }
      )
    })

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
          invoiceDate: line.invoiceDate,
          vendorVat: line.vendorVat,
          vendorCr: line.vendorCr,
          withVat: line.hasVAT,
          ocrDocumentId: line.ocrDocumentId,
          receiptUrl: line.receiptUrl,
          receiptFile: line.receiptFile,
          receiptFilename: line.receiptFilename,
          ...(line.latitude
            ? { notes: `الموقع: ${line.latitude},${line.longitude}` }
            : {}),
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
        clearDraft()
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
                            {expense.receiptUrl.startsWith('data:image') ? (
                              <img src={expense.receiptUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Check fontSize="small" color="primary" />
                            )}
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
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={toggleVoiceInput}
                            color={isListening ? 'error' : 'default'}
                          >
                            <Mic fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
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
                        setCurrentExpense({
                          ...currentExpense,
                          vendorId: value.id,
                          vendorName: value.name,
                          vendorVat: currentExpense.vendorVat || value.vat || undefined,
                        })
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

                {/* Invoice details (auto-filled by OCR) */}
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      تاريخ الفاتورة
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={currentExpense.invoiceDate || ''}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, invoiceDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      الرقم الضريبي للمورد (VAT)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="3xxxxxxxxxxxxx"
                      value={currentExpense.vendorVat || ''}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, vendorVat: e.target.value })}
                      InputProps={{ sx: { fontFamily: 'Inter', textAlign: 'left' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      السجل التجاري (CR)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="10xxxxxxxx"
                      value={currentExpense.vendorCr || ''}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, vendorCr: e.target.value })}
                      InputProps={{ sx: { fontFamily: 'Inter', textAlign: 'left' } }}
                    />
                  </Grid>
                </Grid>

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
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleReceiptFile}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleReceiptFile}
                  />
                  {isScanning && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={18} />
                      <Typography variant="caption" color="primary">
                        <AutoAwesome sx={{ fontSize: 14, verticalAlign: 'middle' }} /> جاري استخراج بيانات الفاتورة بالذكاء الاصطناعي...
                      </Typography>
                    </Box>
                  )}
                  {currentExpense.receiptUrl && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        component="img"
                        src={currentExpense.receiptUrl}
                        alt="receipt"
                        sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
                      />
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                        {currentExpense.receiptFilename}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setCurrentExpense((prev) => ({ ...prev, receiptUrl: undefined, receiptFile: undefined, receiptFilename: undefined }))}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
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

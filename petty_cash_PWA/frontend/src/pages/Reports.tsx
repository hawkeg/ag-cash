import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Divider,
  Avatar,
  useTheme,
  useMediaQuery,
  Menu,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Download,
  FilterList,
  CalendarToday,
  TrendingUp,
  AccountBalanceWallet,
  ReceiptLong,
  Speed,
  LocalGasStation,
  Coffee,
  Build,
  HistoryEdu,
  PictureAsPdf,
  TableChart,
  Share,
  Notifications,
  MoreVert,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { Request, Expense, Category, Vendor } from '@shared/types';
import api from '../services/api';

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
}

interface MonthlySpending {
  week: string;
  amount: number;
  isPeak: boolean;
}

interface TopVendor {
  name: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

const Reports: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isRtl = theme.direction === 'rtl';

  // State for filters
  const [dateRange, setDateRange] = useState('this_month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Real data from /api/reports/summary
  const [summary, setSummary] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const fetchSummary = async (range = dateRange, cat = categoryFilter) => {
    try {
      setLoading(true);
      setLoadError(null);
      const now = new Date();
      let from: string | undefined;
      let to: string | undefined;
      if (range === 'this_week') {
        from = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      } else if (range === 'this_month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      } else if (range === 'last_month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
        to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      }
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (cat && cat !== 'all') params.category = cat;
      const res = await api.get('/api/reports/summary', { params });
      setSummary(res.data.data);
      if (!cat || cat === 'all') {
        setAvailableCategories((res.data.data?.categorySpending ?? []).map((c: any) => c.category));
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.error?.message || 'تعذر تحميل التقارير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [dateRange, categoryFilter]);

  const totalExpenses = summary?.totalExpenses ?? 0;
  const vatAmount = summary?.vatAmount ?? 0;
  const dailyBurnRate = summary?.dailyBurnRate ?? 0;
  const remainingBalance = summary?.remainingBalance ?? 0;
  const consumptionRate = summary?.consumptionRate ?? 0;

  const catIcon = (name: string) => {
    if (/محروق|وقود|نقل/.test(name)) return <LocalGasStation />;
    if (/ضياف|استقبال/.test(name)) return <Coffee />;
    if (/صيان|قطع/.test(name)) return <Build />;
    return <HistoryEdu />;
  };
  const palette = ['#235b54', '#316760', '#9ad1c8', '#545f73', '#6b8f89'];

  const categorySpending: CategorySpending[] = (summary?.categorySpending ?? []).map(
    (c: any, i: number) => ({
      category: c.category,
      amount: c.amount,
      percentage: totalExpenses ? Math.round((c.amount / totalExpenses) * 100) : 0,
      icon: catIcon(c.category),
      color: palette[i % palette.length],
    })
  );

  const monthLabel = (m: string) =>
    new Date(m + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
  const maxMonthly = Math.max(0, ...(summary?.monthlySpending ?? []).map((m: any) => m.amount));
  const monthlySpending: MonthlySpending[] = (summary?.monthlySpending ?? []).map((m: any) => ({
    week: monthLabel(m.month),
    amount: m.amount,
    isPeak: m.amount === maxMonthly && maxMonthly > 0,
  }));

  const topVendors: TopVendor[] = (summary?.topVendors ?? []).map((v: any) => ({
    name: v.vendor,
    invoiceNumber: '',
    amount: v.amount,
    date: '',
    category: '',
    status: '',
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportCSV = () => {
    setExporting(true);
    handleExportMenuClose();
    try {
      const rows = [
        ['الفئة', 'المبلغ'],
        ...categorySpending.map(c => [c.category, String(c.amount)]),
        [],
        ['الشهر', 'المبلغ'],
        ...monthlySpending.map(m => [m.week, String(m.amount)]),
        [],
        ['المورد', 'المبلغ'],
        ...topVendors.map(v => [v.name, String(v.amount)]),
        [],
        ['إجمالي المصروفات', String(totalExpenses)],
        ['مبلغ الضريبة', String(vatAmount)],
        ['معدل الصرف اليومي', String(dailyBurnRate)],
        ['الرصيد المتبقي', String(remainingBalance)],
      ];
      const csv = '﻿' + rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ag-cash-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    handleExportMenuClose();
    window.print();
  };

  const handleRefresh = () => {
    fetchSummary();
  };

  const getMaxSpendingAmount = () => {
    return Math.max(...monthlySpending.map(s => s.amount));
  };

  return (
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError(null)}>
          {loadError}
        </Alert>
      )}
      {/* Main Content */}
      <Box sx={{ px: { xs: 0, sm: 2 }, py: 3 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              التقارير والإحصائيات المالية
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              تحليل دورة تدفق العهدة النقدية والمطابقات الضريبية للمشاريع
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              icon={<CheckCircle />}
              label="دورة التدقيق المالي: مفتوحة ومطابقة"
              color="success"
              variant="outlined"
              size="small"
            />
            <Button
              size="small"
              startIcon={<Download />}
              onClick={handleExportMenuOpen}
            >
              تصدير
            </Button>
            <IconButton size="small" onClick={handleFilterMenuOpen}>
              <FilterList />
            </IconButton>
          </Box>
        </Box>

        {/* Date Range and Report Type Selector */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ bgcolor: '#235b54', flex: 1 }}
                >
                  تقرير شهري تفصيلي
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1 }}
                >
                  حسب الفئات
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1 }}
                >
                  مقارنة العهد
                </Button>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                <IconButton size="small">
                  {isRtl ? '→' : '←'}
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                  </Typography>
                  <Chip label="الشهر الحالي" size="small" sx={{ bgcolor: '#9ad1c8', color: '#01433d' }} />
                </Box>
                <IconButton size="small">
                  {isRtl ? '←' : '→'}
                </IconButton>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* KPI Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Primary Hero Metric */}
          <Grid item xs={12} sm={6}>
            <Paper
              sx={{
                p: 3,
                bgcolor: '#235b54',
                color: 'white',
                borderRadius: 2,
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, opacity: 0.9 }}>
                    <AccountBalanceWallet fontSize="small" />
                    <Typography variant="body2">إجمالي المصروفات المنفذة</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    <span className="number">{formatCurrency(totalExpenses)}</span>
                  </Typography>
                </Box>
                <Chip
                  icon={<TrendingUp />}
                  label="↓ 12% وفر مالي"
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}
                />
              </Box>
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  حد السقف المعتمد: 15,000.00 ر.س
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  نسبة الاستهلاك {consumptionRate}%
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* VAT Recovery */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ضريبة القيمة المضافة (VAT 15%)
                  </Typography>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 28, height: 28 }}>
                    <ReceiptLong sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  <span className="number">{formatCurrency(vatAmount)}</span> ر.س
                </Typography>
              </Box>
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />
                <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 500 }}>
                  {summary?.lineCount ?? 0} بند مصروف
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Daily Burn Rate */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    معدل الصرف اليومي
                  </Typography>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 28, height: 28 }}>
                    <Speed sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  <span className="number">{formatCurrency(dailyBurnRate)}</span> ر.س/يوم
                </Typography>
              </Box>
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  الرصيد المتبقي:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#235b54' }}>
                  <span className="number">{formatCurrency(remainingBalance)}</span> ر.س
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Weekly Spending Chart */}
          <Grid item xs={12} lg={7}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      منحنى المصروفات الأسبوعي
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      تحليل كثافة الإنفاق خلال أسابيع شهر مايو
                    </Typography>
                  </Box>
                  <Chip
                    label="الذروة: الأسبوع الثاني"
                    size="small"
                    sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', color: '#235b54' }}
                  />
                </Box>

                {/* Custom Bar Chart */}
                <Box sx={{ height: 176, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, px: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                  {monthlySpending.map((week) => (
                    <Box
                      key={week.week}
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                        height: '100%',
                        justifyContent: 'flex-end',
                        cursor: 'pointer',
                      }}
                    >
                      {week.isPeak && (
                        <Chip
                          label="الأعلى"
                          size="small"
                          sx={{ 
                            bgcolor: '#9ad1c8', 
                            color: '#01433d',
                            fontSize: 10,
                            height: 20,
                            mb: -0.5,
                          }}
                        />
                      )}
                      <Typography variant="caption" sx={{ fontWeight: week.isPeak ? 'bold' : 'normal', color: week.isPeak ? '#235b54' : 'text.secondary' }}>
                        <span className="number">{formatCurrency(week.amount)}</span>
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          maxWidth: 42,
                          bgcolor: week.isPeak ? '#235b54' : 'rgba(84, 95, 115, 0.3)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.3s',
                          height: `${(week.amount / getMaxSpendingAmount()) * 100}%`,
                          position: 'relative',
                          ...(week.isPeak && {
                            boxShadow: '0 2px 8px rgba(35, 91, 84, 0.3)',
                          }),
                          '&:hover': {
                            bgcolor: '#235b54',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: week.isPeak ? 'bold' : 'normal', color: week.isPeak ? '#235b54' : 'text.secondary' }}>
                        {week.week}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Insight Badge */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(84, 95, 115, 0.08)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info sx={{ fontSize: 16, color: '#235b54' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      اليوم الأكثر صرفاً: <strong>الثلاثاء 13 مايو</strong> (مشتريات قطع صيانة طارئة)
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#235b54' }}>
                    <span className="number">1,450</span> ر.س
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Breakdown */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    التصنيف حسب بنود الصرف
                  </Typography>
                  <Chip label="4 بنود نشطة" size="small" color="primary" variant="outlined" />
                </Box>

                {/* Progress Stack */}
                <Box sx={{ width: '100%', height: 12, borderRadius: 6, bgcolor: 'rgba(84, 95, 115, 0.1)', overflow: 'hidden', display: 'flex', mb: 4 }}>
                  {categorySpending.map((cat) => (
                    <Box
                      key={cat.category}
                      sx={{
                        width: `${cat.percentage}%`,
                        bgcolor: cat.color,
                        height: '100%',
                      }}
                      title={`${cat.category}: ${cat.percentage}%`}
                    />
                  ))}
                </Box>

                {/* Category List */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {categorySpending.map((cat) => (
                    <Box
                      key={cat.category}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 1,
                        transition: 'bgcolor 0.2s',
                        '&:hover': { bgcolor: 'rgba(84, 95, 115, 0.05)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                        <Avatar sx={{ bgcolor: `${cat.color}40`, width: 32, height: 32 }}>
                          {cat.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {cat.category}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {cat.percentage === 42 && 'أسطول صيانة المنطقة الشرقية'}
                            {cat.percentage === 25 && 'اجتماعات استشاريي المشاريع'}
                            {cat.percentage === 20 && 'محطة ضخ رقم 4'}
                            {cat.percentage === 13 && 'مكتب موقع رأس تنورة'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          <span className="number">{formatCurrency(cat.amount)}</span> ر.س
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: cat.color }}>
                          {cat.percentage}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
                  <Button size="small" sx={{ color: '#235b54' }}>
                    عرض السجل المحاسبي التفصيلي
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top Vendors Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  الفواتير الأعلى قيمة خلال الدورة
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  الفواتير المعتمدة التي تتجاوز قيمتها 500 ر.س
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<Download />}
                variant="outlined"
              >
                تنزيل الإيصالات الضريبية (ZIP)
              </Button>
            </Box>

            <Grid container spacing={2}>
              {topVendors.map((vendor, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: '#235b54' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                          {index === 0 && <Build />}
                          {index === 1 && <LocalGasStation />}
                          {index === 2 && <Coffee />}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {vendor.name}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ my: 2, py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        القيمة الإجمالية شاملة الضريبة:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#235b54' }}>
                        <span className="number">{formatCurrency(vendor.amount)}</span> ر.س
                      </Typography>
                    </Box>


                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Export Action Section */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 44, height: 44 }}>
                  <CheckCircle sx={{ fontSize: 24, color: '#235b54' }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    إقفال العهدة وتقديم الكشف المحاسبي
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    توليد تقرير رسمي معتمد بباركود هيئة الزكاة والضريبة والجمارك (ZATCA)
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPDF}
                  disabled={exporting}
                  sx={{
                    bgcolor: '#235b54',
                    '&:hover': { bgcolor: '#01433d' },
                    flex: { xs: 1, sm: 'auto' },
                  }}
                >
                  {exporting ? <CircularProgress size={20} color="inherit" /> : 'تصدير التقرير المالي المعتمد (PDF)'}
                </Button>
                <IconButton onClick={() => console.log('Share')}>
                  <Share />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterMenuClose}
      >
        <MenuItem onClick={() => { setDateRange('this_week'); handleFilterMenuClose(); }}>
          هذا الأسبوع
        </MenuItem>
        <MenuItem onClick={() => { setDateRange('this_month'); handleFilterMenuClose(); }}>
          هذا الشهر
        </MenuItem>
        <MenuItem onClick={() => { setDateRange('last_month'); handleFilterMenuClose(); }}>
          الشهر الماضي
        </MenuItem>
        <MenuItem onClick={() => { setDateRange('custom'); handleFilterMenuClose(); }}>
          نطاق مخصص
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setCategoryFilter('all'); handleFilterMenuClose(); }}>
          جميع الفئات
        </MenuItem>
        {availableCategories.map((cat) => (
          <MenuItem key={cat} onClick={() => { setCategoryFilter(cat); handleFilterMenuClose(); }}>
            {cat}
          </MenuItem>
        ))}
      </Menu>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={handleExportCSV} disabled={exporting}>
          <TableChart sx={{ mr: 2 }} />
          تصدير CSV
        </MenuItem>
        <MenuItem onClick={handleExportPDF} disabled={exporting}>
          <PictureAsPdf sx={{ mr: 2 }} />
          تصدير PDF
        </MenuItem>
      </Menu>

      {/* Export Toast Notification */}
      {exporting && (
        <Alert
          severity="info"
          sx={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: 300,
          }}
        >
          جاري تجهيز التقرير...
        </Alert>
      )}
    </Box>
  );
};

export default Reports;

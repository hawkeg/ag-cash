import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Paper,
  Stack,
  Button,
  CircularProgress,
  Alert,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  AccountBalanceWallet,
  RequestQuote,
  PendingActions,
  TrendingUp,
  Refresh,
  MoreVert,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Request, RequestStatus } from '@shared/types';
import api from '../services/api';
import SarSymbol from '../components/SarSymbol';

interface DashboardStats {
  totalBalance: number;
  pendingRequests: number;
  totalRequestsThisMonth: number;
  totalSpentThisMonth: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    pendingRequests: 0,
    totalRequestsThisMonth: 0,
    totalSpentThisMonth: 0,
  });
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [holder, setHolder] = useState<{ employeeName?: string; department?: string; name?: string } | null>(null);
  const [replenishments, setReplenishments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [res, replRes] = await Promise.allSettled([
        api.get('/api/dashboard'),
        api.get('/api/advances/replenishments'),
      ]);
      if (replRes.status === 'fulfilled') {
        setReplenishments(replRes.value.data?.data ?? []);
      }
      if (res.status === 'rejected') throw res.reason;
      const payload = res.value.data?.data;

      setRecentRequests(payload?.recentRequests ?? []);
      setHolder(payload?.holder ?? null);
      setStats({
        totalBalance: payload?.stats?.totalBalance ?? 0,
        pendingRequests: payload?.stats?.pendingRequests ?? 0,
        totalRequestsThisMonth: payload?.stats?.totalRequestsThisMonth ?? 0,
        totalSpentThisMonth: payload?.stats?.totalSpentThisMonth ?? 0,
      });
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.response?.data?.error?.message || 'تعذر تحميل بيانات لوحة التحكم. تحقق من اتصال الخادم.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return 'success';
      case RequestStatus.SUBMITTED:
        return 'warning';
      case RequestStatus.REJECTED:
        return 'error';
      case RequestStatus.DRAFT:
        return 'default';
      default:
        return 'info';
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    const labels: Record<RequestStatus, string> = {
      [RequestStatus.DRAFT]: 'مسودة',
      [RequestStatus.SUBMITTED]: 'مقدمة',
      [RequestStatus.APPROVED]: 'موافق عليها',
      [RequestStatus.REJECTED]: 'مرفوضة',
      [RequestStatus.PAID]: 'مدفوعة',
      [RequestStatus.CANCELLED]: 'ملغاة',
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ pb: 10 }}>
      {/* Page Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          لوحة التحكم
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={handleRefresh} disabled={loading || refreshing}>
            {refreshing ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
      <>
      {/* Balance Card */}
      <Card sx={{ mb: 3, bgcolor: '#235b54', color: 'white' }}>
        <CardContent>
          {holder && (
            <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mb: 0.5 }}>
              {holder.employeeName || holder.name}{holder.department ? ` — ${holder.department}` : ''}
            </Typography>
          )}
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            الرصيد المتاح
          </Typography>
          <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 2 }}>
            <span className="number">{formatCurrency(stats.totalBalance)}</span> <SarSymbol />
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المصروفات هذا الشهر
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                <span className="number">{formatCurrency(stats.totalSpentThisMonth)}</span> <SarSymbol />
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                طلبات معلقة
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                <span className="number">{stats.pendingRequests}</span>
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <RequestQuote sx={{ fontSize: 32, color: '#235b54', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <span className="number">{stats.totalRequestsThisMonth}</span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              إجمالي الطلبات
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <PendingActions sx={{ fontSize: 32, color: '#ffa000', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <span className="number">{stats.pendingRequests}</span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              قيد المراجعة
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <TrendingUp sx={{ fontSize: 32, color: '#006a4e', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <span className="number">{formatCurrency(stats.totalSpentThisMonth)}</span> <SarSymbol />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              إجمالي المصروفات
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <AccountBalanceWallet sx={{ fontSize: 32, color: '#235b54', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <span className="number">{formatCurrency(stats.totalBalance)}</span> <SarSymbol />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              الرصيد المتاح
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Requests */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              الطلبات الأخيرة
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/requests')}
              sx={{ color: '#235b54' }}
            >
              عرض الكل
            </Button>
          </Box>
          <List>
            {recentRequests.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  لا توجد طلبات حديثة
                </Typography>
              </Box>
            )}
            {recentRequests.map((request) => (
              <React.Fragment key={request.id}>
                <ListItem
                  button
                  onClick={() => navigate(`/requests/${request.id}`)}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getStatusColor(request.status) }}>
                      <RequestQuote />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={request.description}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          <span className="number">{formatCurrency(request.amount)}</span> <SarSymbol />
                        </Typography>
                        <Chip
                          label={getStatusLabel(request.status)}
                          size="small"
                          color={getStatusColor(request.status) as any}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end">
                      <MoreVert />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {recentRequests.indexOf(request) < recentRequests.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Replenishments (top-ups) */}
      {replenishments.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              عمليات تغذية العهدة
            </Typography>
            <List>
              {replenishments.slice(0, 5).map((r) => (
                <ListItem key={r.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#e6f4f1' }}>
                      <AccountBalanceWallet sx={{ color: '#235b54' }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={r.name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(r.date).toLocaleDateString('ar-SA')}
                        </Typography>
                        {r.journal && (
                          <Typography variant="caption" color="text.secondary">
                            • {r.journal}
                          </Typography>
                        )}
                        <Chip
                          label={r.state === 'posted' ? 'مرحّل' : 'مسودة'}
                          size="small"
                          color={r.state === 'posted' ? 'success' : 'default'}
                        />
                      </Box>
                    }
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#006a4e' }}>
                    <span className="number">+{formatCurrency(r.amount)}</span> <SarSymbol />
                  </Typography>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="إجراءات جديدة"
        icon={<SpeedDialIcon />}
        direction="up"
        sx={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          right: 16,
          zIndex: 1000,
          '& .MuiFab-primary': { bgcolor: '#235b54', '&:hover': { bgcolor: '#01433d' } },
        }}
      >
        <SpeedDialAction
          icon={<Add />}
          tooltipTitle="طلب صرف"
          tooltipOpen
          onClick={() => navigate('/create-request')}
        />
        <SpeedDialAction
          icon={<AccountBalanceWallet />}
          tooltipTitle="عهدة مخصصة"
          tooltipOpen
          onClick={() => navigate('/advance-request')}
        />
      </SpeedDial>
    </Box>
  );
};

export default Dashboard;

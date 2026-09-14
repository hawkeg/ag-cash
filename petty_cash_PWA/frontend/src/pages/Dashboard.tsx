import React, { useState } from 'react';
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

interface DashboardStats {
  totalBalance: number;
  pendingRequests: number;
  totalRequestsThisMonth: number;
  totalSpentThisMonth: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats] = useState<DashboardStats>({
    totalBalance: 5000,
    pendingRequests: 3,
    totalRequestsThisMonth: 12,
    totalSpentThisMonth: 3250,
  });
  const [recentRequests] = useState<Request[]>([
    {
      id: '1',
      userId: 'user1',
      type: 'EXPENSE' as any,
      amount: 500,
      description: 'Office supplies',
      status: RequestStatus.APPROVED,
      createdAt: new Date('2026-09-13'),
      updatedAt: new Date('2026-09-13'),
    },
    {
      id: '2',
      userId: 'user1',
      type: 'EXPENSE' as any,
      amount: 750,
      description: 'Client meeting expenses',
      status: RequestStatus.SUBMITTED,
      createdAt: new Date('2026-09-12'),
      updatedAt: new Date('2026-09-12'),
    },
    {
      id: '3',
      userId: 'user1',
      type: 'ADVANCE' as any,
      amount: 2000,
      description: 'Travel advance',
      status: RequestStatus.DRAFT,
      createdAt: new Date('2026-09-11'),
      updatedAt: new Date('2026-09-11'),
    },
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
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
    <Box>
      {/* Page Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          لوحة التحكم
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton>
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      {/* Balance Card */}
      <Card sx={{ mb: 3, bgcolor: '#235b54', color: 'white' }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            الرصيد المتاح
          </Typography>
          <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 2 }}>
            <span className="number">{formatCurrency(stats.totalBalance)}</span>
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المصروفات هذا الشهر
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                <span className="number">{formatCurrency(stats.totalSpentThisMonth)}</span>
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
              <span className="number">{formatCurrency(stats.totalSpentThisMonth)}</span>
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
              <span className="number">{formatCurrency(stats.totalBalance)}</span>
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
                          <span className="number">{formatCurrency(request.amount)}</span>
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

      {/* Floating Action Buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/create-request')}
          sx={{
            bgcolor: '#235b54',
            '&:hover': { bgcolor: '#01433d' },
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          طلب صرف
        </Button>
        <Button
          variant="contained"
          startIcon={<AccountBalanceWallet />}
          onClick={() => navigate('/advance-request')}
          sx={{
            bgcolor: '#006a4e',
            '&:hover': { bgcolor: '#004d38' },
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          سلفة
        </Button>
      </Box>
    </Box>
  );
};

export default Dashboard;

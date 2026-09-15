import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  Chip,
} from '@mui/material';
import { AccountBalanceWallet, Search, Person, LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

interface Holder {
  id: number;
  name: string;
  employeeId: number | null;
  employeeName: string;
  department: string;
  state: string;
  limitAmount: number;
  remainingAmount: number;
  hasPin?: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [holders, setHolders] = useState<Holder[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Holder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [setupMode, setSetupMode] = useState(false);

  const isSetup = selected ? (setupMode || selected.hasPin === false) : false;
  const needsPin = selected ? !isSetup : false;

  const selectHolder = (h: Holder) => {
    setSelected(h);
    setPin('');
    setPinConfirm('');
    setSetupMode(false);
    setError(null);
  };

  useEffect(() => {
    const fetchHolders = async () => {
      try {
        setLoading(true);
        const res = await authAPI.getHolders();
        setHolders(res.data ?? []);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'تعذر تحميل قائمة الموظفين. تحقق من اتصال Odoo.');
      } finally {
        setLoading(false);
      }
    };
    fetchHolders();
  }, []);

  const filtered = holders.filter(
    (h) =>
      !search ||
      h.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      h.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogin = async () => {
    if (!selected) return;
    if (needsPin && !/^\d{4,6}$/.test(pin)) {
      setError('أدخل رمز PIN (4-6 أرقام)');
      return;
    }
    if (isSetup) {
      if (!/^\d{4,6}$/.test(pin)) {
        setError('أنشئ رمز PIN من 4-6 أرقام');
        return;
      }
      if (pin !== pinConfirm) {
        setError('رمزا PIN غير متطابقين');
        return;
      }
    }
    try {
      setSubmitting(true);
      setError(null);
      const res = isSetup
        ? await authAPI.setupPin(selected.id, pin)
        : await authAPI.login(selected.id, pin);
      const { token, user } = res.data!;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userName', user.name || '');
      localStorage.setItem('holderId', String(selected.id));
      navigate('/', { replace: true });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'PIN_SETUP_REQUIRED') {
        setSetupMode(true);
        setError(null);
      } else {
        setError(err?.response?.data?.error?.message || 'فشل تسجيل الدخول. حاول مرة أخرى.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(n);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f8f9ff',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, boxShadow: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Logo / Title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: '#235b54', width: 56, height: 56, mx: 'auto', mb: 1.5 }}>
              <AccountBalanceWallet sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#235b54' }}>
              AG-Cash
            </Typography>
            <Typography variant="body2" color="text.secondary">
              اختر اسمك لتسجيل الدخول
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="ابحث بالاسم أو القسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {/* Holders list */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List sx={{ maxHeight: 320, overflow: 'auto', mb: 2 }}>
              {filtered.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  لا يوجد موظفون مطابقون
                </Typography>
              )}
              {filtered.map((h) => (
                <ListItem
                  key={h.id}
                  button
                  selected={selected?.id === h.id}
                  onClick={() => selectHolder(h)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    border: '1px solid',
                    borderColor: selected?.id === h.id ? '#235b54' : 'divider',
                    bgcolor: selected?.id === h.id ? 'rgba(35,91,84,0.06)' : 'transparent',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: selected?.id === h.id ? '#235b54' : '#9e9e9e' }}>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={h.employeeName}
                    secondary={h.department || h.name}
                  />
                  <Chip
                    label={formatAmount(h.remainingAmount)}
                    size="small"
                    sx={{ bgcolor: '#eef4f3', color: '#235b54', fontWeight: 600 }}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {/* PIN entry / first-time PIN setup */}
          {selected && needsPin && (
            <TextField
              fullWidth
              type="password"
              inputMode="numeric"
              size="small"
              label="رمز PIN"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
              }}
            />
          )}
          {selected && isSetup && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                أول تسجيل دخول — أنشئ رمز PIN خاص بك (4-6 أرقام)
              </Alert>
              <TextField
                fullWidth
                type="password"
                inputMode="numeric"
                size="small"
                label="رمز PIN الجديد"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                sx={{ mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                type="password"
                inputMode="numeric"
                size="small"
                label="تأكيد رمز PIN"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}

          {/* Login button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={!selected || submitting || (needsPin && pin.length < 4)}
            onClick={handleLogin}
            sx={{
              bgcolor: '#235b54',
              '&:hover': { bgcolor: '#01433d' },
              py: 1.4,
              fontWeight: 700,
            }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : isSetup ? 'إنشاء PIN والدخول' : 'تسجيل الدخول'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;

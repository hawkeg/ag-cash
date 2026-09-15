import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  Avatar,
} from '@mui/material';
import { AccountBalanceWallet, BadgeOutlined, LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSession = (data: any) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('userName', data.user.name || '');
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('holderId', String(data.user.holder.id));
  };

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setError('أدخل رقم الموظف أو رمز العهدة');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError(setupMode ? 'أنشئ رمز PIN من 4-6 أرقام' : 'أدخل رمز PIN (4-6 أرقام)');
      return;
    }
    if (setupMode && pin !== pinConfirm) {
      setError('رمزا PIN غير متطابقين');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const res = setupMode
        ? await authAPI.setupPin(identifier.trim(), pin)
        : await authAPI.login(identifier.trim(), pin);
      saveSession(res.data!);
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
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: '#235b54', width: 56, height: 56, mx: 'auto', mb: 1.5 }}>
              <AccountBalanceWallet sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#235b54' }}>
              AG-Cash
            </Typography>
            <Typography variant="body2" color="text.secondary">
              سجّل الدخول برقم الموظف ورمز PIN
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {setupMode && (
            <Alert severity="info" sx={{ mb: 2 }}>
              أول تسجيل دخول — أنشئ رمز PIN خاص بك (4-6 أرقام)
            </Alert>
          )}

          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <TextField
              fullWidth
              size="small"
              label="رقم الموظف / رمز العهدة"
              placeholder="1000480820 أو PCH/26/0002"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeOutlined />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type="password"
              inputMode="numeric"
              size="small"
              label={setupMode ? 'رمز PIN الجديد' : 'رمز PIN'}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              sx={{ mb: setupMode ? 2 : 3 }}
              autoComplete={setupMode ? 'new-password' : 'current-password'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
              }}
            />

            {setupMode && (
              <TextField
                fullWidth
                type="password"
                inputMode="numeric"
                size="small"
                label="تأكيد رمز PIN"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                sx={{ mb: 3 }}
                autoComplete="new-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || !identifier.trim() || pin.length < 4}
              sx={{
                bgcolor: '#235b54',
                '&:hover': { bgcolor: '#01433d' },
                py: 1.4,
                fontWeight: 700,
              }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : setupMode ? 'إنشاء PIN والدخول' : 'تسجيل الدخول'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;

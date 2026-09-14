import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Person,
  Badge as BadgeIcon,
  Email,
  Lock,
  Notifications,
  Language,
  DarkMode,
  Info,
  Logout,
  ChevronLeft,
  ChevronRight,
  VerifiedUser,
  Help,
  Description,
  PrivacyTip,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '@shared/types';
import { authAPI } from '../services/api';

interface UserProfile extends AuthUser {
  name?: string;
  employeeId?: string;
  department?: string;
  role?: string;
  avatarUrl?: string;
}

const APP_VERSION = '1.0.0';

const Profile: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isRtl = theme.direction === 'rtl';
  const navigate = useNavigate();

  // Mock user data - in production, this would come from authAPI.getCurrentUser()
  const [user] = useState<UserProfile>({
    id: '1',
    email: 'a.almansour@agoc.com.sa',
    name: 'عبدالله المنصور',
    employeeId: 'EMP-1042',
    department: 'إدارة الصيانة الميدانية',
    role: 'أمين عهدة',
  });

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [requestUpdates, setRequestUpdates] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [darkMode, setDarkMode] = useState(false);

  // Dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleLanguageChange = (
    _event: React.MouseEvent<HTMLElement>,
    newLanguage: 'ar' | 'en' | null
  ) => {
    if (newLanguage !== null) {
      setLanguage(newLanguage);
      // TODO: Wire up i18n and document.dir switching
      showSnackbar(newLanguage === 'ar' ? 'تم التبديل إلى اللغة العربية' : 'Switched to English');
    }
  };

  const handleThemeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: boolean | null
  ) => {
    if (newMode !== null) {
      setDarkMode(newMode);
      // TODO: Implement dark/light theme switching
      showSnackbar('الوضع الداكن قيد التطوير - سيتوفر قريباً');
    }
  };

  const handlePasswordDialogOpen = () => {
    setPasswordDialogOpen(true);
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      showSnackbar('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (newPassword.length < 8) {
      showSnackbar('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    // TODO: Call password change API
    console.log('Password change requested');
    handlePasswordDialogClose();
    showSnackbar('تم تغيير كلمة المرور بنجاح');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);
  };

  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      <Box sx={{ px: { xs: 0, sm: 2 }, py: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            الملف الشخصي والإعدادات
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            إدارة بيانات الحساب وتفضيلات التطبيق
          </Typography>
        </Box>

        {/* User Profile Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'center', sm: 'flex-start' },
                gap: 3,
                textAlign: { xs: 'center', sm: 'start' },
              }}
            >
              <Avatar
                src={user.avatarUrl}
                sx={{
                  width: 88,
                  height: 88,
                  bgcolor: '#235b54',
                  fontSize: 32,
                  fontWeight: 'bold',
                  boxShadow: theme.shadows[3],
                }}
              >
                {getInitials(user.name)}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: { xs: 'center', sm: 'flex-start' },
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {user.name}
                  </Typography>
                  <Chip
                    icon={<VerifiedUser sx={{ fontSize: 16 }} />}
                    label={user.role}
                    size="small"
                    sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', color: '#235b54' }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mt: 1.5,
                    alignItems: { xs: 'center', sm: 'flex-start' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      <span className="number" dir="ltr">{user.email}</span>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      الرقم الوظيفي: <span className="number">{user.employeeId}</span>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {user.department}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                variant="outlined"
                size="small"
                sx={{ alignSelf: { xs: 'center', sm: 'flex-start' } }}
              >
                تعديل الملف
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              إعدادات الحساب
            </Typography>
            <List disablePadding>
              <ListItem
                component="div"
                onClick={handlePasswordDialogOpen}
                sx={{ borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(84, 95, 115, 0.05)' } }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                    <Lock sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="تغيير كلمة المرور"
                  secondary="آخر تغيير قبل 3 أشهر"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
                <ListItemSecondaryAction>
                  <ChevronIcon sx={{ color: 'text.secondary' }} />
                </ListItemSecondaryAction>
              </ListItem>

              <Divider sx={{ my: 1 }} />

              <ListItem sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                    <Notifications sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="الإشعارات الفورية"
                  secondary="تنبيهات داخل التطبيق"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                    <Email sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="إشعارات البريد الإلكتروني"
                  secondary="ملخصات وتنبيهات عبر البريد"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                    <VerifiedUser sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="تحديثات حالة الطلبات"
                  secondary="إشعار عند اعتماد أو رفض الطلب"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={requestUpdates}
                    onChange={(e) => setRequestUpdates(e.target.checked)}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                <Language sx={{ fontSize: 18, color: '#235b54' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  اللغة
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  اختر لغة واجهة التطبيق
                </Typography>
              </Box>
            </Box>
            <ToggleButtonGroup
              value={language}
              exclusive
              onChange={handleLanguageChange}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  py: 1.5,
                  fontWeight: 500,
                  '&.Mui-selected': {
                    bgcolor: '#235b54',
                    color: 'white',
                    '&:hover': { bgcolor: '#01433d' },
                  },
                },
              }}
            >
              <ToggleButton value="ar">العربية</ToggleButton>
              <ToggleButton value="en">English</ToggleButton>
            </ToggleButtonGroup>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                <DarkMode sx={{ fontSize: 18, color: '#235b54' }} />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  المظهر
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  التبديل بين الوضع الفاتح والداكن
                </Typography>
              </Box>
              <Chip label="قريباً" size="small" sx={{ bgcolor: '#9ad1c8', color: '#01433d' }} />
            </Box>
            <ToggleButtonGroup
              value={darkMode}
              exclusive
              onChange={handleThemeChange}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  py: 1.5,
                  fontWeight: 500,
                  '&.Mui-selected': {
                    bgcolor: '#235b54',
                    color: 'white',
                    '&:hover': { bgcolor: '#01433d' },
                  },
                },
              }}
            >
              <ToggleButton value={false}>فاتح</ToggleButton>
              <ToggleButton value={true}>داكن</ToggleButton>
            </ToggleButtonGroup>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              حول التطبيق
            </Typography>
            <List disablePadding>
              <ListItem sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                    <Info sx={{ fontSize: 18, color: '#235b54' }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="إصدار التطبيق"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
                <ListItemSecondaryAction>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    <span className="number">v{APP_VERSION}</span>
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>

              <Divider sx={{ my: 1 }} />

              {[
                { icon: <Help sx={{ fontSize: 18, color: '#235b54' }} />, label: 'المساعدة والدعم' },
                { icon: <Description sx={{ fontSize: 18, color: '#235b54' }} />, label: 'الشروط والأحكام' },
                { icon: <PrivacyTip sx={{ fontSize: 18, color: '#235b54' }} />, label: 'سياسة الخصوصية' },
              ].map((item) => (
                <ListItem
                  key={item.label}
                  component="div"
                  onClick={() => showSnackbar(`${item.label} - سيتوفر قريباً`)}
                  sx={{ borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(84, 95, 115, 0.05)' } }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ bgcolor: 'rgba(35, 91, 84, 0.1)', width: 32, height: 32 }}>
                      {item.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                  <ListItemSecondaryAction>
                    <ChevronIcon sx={{ color: 'text.secondary' }} />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Typography
              variant="caption"
              sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 2 }}
            >
              AG-Cash - الخليج العربي للصيانة والتشغيل © 2025
            </Typography>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outlined"
          color="error"
          fullWidth
          size="large"
          startIcon={<Logout />}
          onClick={handleLogout}
          sx={{ py: 1.5, fontWeight: 'bold' }}
        >
          تسجيل الخروج
        </Button>
      </Box>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handlePasswordDialogClose}
        fullWidth
        maxWidth="xs"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>تغيير كلمة المرور</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="كلمة المرور الحالية"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <TextField
              label="كلمة المرور الجديدة"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="8 أحرف على الأقل"
            />
            <TextField
              label="تأكيد كلمة المرور الجديدة"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword !== '' && newPassword !== confirmPassword}
              helperText={
                confirmPassword !== '' && newPassword !== confirmPassword
                  ? 'كلمة المرور غير متطابقة'
                  : ''
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handlePasswordDialogClose}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
            sx={{ bgcolor: '#235b54', '&:hover': { bgcolor: '#01433d' } }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="info"
          sx={{ bgcolor: '#235b54', color: 'white', '& .MuiAlert-icon': { color: 'white' } }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../services/api'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  Language,
} from '@mui/icons-material'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = false }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const navigate = useNavigate()

  const unreadCount = notifications.filter((n) => !n.read).length

  const loadNotifications = () => {
    notificationsAPI.getAll()
      .then((res) => setNotifications(res.data ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    loadNotifications()
    const t = setInterval(loadNotifications, 60000)
    return () => clearInterval(t)
  }, [])

  const handleNotifOpen = (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget)
    loadNotifications()
  }

  const handleNotifClose = () => {
    setNotifAnchor(null)
    const unread = notifications.filter((n) => !n.read)
    if (unread.length) {
      notificationsAPI.markRead(unread.map((n) => `${n.id}:${n.state}`)).catch(() => {})
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  const handleNotifClick = (n: any) => {
    handleNotifClose()
    if (n.url) navigate(n.url)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const userName = localStorage.getItem('userName') || 'صاحب العهدة'
  const userInitial = userName.trim().charAt(0) || 'أ'

  const handleLogout = () => {
    handleMenuClose()
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('holderId')
    navigate('/login')
  }

  const handleSettings = () => {
    handleMenuClose()
    navigate('/profile')
  }

  const handleLanguageChange = () => {
    handleMenuClose()
    // TODO: Implement language toggle
    console.log('Language change clicked')
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        color: 'text.primary',
        height: 64,
      }}
    >
      <Toolbar
        sx={{
          minHeight: '64px !important',
          height: '64px',
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Menu Button (Mobile) */}
        {showMenuButton && isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexGrow: 1,
          }}
        >
          {/* Logo Box */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows[2],
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                fontFamily: 'Cairo',
              }}
            >
              AG
            </Typography>
          </Box>

          {/* Brand Name */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography
              variant="h6"
              sx={{
                color: 'primary.main',
                fontWeight: 'bold',
                fontFamily: 'Cairo',
                lineHeight: 1.2,
              }}
            >
              AG-Cash
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                fontFamily: 'Tajawal',
              }}
            >
              الخليج العربي للصيانة والتشغيل
            </Typography>
          </Box>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton
            color="inherit"
            size="small"
            sx={{ color: 'text.secondary' }}
            onClick={handleNotifOpen}
          >
            <Badge badgeContent={unreadCount || undefined} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={handleNotifClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { minWidth: 300, maxWidth: 360, maxHeight: 400, mt: 1, borderRadius: 2 } }}
          >
            {notifications.length === 0 && (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">لا توجد إشعارات</Typography>
              </MenuItem>
            )}
            {notifications.slice(0, 20).map((n) => (
              <MenuItem
                key={n.id}
                onClick={() => handleNotifClick(n)}
                sx={{ whiteSpace: 'normal', alignItems: 'flex-start', py: 1.2, bgcolor: n.read ? 'transparent' : 'action.hover' }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 700 }}>
                    {n.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {n.body}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {n.date ? new Date(n.date + 'Z').toLocaleString('ar-SA') : ''}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>

          {/* User Menu */}
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{ ml: 1 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontFamily: 'Cairo',
              }}
            >
              {userInitial}
            </Avatar>
          </IconButton>

          {/* User Dropdown Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                minWidth: 200,
                mt: 1,
                borderRadius: 2,
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ ml: 2, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {userName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {localStorage.getItem('holderId') ? `PCH #${localStorage.getItem('holderId')}` : 'أمين عهدة'}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleSettings}>
              <Settings sx={{ ml: 2, color: 'text.secondary' }} />
              <Typography>الإعدادات</Typography>
            </MenuItem>
            <MenuItem onClick={handleLanguageChange}>
              <Language sx={{ ml: 2, color: 'text.secondary' }} />
              <Typography>تغيير اللغة</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <Logout sx={{ ml: 2 }} />
              <Typography>تسجيل الخروج</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header

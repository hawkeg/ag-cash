import React, { useState } from 'react'
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    // TODO: Implement logout logic
    console.log('Logout clicked')
  }

  const handleSettings = () => {
    handleMenuClose()
    // TODO: Navigate to settings
    console.log('Settings clicked')
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
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

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
              أ
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
                  أحمد المنصور
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ahmed@example.com
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

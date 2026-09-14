import React from 'react'
import {
  BottomNavigation,
  BottomNavigationAction,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  ReceiptLong as RequestsIcon,
  AddCircle as CreateIcon,
  History as HistoryIcon,
  Assessment as ReportsIcon,
  Person as ProfileIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

const Navigation: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()

  // Don't show navigation on desktop or if not on main routes
  if (!isMobile) {
    return null
  }

  const getCurrentValue = () => {
    const path = location.pathname
    if (path === '/') return 0
    if (path === '/requests') return 1
    if (path === '/create-request') return 2
    if (path === '/history') return 3
    if (path === '/reports') return 4
    if (path === '/profile') return 5
    return 0
  }

  const handleNavigationChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/')
        break
      case 1:
        navigate('/requests')
        break
      case 2:
        navigate('/create-request')
        break
      case 3:
        navigate('/history')
        break
      case 4:
        navigate('/reports')
        break
      case 5:
        navigate('/profile')
        break
    }
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 3,
        borderRadius: 0,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleNavigationChange}
        sx={{
          bgcolor: 'background.paper',
          height: 56,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            maxWidth: 'none',
            padding: '6px 12px',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
        showLabels
      >
        <BottomNavigationAction
          label="الرئيسية"
          icon={<DashboardIcon />}
        />
        <BottomNavigationAction
          label="الطلبات"
          icon={<RequestsIcon />}
        />
        <BottomNavigationAction
          label="طلب جديد"
          icon={<CreateIcon />}
        />
        <BottomNavigationAction
          label="السجل"
          icon={<HistoryIcon />}
        />
        <BottomNavigationAction
          label="التقارير"
          icon={<ReportsIcon />}
        />
        <BottomNavigationAction
          label="الملف"
          icon={<ProfileIcon />}
        />
      </BottomNavigation>
    </Paper>
  )
}

export default Navigation

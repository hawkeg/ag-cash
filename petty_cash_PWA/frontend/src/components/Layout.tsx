import React from 'react'
import { Box, useTheme, useMediaQuery, Container } from '@mui/material'
import Header from './Header'
import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  showMenuButton?: boolean
  onMenuClick?: () => void
}

const Layout: React.FC<LayoutProps> = ({
  children,
  maxWidth = 'lg',
  showMenuButton = false,
  onMenuClick,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Header
        onMenuClick={onMenuClick}
        showMenuButton={showMenuButton}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 2,
          pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)' : 3,
          width: '100%',
        }}
      >
        <Container maxWidth={maxWidth}>
          {children}
        </Container>
      </Box>

      {/* Bottom Navigation (Mobile Only) */}
      <Navigation />
    </Box>
  )
}

export default Layout

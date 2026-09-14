import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Requests from './pages/Requests'
import CreateRequest from './pages/CreateRequest'
import RequestDetail from './pages/RequestDetail'
import Reports from './pages/Reports'
import AdvanceRequest from './pages/AdvanceRequest'
import History from './pages/History'
import Profile from './pages/Profile'

// Create theme with corporate fintech design
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#235b54', // Petroleum teal
      dark: '#01433d',
      light: '#3a7c74',
    },
    secondary: {
      main: '#545f73',
    },
    background: {
      default: '#f8f9ff',
      paper: '#ffffff',
    },
    error: {
      main: '#ba1a1a',
    },
    success: {
      main: '#006a4e',
    },
    warning: {
      main: '#ffa000',
    },
  },
  typography: {
    fontFamily: '"Cairo", "Tajawal", sans-serif',
    h1: {
      fontFamily: '"Cairo", sans-serif',
    },
    h2: {
      fontFamily: '"Cairo", sans-serif',
    },
    h3: {
      fontFamily: '"Cairo", sans-serif',
    },
    h4: {
      fontFamily: '"Cairo", sans-serif',
    },
    h5: {
      fontFamily: '"Cairo", sans-serif',
    },
    h6: {
      fontFamily: '"Cairo", sans-serif',
    },
    button: {
      fontFamily: '"Cairo", sans-serif',
    },
    body1: {
      fontFamily: '"Tajawal", sans-serif',
    },
    body2: {
      fontFamily: '"Tajawal", sans-serif',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        // Use Inter for numbers
        root: {
          '& span.number': {
            fontFamily: '"Inter", sans-serif',
          },
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/requests" element={
            <Layout>
              <Requests />
            </Layout>
          } />
          <Route path="/create-request" element={
            <Layout>
              <CreateRequest />
            </Layout>
          } />
          <Route path="/requests/:id" element={
            <Layout>
              <RequestDetail />
            </Layout>
          } />
          <Route path="/advance-request" element={
            <Layout>
              <AdvanceRequest />
            </Layout>
          } />
          <Route path="/reports" element={
            <Layout>
              <Reports />
            </Layout>
          } />
          <Route path="/history" element={
            <Layout>
              <History />
            </Layout>
          } />
          <Route path="/profile" element={
            <Layout>
              <Profile />
            </Layout>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

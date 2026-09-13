import React from 'react'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Requests from './pages/Requests'
import CreateRequest from './pages/CreateRequest'

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/create-request" element={<CreateRequest />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

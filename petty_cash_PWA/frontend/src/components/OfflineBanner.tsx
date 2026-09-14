import React, { useEffect, useState } from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { CloudOff, Sync } from '@mui/icons-material'
import { offlineDb } from '../services/offlineDb'
import { isOnline, replayQueue } from '../services/offlineQueue'

const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(isOnline())
  const [pending, setPending] = useState(0)

  const refreshPending = () => {
    offlineDb.pendingCount().then(setPending).catch(() => {})
  }

  useEffect(() => {
    const onConnectivity = () => {
      setOnline(isOnline())
      refreshPending()
    }
    const onQueueChange = () => refreshPending()

    window.addEventListener('connectivity-changed', onConnectivity)
    window.addEventListener('offline-queue-changed', onQueueChange)
    window.addEventListener('online', onConnectivity)
    window.addEventListener('offline', onConnectivity)
    refreshPending()
    return () => {
      window.removeEventListener('connectivity-changed', onConnectivity)
      window.removeEventListener('offline-queue-changed', onQueueChange)
      window.removeEventListener('online', onConnectivity)
      window.removeEventListener('offline', onConnectivity)
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 64,
        zIndex: 1100,
        bgcolor: online ? 'warning.light' : 'grey.800',
        color: online ? 'warning.dark' : 'common.white',
        px: 2,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      {online ? <Sync fontSize="small" /> : <CloudOff fontSize="small" />}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {online ? 'متصل — جاري مزامنة العمليات المعلقة' : 'لا يوجد اتصال — سيتم حفظ العمليات محلياً'}
      </Typography>
      {pending > 0 && (
        <Chip
          size="small"
          label={`${pending} معلق`}
          onClick={() => online && replayQueue()}
          sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(0,0,0,0.15)', color: 'inherit' }}
        />
      )}
    </Box>
  )
}

export default OfflineBanner

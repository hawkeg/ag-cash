import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initOfflineSync } from './services/offlineQueue'

declare const __APP_BUILD__: string | undefined

// Stale-bundle kill-switch: if the service worker serves an older build,
// unregister all SWs, wipe caches, and reload once so the fresh bundle loads.
const BUILD_ID: string = (import.meta as any).env?.PROD && typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev'
if (BUILD_ID !== 'dev' && localStorage.getItem('agcash_build') !== BUILD_ID) {
  if (!sessionStorage.getItem('agcash_sw_reset')) {
    sessionStorage.setItem('agcash_sw_reset', '1')
    Promise.all([
      navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => r.unregister())) ?? Promise.resolve(),
      ('caches' in window ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : Promise.resolve()),
    ]).finally(() => {
      localStorage.setItem('agcash_build', BUILD_ID)
      location.reload()
    })
  } else {
    // Already reset once this session — don't loop even if still stale
    localStorage.setItem('agcash_build', BUILD_ID)
  }
}

initOfflineSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

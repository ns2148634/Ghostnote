import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onRegistered(r) {
    r && setInterval(() => r.update(), 60 * 60 * 1000)
  },
  onRegisterError(err) {
    console.warn('[PWA] Service worker registration skipped:', err?.message ?? err)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

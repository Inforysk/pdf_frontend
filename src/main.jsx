import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n' // Inicializar i18n antes de renderizar
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext.jsx'
import axios from 'axios'

// ── Interceptor global: manejo de créditos insuficientes (403) ──
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 && error.response?.data?.creditos) {
      const c = error.response.data.creditos
      const saldo = c.saldo ?? 0
      const necesarios = c.creditos_necesarios ?? 0
      const disponibles = c.creditos_disponibles ?? 0
      toast.error(
        `⚠️ Créditos insuficientes\n\nNecesitas ${necesarios} cr. pero solo tienes ${saldo.toFixed?.(1) ?? saldo} disponibles de ${disponibles} mensuales.\n\nContacta al administrador para ampliar tu plan.`,
        { duration: 6000, style: { maxWidth: '420px', whiteSpace: 'pre-line' } }
      )
    }
    return Promise.reject(error)
  }
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Toaster position="top-right" />
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

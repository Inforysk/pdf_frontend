import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, User, Eye, EyeOff, Loader2, AlertCircle, Shield } from 'lucide-react'
import LanguageSelector from './LanguageSelector'
import logo from '../assets/logo.png'

function LoginPage({ onLogin, onRegister, onForgotPassword }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await response.json()

      if (data.success) {
        onLogin(data)
      } else {
        // Traducir códigos de error del backend
        if (data.error_code) {
          let errorKey = `login.errors.${data.error_code}`
          let errorMsg = t(errorKey)
          if (data.remaining_attempts !== undefined) {
            errorMsg += ` ${data.remaining_attempts} ${t('login.errors.remaining_attempts')}`
          }
          setError(errorMsg)
        } else {
          setError(data.error || t('login.errors.default'))
        }
      }
    } catch (err) {
      setError(t('login.errors.connection'))
    } finally {
      setLoading(false)
    }
  }

  // Colores del logo Inforysk
  const colors = {
    crimson: '#C41E3A',      // Rojo del logo
    crimsonHover: '#A3182F', // Rojo oscuro hover
    navy: '#1B3A5F',         // Azul navy del logo
    navyLight: '#2A4A72',    // Azul navy claro
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${colors.crimson} 0%, transparent 70%)` }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${colors.navy} 0%, transparent 70%)` }} />
      
      {/* Selector de idioma en la esquina */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="light" />
      </div>

      {/* Card de Login */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo más grande */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Inforysk" className="h-44 w-auto drop-shadow-lg" />
        </div>

        {/* Título con color navy */}
        <h1 className="text-center text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.navy }}>
          {t('auth.login')}
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: colors.navyLight }}>
          Know the risk before the deal
        </p>

        {/* Formulario con borde sutil */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border-t-4" style={{ borderTopColor: colors.crimson }}>
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#FEF2F2', border: `1px solid ${colors.crimson}30` }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.crimson }} />
              <p className="text-sm" style={{ color: colors.crimson }}>{error}</p>
            </div>
          )}

          {/* Username o Email */}
          <div className="mb-5">
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors" style={{ color: colors.navyLight }} />
              <input
                type="text"
                placeholder={t('auth.email')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-xl text-base transition-all duration-200 outline-none"
                style={{ 
                  border: `2px solid #e2e8f0`,
                  color: colors.navy,
                }}
                onFocus={(e) => e.target.style.borderColor = colors.crimson}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 rounded-xl text-base transition-all duration-200 outline-none"
                style={{ 
                  border: `2px solid #e2e8f0`,
                  color: colors.navy,
                }}
                onFocus={(e) => e.target.style.borderColor = colors.crimson}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                style={{ color: colors.navyLight }}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {onForgotPassword && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-medium hover:underline underline-offset-4"
                  style={{ color: colors.navy }}
                >
                  Olvide mi contrasena
                </button>
              </div>
            )}
          </div>

          {/* Submit con gradiente */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-3.5 rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              background: `linear-gradient(135deg, ${colors.crimson} 0%, ${colors.crimsonHover} 100%)`,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('auth.loggingIn')}
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                {t('auth.loginButton')}
              </>
            )}
          </button>
        </form>

        {/* Registro */}
        {onRegister && (
          <div className="mt-8 text-center">
            <p className="text-sm mb-2" style={{ color: colors.navyLight }}>{t('auth.noAccount')}</p>
            <button
              onClick={onRegister}
              className="font-semibold transition-all duration-200 hover:underline underline-offset-4"
              style={{ color: colors.navy }}
            >
              {t('auth.registerAsClient')}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: colors.navyLight }}>
          {t('auth.copyright')}
        </p>
      </div>
    </div>
  )
}

export default LoginPage

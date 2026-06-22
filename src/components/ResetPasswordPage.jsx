import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, Check, X } from 'lucide-react'
import logo from '../assets/logo.png'

function generatePassword(length = 14) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%&*_-+'
  const all = upper + lower + digits + symbols

  let pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]
  for (let i = pw.length; i < length; i++) {
    pw.push(all[Math.floor(Math.random() * all.length)])
  }
  return pw.sort(() => Math.random() - 0.5).join('')
}

function ResetPasswordPage({ token, onBackToLogin }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const passwordsMatch = useMemo(() => newPassword && confirmPassword && newPassword === confirmPassword, [newPassword, confirmPassword])

  const requirements = useMemo(() => [
    { label: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Una letra minúscula', met: /[a-z]/.test(newPassword) },
    { label: 'Un número', met: /[0-9]/.test(newPassword) },
    { label: 'Un símbolo (!@#$%&*_-+)', met: /[!@#$%&*_\-+]/.test(newPassword) },
  ], [newPassword])

  const allMet = useMemo(() => requirements.every(r => r.met), [requirements])

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false)
        setValidating(false)
        return
      }
      try {
        const response = await fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
        const data = await response.json()
        setTokenValid(response.ok && data.success)
      } catch (err) {
        setTokenValid(false)
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleGenerate = () => {
    const pw = generatePassword()
    setNewPassword(pw)
    setConfirmPassword(pw)
    setShowPassword(true)
    setShowConfirm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!allMet) {
      setError('La contraseña no cumple todos los requisitos.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setDone(true)
      } else {
        const details = data.password_errors?.join(', ')
        setError(details ? `${data.error}: ${details}` : (data.error || 'No se pudo restablecer la contraseña.'))
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-7">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Inforysk" className="h-20 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Nueva contraseña</h1>
        <p className="text-sm text-slate-600 mb-6">
          Define una nueva contraseña para continuar operando en Inforysk.
        </p>

        {validating && (
          <div className="mb-4 p-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-sm flex items-start gap-2">
            <Loader2 className="h-4 w-4 mt-0.5 animate-spin" />
            <span>Validando enlace...</span>
          </div>
        )}

        {!validating && !tokenValid && (
          <div className="mb-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>El enlace es inválido o ya expiró.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5" />
            <span>Contraseña actualizada correctamente. Ya puedes iniciar sesión.</span>
          </div>
        ) : (
          !validating && tokenValid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="text-xs text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1"
                    title="Generar contraseña segura"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Generar
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Requisitos de contraseña */}
              {newPassword && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Requisitos:</p>
                  <ul className="space-y-1">
                    {requirements.map((req, i) => (
                      <li key={i} className={`text-xs flex items-center gap-1.5 ${req.met ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 ${
                      confirmPassword && !passwordsMatch ? 'border-rose-400' : 'border-slate-300'
                    }`}
                    placeholder="Repetí la nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-rose-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !allMet || !passwordsMatch}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar nueva contraseña'
                )}
              </button>
            </form>
          )
        )}

        <button
          type="button"
          onClick={onBackToLogin}
          className="mt-5 text-sm text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </button>
      </div>
    </div>
  )
}

export default ResetPasswordPage

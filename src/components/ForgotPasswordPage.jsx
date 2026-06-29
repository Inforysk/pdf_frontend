import { useState } from 'react'
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import logo from '../assets/logo.png'

function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setDone(true)
      } else {
        setError(data.error || 'No se pudo procesar la solicitud.')
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

        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Recuperar contraseña</h1>
        <p className="text-sm text-slate-600 mb-6 text-center">
          Ingresa tu email y te enviaremos un enlace seguro para restablecer tu contraseña.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5" />
            <span>Si el email existe en el sistema, ya enviamos el enlace de recuperacion.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
                placeholder="tuemail@empresa.com"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar enlace de recuperacion'
              )}
            </button>
          </form>
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

export default ForgotPasswordPage

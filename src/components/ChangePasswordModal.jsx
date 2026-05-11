import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function ChangePasswordModal({ onClose, onSuccess, required = false }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])

  // Validación en tiempo real
  const rules = [
    { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
    { label: 'Al menos una mayúscula', test: (p) => /[A-Z]/.test(p) },
    { label: 'Al menos una minúscula', test: (p) => /[a-z]/.test(p) },
    { label: 'Al menos un número', test: (p) => /[0-9]/.test(p) },
    { label: 'Al menos un símbolo (!@#$%...)', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p) },
  ]

  const allRulesPassed = newPassword && rules.every(r => r.test(newPassword))
  const passwordsMatch = newPassword && newPassword === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allRulesPassed || !passwordsMatch) return

    setLoading(true)
    setErrors([])

    try {
      const response = await axios.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      })

      if (response.data.success) {
        toast.success('Contraseña actualizada correctamente')
        onSuccess()
      } else {
        setErrors(response.data.password_errors || [response.data.error])
      }
    } catch (err) {
      setErrors([err.response?.data?.error || 'Error al cambiar contraseña'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-inforysk-navy-900 to-inforysk-red-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold">Cambiar Contraseña</h2>
              {required && (
                <p className="text-sm text-white/80">Tu contraseña expiró o es el primer login. Debes cambiarla.</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
                </p>
              ))}
            </div>
          )}

          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Ingresa tu contraseña actual"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Ingresa tu nueva contraseña"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Indicadores de reglas */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                {rules.map((rule, i) => (
                  <div key={i} className={`flex items-center gap-1.5 text-xs ${rule.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {rule.test(newPassword) ? <CheckCircle className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                    {rule.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                confirmPassword && !passwordsMatch ? 'border-red-300 bg-red-50' : ''
              }`}
              placeholder="Repite la nueva contraseña"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            {!required && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch || !oldPassword}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Cambiar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordModal

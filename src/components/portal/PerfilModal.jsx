import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  X, User, Mail, Phone, Building2, Lock, Eye, EyeOff, 
  Check, AlertCircle, Loader2, Save, Shield, Key, 
  Camera, Edit3, Globe
} from 'lucide-react'

// Función para obtener bandera
const getCountryFlag = (countryCode) => {
  if (!countryCode) return null
  const code = countryCode.toLowerCase()
  return `https://flagcdn.com/24x18/${code}.png`
}

export default function PerfilModal({ isOpen, onClose, user, onUpdate, initialTab = 'perfil' }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('perfil') // perfil, seguridad
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  
  // Estados para edición de perfil
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
  })
  
  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordStrength, setPasswordStrength] = useState(0)

  useEffect(() => {
    if (isOpen && user) {
      setActiveTab(initialTab) // Resetear al tab indicado
      setFormData({
        nombre_completo: user.nombre_completo || '',
        email: user.email || '',
        telefono: user.telefono || '',
      })
      setEditMode(false)
      setSuccess(null)
      setError(null)
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    }
  }, [isOpen, user, initialTab])

  // Calcular fuerza de contraseña
  useEffect(() => {
    const pwd = passwordData.new_password
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    setPasswordStrength(Math.min(strength, 5))
  }, [passwordData.new_password])

  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.put('/api/portal/perfil', formData)
      if (res.data.success) {
        // Actualizar formData con datos del servidor
        if (res.data.user) {
          setFormData({
            nombre_completo: res.data.user.nombre_completo || '',
            email: res.data.user.email || '',
            telefono: res.data.user.telefono || '',
          })
        }
        setSuccess(t('profile.profileUpdated'))
        setEditMode(false)
        if (onUpdate) onUpdate(res.data.user)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.data.error || t('profile.updateError'))
      }
    } catch (err) {
      setError(err.response?.data?.error || t('profile.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError(t('profile.passwordsDoNotMatch'))
      return
    }
    if (passwordData.new_password.length < 8) {
      setError(t('profile.passwordMinLength'))
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post('/api/auth/change-password', {
        old_password: passwordData.current_password,
        new_password: passwordData.new_password,
      })
      if (res.data.success) {
        setSuccess(t('profile.passwordChanged'))
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.data.error || t('profile.changePasswordError'))
      }
    } catch (err) {
      setError(err.response?.data?.error || t('profile.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
  const strengthLabels = [
    t('profile.passwordStrength.veryWeak'),
    t('profile.passwordStrength.weak'),
    t('profile.passwordStrength.fair'),
    t('profile.passwordStrength.good'),
    t('profile.passwordStrength.excellent')
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header con avatar */}
          <div className="bg-gradient-to-br from-inforysk-navy-900 to-inforysk-red-600 p-4 sm:p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold">
                  {(user?.nombre_completo || user?.username || '?')[0].toUpperCase()}
                </div>
                {user?.pais && (
                  <img 
                    src={getCountryFlag(user.pais)} 
                    alt={user.pais}
                    className="absolute -bottom-1 -right-1 w-5 h-3.5 sm:w-6 sm:h-4 rounded shadow"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate">{user?.nombre_completo || user?.username}</h2>
                <p className="text-white/80 text-xs sm:text-sm truncate">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user?.rol === 'cliente_admin' ? 'bg-inforysk-red-500/30 text-white' : 'bg-inforysk-navy-500/30 text-white'
                  }`}>
                    {user?.rol === 'cliente_admin' ? t('profile.roles.admin') : t('profile.roles.user')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Info de empresa */}
            {user?.empresa_nombre && (
              <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-white/10 rounded-xl flex items-center gap-2 sm:gap-3">
                <Building2 size={16} className="text-white/70 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.empresa_nombre}</p>
                  {user.empresa_cuit && (
                    <p className="text-xs text-white/70">{user.empresa_tipo_id || 'CUIT'}: {user.empresa_cuit}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'perfil' 
                  ? 'text-inforysk-red-600 border-b-2 border-inforysk-red-600 bg-inforysk-red-50/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={16} />
              {t('profile.tabs.profile')}
            </button>
            <button
              onClick={() => setActiveTab('seguridad')}
              className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'seguridad' 
                  ? 'text-inforysk-red-600 border-b-2 border-inforysk-red-600 bg-inforysk-red-50/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield size={16} />
              {t('profile.tabs.security')}
            </button>
          </div>

          {/* Contenido */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
            {/* Mensajes */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700"
                >
                  <Check size={18} />
                  <span className="text-sm">{success}</span>
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700"
                >
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab Perfil */}
            {activeTab === 'perfil' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{t('profile.personalInfo')}</h3>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-sm text-inforysk-red-600 hover:text-inforysk-red-700 flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                      {t('profile.edit')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditMode(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {t('profile.cancel')}
                    </button>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.fullName')}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-inforysk-red-500 focus:border-inforysk-red-500"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <User size={18} className="text-gray-400" />
                      <span className="text-gray-900">{user?.nombre_completo || '-'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.email')}
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-inforysk-red-500 focus:border-inforysk-red-500"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <Mail size={18} className="text-gray-400" />
                      <span className="text-gray-900">{user?.email || '-'}</span>
                    </div>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.phone')}
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder={t('profile.phonePlaceholder')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-inforysk-red-500 focus:border-inforysk-red-500"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <Phone size={18} className="text-gray-400" />
                      <span className="text-gray-900">{user?.telefono || t('profile.phoneNotRegistered')}</span>
                    </div>
                  )}
                </div>

                {/* Usuario (solo lectura) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.username')}
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                    <Key size={18} className="text-gray-400" />
                    <span className="text-gray-900 font-mono">{user?.username}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Seguridad */}
            {activeTab === 'seguridad' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">{t('profile.changePassword')}</h3>

                {/* Contraseña actual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.currentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-inforysk-red-500 focus:border-inforysk-red-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-inforysk-red-500 focus:border-inforysk-red-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Indicador de fuerza */}
                  {passwordData.new_password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${passwordStrength < 3 ? 'text-orange-600' : 'text-green-600'}`}>
                        {t('profile.passwordStrength.label')}: {strengthLabels[passwordStrength - 1] || t('profile.passwordStrength.veryWeak')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className={`w-full px-4 py-2.5 pr-12 border rounded-xl focus:ring-2 focus:ring-inforysk-red-500 focus:border-inforysk-red-500 ${
                        passwordData.confirm_password && passwordData.confirm_password !== passwordData.new_password
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordData.confirm_password && passwordData.confirm_password !== passwordData.new_password && (
                    <p className="text-xs text-red-600 mt-1">{t('profile.passwordsDoNotMatch')}</p>
                  )}
                </div>

                {/* Tips de seguridad */}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700 font-medium mb-1">{t('profile.recommendations')}:</p>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    <li>• {t('profile.passwordTips.minLength')}</li>
                    <li>• {t('profile.passwordTips.upperLower')}</li>
                    <li>• {t('profile.passwordTips.numbersSymbols')}</li>
                  </ul>
                </div>

                {/* Botón cambiar */}
                <button
                  onClick={handleChangePassword}
                  disabled={loading || !passwordData.current_password || !passwordData.new_password || passwordData.new_password !== passwordData.confirm_password}
                  className="w-full py-3 bg-inforysk-red-600 text-white font-medium rounded-xl hover:bg-inforysk-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {t('profile.changePasswordBtn')}
                </button>
              </div>
            )}
          </div>
          
          {/* Footer fijo con botón Guardar */}
          {activeTab === 'perfil' && editMode && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="w-full py-3 bg-inforysk-red-600 text-white font-semibold rounded-xl hover:bg-inforysk-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {t('profile.saveChanges')}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

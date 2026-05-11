import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft, Globe, Building2, RefreshCw, ChevronDown, X, Search, UserCheck, Users, Phone, Plus } from 'lucide-react'
import axios from 'axios'
import LanguageSelector from './LanguageSelector'
import logo from '../assets/logo.png'

// Colores del logo Inforysk
const colors = {
  crimson: '#C41E3A',
  crimsonHover: '#A3182F',
  navy: '#1B3A5F',
  navyLight: '#2A4A72',
}

// ── Validación de identificador fiscal ──
function validateTaxId(taxId, tipo) {
  if (!taxId) return { valid: false, error: 'Requerido' }
  const clean = taxId.replace(/[-.\s/]/g, '')
  if (!clean) return { valid: false, error: 'Requerido' }

  if (tipo === 'CUIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 11) return { valid: false, error: 'Debe tener 11 dígitos' }
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const suma = mult.reduce((s, m, i) => s + parseInt(clean[i]) * m, 0)
    const resto = 11 - (suma % 11)
    const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto
    if (parseInt(clean[10]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RUT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 12) return { valid: false, error: 'Debe tener 12 dígitos' }
    const rest = clean.slice(0, 11)
    let total = 0, factor = 2
    for (let i = 10; i >= 0; i--) {
      total += factor * parseInt(rest[i])
      factor = factor === 9 ? 2 : factor + 1
    }
    let dv = 11 - (total % 11)
    if (dv === 11) dv = 0
    else if (dv === 10) dv = 1
    if (parseInt(clean[11]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RNC') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 7 || clean.length > 16) return { valid: false, error: '7-16 dígitos' }
    return { valid: true }
  }
  if (tipo === 'NIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (tipo === 'RUC') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 20) return { valid: false, error: '5-20 dígitos' }
    return { valid: true }
  }
  if (tipo === 'RTN') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 9 || clean.length > 20) return { valid: false, error: '9-20 dígitos' }
    return { valid: true }
  }
  if (tipo === 'CEDULA JURIDICA') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (tipo === 'EIN') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 9) return { valid: false, error: 'Debe tener 9 dígitos' }
    return { valid: true }
  }
  if (tipo === 'CNPJ') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 14) return { valid: false, error: 'Debe tener 14 dígitos' }
    return { valid: true }
  }
  if (tipo === 'HRB' || tipo === 'RFC' || tipo === 'NUMERO FISCAL') {
    if (clean.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' }
    return { valid: true }
  }
  // Fallback para otros tipos
  if (clean.length < 5) return { valid: false, error: 'Mínimo 5 caracteres' }
  return { valid: true }
}

/**
 * Página de registro público
 * Solo disponible para roles: cliente_admin y cliente_usuario
 */
function RegisterPage({ onBack }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    nombre_completo: '',
    rol: '',
    pais: 'AR',
    cuit_cliente: '',
    razon_social_manual: '',
    telefono: '',
    codigo_telefono: '+54',
    codigoTelManual: false,
    telefono2: '',
    codigo_telefono2: '',
    pais_telefono2: '',
    codigoTel2Manual: false,
  })
  const [mostrarTelefono2, setMostrarTelefono2] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // País y empresa
  const [paises, setPaises] = useState([])
  const [paisSeleccionado, setPaisSeleccionado] = useState(null)
  const [showPaisDropdown, setShowPaisDropdown] = useState(false)
  const [paisSearch, setPaisSearch] = useState('')
  const [tipoIdentificador, setTipoIdentificador] = useState('CUIT')
  
  // Búsqueda de empresa
  const [searchingEmpresa, setSearchingEmpresa] = useState(false)
  const [empresaEncontrada, setEmpresaEncontrada] = useState(null)
  
  // Validación cliente_admin para cliente_usuario
  const [validandoAdmin, setValidandoAdmin] = useState(false)
  const [adminExiste, setAdminExiste] = useState(null)
  const [adminInfo, setAdminInfo] = useState(null)
  
  // Validación de formato del identificador fiscal
  const [taxIdValidation, setTaxIdValidation] = useState({ valid: false, error: null })

  // Cargar países
  useEffect(() => {
    const loadPaises = async () => {
      try {
        const res = await axios.get('/api/paises')
        if (res.data.success) {
          setPaises(res.data.paises)
          const ar = res.data.paises.find(p => p.codigo === 'AR')
          if (ar) {
            setPaisSeleccionado(ar)
            setTipoIdentificador(ar.tipo_identificacion || 'CUIT')
          }
        }
      } catch (err) {
        console.error('Error cargando países:', err)
      }
    }
    loadPaises()
  }, [])

  // Validar formato del identificador fiscal en tiempo real
  useEffect(() => {
    if (!form.cuit_cliente) {
      setTaxIdValidation({ valid: false, error: null })
      return
    }
    const result = validateTaxId(form.cuit_cliente, tipoIdentificador)
    setTaxIdValidation(result)
  }, [form.cuit_cliente, tipoIdentificador])

  // Buscar empresa cuando cambia CUIT
  useEffect(() => {
    if (!form.cuit_cliente || form.cuit_cliente.length < 8) {
      setEmpresaEncontrada(null)
      setAdminExiste(null)
      setAdminInfo(null)
      return
    }

    const timer = setTimeout(async () => {
      setSearchingEmpresa(true)
      try {
        const res = await axios.get(`/api/buscar-empresa?cuit=${form.cuit_cliente}&tipo=${tipoIdentificador}`)
        if (res.data.success && res.data.empresa) {
          setEmpresaEncontrada(res.data.empresa)
        } else {
          setEmpresaEncontrada(null)
        }
      } catch {
        setEmpresaEncontrada(null)
      } finally {
        setSearchingEmpresa(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.cuit_cliente, tipoIdentificador])

  // Validar si existe cliente_admin cuando se selecciona cliente_usuario
  useEffect(() => {
    if (form.rol !== 'cliente_usuario' || !form.cuit_cliente || form.cuit_cliente.length < 8) {
      setAdminExiste(null)
      setAdminInfo(null)
      return
    }

    const timer = setTimeout(async () => {
      setValidandoAdmin(true)
      try {
        const res = await axios.get(`/api/validar-cliente-admin?cuit=${form.cuit_cliente}&pais=${form.pais}`)
        setAdminExiste(res.data.existe)
        setAdminInfo(res.data.admin || null)
      } catch {
        setAdminExiste(false)
        setAdminInfo(null)
      } finally {
        setValidandoAdmin(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.rol, form.cuit_cliente, form.pais])

  const handleSelectPais = (pais) => {
    setPaisSeleccionado(pais)
    setForm({
      ...form, 
      pais: pais.codigo, 
      cuit_cliente: '', 
      razon_social_manual: '',
      codigo_telefono: pais.codigo_telefono || '+54'
    })
    setTipoIdentificador(pais.tipo_identificacion || 'ID Fiscal')
    setShowPaisDropdown(false)
    setPaisSearch('')
    setEmpresaEncontrada(null)
    setAdminExiste(null)
    setAdminInfo(null)
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*'
    let pass = ''
    pass += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    pass += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    pass += '0123456789'[Math.floor(Math.random() * 10)]
    pass += '!@#$%&*'[Math.floor(Math.random() * 7)]
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)]
    pass = pass.split('').sort(() => Math.random() - 0.5).join('')
    setForm({...form, password: pass, confirmPassword: pass})
    setShowPassword(true)
  }

  const clearPassword = () => {
    setForm({...form, password: '', confirmPassword: ''})
    setShowPassword(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!form.rol) {
      setError('Debe seleccionar un tipo de cuenta')
      return
    }
    if (!form.email || !form.nombre_completo) {
      setError('Email y nombre completo son requeridos')
      return
    }
    if (!form.cuit_cliente) {
      setError(`Debe ingresar el ${tipoIdentificador}`)
      return
    }
    // Teléfono es obligatorio
    if (!form.telefono || form.telefono.trim() === '') {
      setError('El teléfono de contacto es obligatorio')
      return
    }
    // Validar código telefónico si es manual
    if (form.codigoTelManual && (!form.codigo_telefono || !form.codigo_telefono.startsWith('+'))) {
      setError('Ingrese un código telefónico válido (ej: +52)')
      return
    }
    // Para cliente_admin: requiere empresa encontrada o nombre manual
    if (form.rol === 'cliente_admin' && !empresaEncontrada && !form.razon_social_manual) {
      setError('Debe ingresar el nombre de la empresa')
      return
    }
    if (!form.password) {
      setError('La contraseña es obligatoria')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    // Validar requisitos de contraseña
    const passErrors = []
    if (form.password.length < 8) passErrors.push('mínimo 8 caracteres')
    if (!/[A-Z]/.test(form.password)) passErrors.push('una mayúscula')
    if (!/[0-9]/.test(form.password)) passErrors.push('un número')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) passErrors.push('un carácter especial')
    if (passErrors.length > 0) {
      setError(`La contraseña debe tener: ${passErrors.join(', ')}`)
      return
    }

    // Si es cliente_usuario, validar que exista cliente_admin
    if (form.rol === 'cliente_usuario' && !adminExiste) {
      setError('No existe un administrador registrado para esta empresa. El administrador debe registrarse primero.')
      return
    }

    setLoading(true)
    try {
      // Para cliente_usuario, usar info del admin si existe
      const razonSocialFinal = empresaEncontrada?.razon_social || form.razon_social_manual || adminInfo?.razon_social || 'Empresa pendiente'
      
      const res = await axios.post('/api/registro/cliente', {
        email: form.email,
        username: form.username || form.email.split('@')[0],
        password: form.password,
        nombre_completo: form.nombre_completo,
        rol: form.rol,
        pais_cliente: form.pais,
        cuit_cliente: form.cuit_cliente,
        razon_social_cliente: razonSocialFinal,
        telefono: form.telefono || null,
        codigo_telefono: form.codigoTelManual ? form.codigo_telefono : (paisSeleccionado?.codigo_telefono || form.codigo_telefono || null),
        telefono2: mostrarTelefono2 ? (form.telefono2 || null) : null,
        codigo_telefono2: mostrarTelefono2 ? (form.codigo_telefono2 || null) : null,
      })

      if (res.data.success) {
        setSuccess(true)
      } else {
        setError(res.data.error || 'Error al registrar')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  const filteredPaises = paises.filter(p =>
    p.nombre.toLowerCase().includes(paisSearch.toLowerCase()) ||
    p.codigo.toLowerCase().includes(paisSearch.toLowerCase())
  )

  // Pantalla de éxito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${colors.crimson} 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-5" style={{ background: `radial-gradient(circle, ${colors.navy} 0%, transparent 70%)` }} />
        
        <div className="absolute top-4 right-4 z-50">
          <LanguageSelector variant="light" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-2xl border-t-4 p-8 shadow-xl text-center" style={{ borderTopColor: '#22c55e' }}>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: colors.navy }}>{t('register.successTitle')}</h2>
            <p className="mb-6" style={{ color: colors.navyLight }}>
              {form.rol === 'cliente_admin' 
                ? t('register.successMessageAdmin')
                : t('register.successMessageUser')}
            </p>
            <button
              onClick={onBack}
              className="w-full py-3.5 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: `linear-gradient(135deg, ${colors.crimson} 0%, ${colors.crimsonHover} 100%)`,
              }}
            >
              {t('register.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 relative overflow-auto">
      {/* Elementos decorativos de fondo */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle, ${colors.crimson} 0%, transparent 70%)` }} />
      <div className="fixed bottom-0 left-0 w-96 h-96 rounded-full opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle, ${colors.navy} 0%, transparent 70%)` }} />
      
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector variant="light" />
      </div>
      
      <div className="w-full max-w-lg mx-auto relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Inforysk" className="h-44 w-auto drop-shadow-lg" />
        </div>

        <h1 className="text-center text-2xl sm:text-3xl font-bold mb-1" style={{ color: colors.navy }}>
          {t('register.createAccount')}
        </h1>
        <p className="text-center text-sm mb-5" style={{ color: colors.navyLight }}>
          {t('register.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-t-4 p-6 shadow-xl space-y-4" style={{ borderTopColor: colors.crimson }}>
          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#FEF2F2', border: `1px solid ${colors.crimson}30` }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.crimson }} />
              <p className="text-sm" style={{ color: colors.crimson }}>{error}</p>
            </div>
          )}

          {/* Selector de rol */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.navy }}>{t('register.accountType')} *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({...form, rol: 'cliente_admin'})}
                className="p-4 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: form.rol === 'cliente_admin' ? colors.crimson : '#e2e8f0',
                  backgroundColor: form.rol === 'cliente_admin' ? `${colors.crimson}10` : 'white',
                }}
              >
                <UserCheck className="h-6 w-6 mb-2" style={{ color: form.rol === 'cliente_admin' ? colors.crimson : colors.navyLight }} />
                <p className="font-semibold text-sm" style={{ color: form.rol === 'cliente_admin' ? colors.crimson : colors.navy }}>
                  {t('register.administrator')}
                </p>
                <p className="text-xs mt-1" style={{ color: colors.navyLight }}>{t('register.adminDescription')}</p>
              </button>
              <button
                type="button"
                onClick={() => setForm({...form, rol: 'cliente_usuario'})}
                className="p-4 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: form.rol === 'cliente_usuario' ? colors.crimson : '#e2e8f0',
                  backgroundColor: form.rol === 'cliente_usuario' ? `${colors.crimson}10` : 'white',
                }}
              >
                <Users className="h-6 w-6 mb-2" style={{ color: form.rol === 'cliente_usuario' ? colors.crimson : colors.navyLight }} />
                <p className="font-semibold text-sm" style={{ color: form.rol === 'cliente_usuario' ? colors.crimson : colors.navy }}>
                  {t('register.user')}
                </p>
                <p className="text-xs mt-1" style={{ color: colors.navyLight }}>{t('register.userDescription')}</p>
              </button>
            </div>
          </div>

          {form.rol && (
            <>
              {/* País y CUIT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector de país */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.navy }}>{t('register.country')} *</label>
                  <button
                    type="button"
                    onClick={() => setShowPaisDropdown(!showPaisDropdown)}
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 rounded-xl flex items-center justify-between focus:outline-none transition-colors"
                    style={{ borderColor: showPaisDropdown ? colors.crimson : '#e2e8f0', color: colors.navy }}
                  >
                    {paisSeleccionado ? (
                      <span className="flex items-center gap-2">
                        <img 
                          src={`https://flagcdn.com/24x18/${paisSeleccionado.codigo.toLowerCase()}.png`} 
                          alt={paisSeleccionado.nombre}
                          className="w-5 h-4 object-cover rounded-sm"
                        />
                        {paisSeleccionado.nombre}
                      </span>
                    ) : (
                      <span style={{ color: colors.navyLight }}>{t('register.selectCountry')}</span>
                    )}
                    <ChevronDown className="h-4 w-4" style={{ color: colors.navyLight }} />
                  </button>
                  
                  {showPaisDropdown && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.navyLight }} />
                          <input
                            type="text"
                            value={paisSearch}
                            onChange={(e) => setPaisSearch(e.target.value)}
                            placeholder={t('register.searchCountry')}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded text-sm focus:outline-none"
                            style={{ color: colors.navy }}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-44">
                        {filteredPaises.map(p => (
                          <button
                            key={p.codigo}
                            type="button"
                            onClick={() => handleSelectPais(p)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm text-left"
                            style={{ color: colors.navy }}
                          >
                            <img 
                              src={`https://flagcdn.com/24x18/${p.codigo.toLowerCase()}.png`} 
                              alt={p.nombre}
                              className="w-5 h-4 object-cover rounded-sm"
                            />
                            {p.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CUIT/RUC */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.navy }}>{tipoIdentificador} *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.cuit_cliente}
                      onChange={(e) => setForm({...form, cuit_cliente: e.target.value.replace(/[^\d-]/g, '')})}
                      placeholder={t('register.enterTaxId', { type: tipoIdentificador })}
                      className="w-full px-3 py-2.5 bg-slate-50 border-2 rounded-xl focus:outline-none transition-colors"
                      style={{ 
                        borderColor: form.cuit_cliente 
                          ? taxIdValidation.valid ? '#22c55e' : colors.crimson
                          : '#e2e8f0',
                        color: colors.navy
                      }}
                    />
                    {searchingEmpresa && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" style={{ color: colors.navyLight }} />
                    )}
                  </div>
                  {/* Feedback de validación de formato */}
                  {form.cuit_cliente && (
                    <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: taxIdValidation.valid ? '#22c55e' : colors.crimson }}>
                      {taxIdValidation.valid ? (
                        <><CheckCircle className="h-3 w-3" /> {t('register.validFormat')}</>
                      ) : (
                        <><AlertCircle className="h-3 w-3" /> {taxIdValidation.error}</>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Para cliente_admin: Empresa encontrada o ingresar manualmente */}
              {form.rol === 'cliente_admin' && (
                <>
                  {empresaEncontrada && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-green-700 font-medium">{empresaEncontrada.razon_social}</p>
                        <p className="text-xs text-green-600">{t('register.companyFoundInSystem')}</p>
                      </div>
                    </div>
                  )}

                  {/* Razón social manual si no se encontró - SOLO para cliente_admin */}
                  {form.cuit_cliente && form.cuit_cliente.length >= 8 && !searchingEmpresa && !empresaEncontrada && (
                    <div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2">
                        <p className="text-sm text-amber-700">{t('register.companyNotFound', { type: tipoIdentificador })}</p>
                      </div>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                        <input
                          type="text"
                          value={form.razon_social_manual}
                          onChange={(e) => setForm({...form, razon_social_manual: e.target.value})}
                          placeholder={t('register.companyName')}
                          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-crimson transition-colors"
                          style={{ color: colors.navy }}
                          onFocus={(e) => e.target.style.borderColor = colors.crimson}
                          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Para cliente_usuario: SOLO validar si existe admin */}
              {form.rol === 'cliente_usuario' && form.cuit_cliente && form.cuit_cliente.length >= 8 && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  validandoAdmin 
                    ? 'bg-blue-50 border-blue-200'
                    : adminExiste
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                }`}>
                  {validandoAdmin ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <p className="text-sm text-blue-700">{t('register.verifyingAdmin')}</p>
                    </>
                  ) : adminExiste ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-green-700 font-medium">{t('register.companyRegistered')}</p>
                        {adminInfo && (
                          <>
                            <p className="text-xs text-green-600">{adminInfo.razon_social || t('register.company')}</p>
                            <p className="text-xs text-green-500">{t('register.admin')}: {adminInfo.nombre_completo}</p>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: colors.crimson }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: colors.crimson }}>{t('register.noAdminRegistered')}</p>
                        <p className="text-xs" style={{ color: colors.crimsonHover }}>{t('register.adminMustRegisterFirst')}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Nombre completo */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
                  placeholder={t('register.fullName')}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none transition-colors"
                  style={{ color: colors.navy }}
                  onFocus={(e) => e.target.style.borderColor = colors.crimson}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  required
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder={t('register.email')}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none transition-colors"
                  style={{ color: colors.navy }}
                  onFocus={(e) => e.target.style.borderColor = colors.crimson}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  required
                />
              </div>

              {/* Teléfono - código se sincroniza con país seleccionado */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.navy }}>
                  {t('register.phone')} <span style={{ color: colors.crimson }}>*</span>
                </label>
                <div className="flex gap-2">
                  {form.codigoTelManual ? (
                    <input
                      type="text"
                      value={form.codigo_telefono}
                      onChange={(e) => setForm({...form, codigo_telefono: e.target.value.replace(/[^+\d]/g, '')})}
                      placeholder="+XX"
                      className="w-20 px-2 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-center focus:outline-none"
                      style={{ color: colors.navy }}
                      onFocus={(e) => e.target.style.borderColor = colors.crimson}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl min-w-[90px]">
                      {paisSeleccionado && (
                        <img 
                          src={`https://flagcdn.com/24x18/${paisSeleccionado.codigo.toLowerCase()}.png`} 
                          alt="" 
                          className="w-5 h-4 object-cover rounded-sm"
                        />
                      )}
                      <span className="text-sm font-medium" style={{ color: colors.navy }}>{paisSeleccionado?.codigo_telefono || '+54'}</span>
                    </div>
                  )}
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => setForm({...form, telefono: e.target.value.replace(/[^\d\s-]/g, '')})}
                      placeholder={paisSeleccionado?.formato_telefono || t('register.phoneNumber')}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none transition-colors"
                      style={{ color: colors.navy }}
                      onFocus={(e) => e.target.style.borderColor = colors.crimson}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (form.codigoTelManual) {
                      setForm({...form, codigoTelManual: false, codigo_telefono: paisSeleccionado?.codigo_telefono || '+54'})
                    } else {
                      setForm({...form, codigoTelManual: true, codigo_telefono: ''})
                    }
                  }}
                  className="text-xs mt-1 hover:underline"
                  style={{ color: colors.crimson }}
                >
                  {form.codigoTelManual ? t('register.useCountryCode') : t('register.enterCodeManually')}
                </button>
              </div>

              {/* Botón para agregar segundo teléfono */}
              {!mostrarTelefono2 && (
                <button
                  type="button"
                  onClick={() => setMostrarTelefono2(true)}
                  className="flex items-center gap-1 text-sm hover:underline"
                  style={{ color: colors.crimson }}
                >
                  <Plus className="h-4 w-4" />
                  {t('register.addAnotherPhone')}
                </button>
              )}

              {/* Segundo teléfono (opcional) */}
              {mostrarTelefono2 && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.navy }}>
                    {t('register.alternativePhone')}
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarTelefono2(false)
                        setForm({...form, telefono2: '', codigo_telefono2: '', pais_telefono2: '', codigoTel2Manual: false})
                      }}
                      className="ml-2 text-xs"
                      style={{ color: colors.crimson }}
                    >
                      ({t('register.remove')})
                    </button>
                  </label>
                  <div className="flex gap-2">
                    {form.codigoTel2Manual ? (
                      <input
                        type="text"
                        value={form.codigo_telefono2}
                        onChange={(e) => setForm({...form, codigo_telefono2: e.target.value.replace(/[^+\d]/g, '')})}
                        placeholder="+XX"
                        className="w-20 px-2 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-center focus:outline-none"
                        style={{ color: colors.navy }}
                        onFocus={(e) => e.target.style.borderColor = colors.crimson}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    ) : (
                      <select
                        value={form.pais_telefono2}
                        onChange={(e) => {
                          if (e.target.value === '_manual') {
                            setForm({...form, codigoTel2Manual: true, pais_telefono2: '', codigo_telefono2: ''})
                          } else {
                            const paisSel = paises.find(p => p.codigo === e.target.value)
                            setForm({
                              ...form, 
                              pais_telefono2: e.target.value,
                              codigo_telefono2: paisSel?.codigo_telefono || ''
                            })
                          }
                        }}
                        className="px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none min-w-[160px]"
                        style={{ color: colors.navy }}
                      >
                        <option value="">{t('register.selectCountry')}</option>
                        {paises.map(p => (
                          <option key={p.codigo} value={p.codigo}>
                            {p.codigo_telefono} {p.nombre}
                          </option>
                        ))}
                        <option value="_manual">✏️ {t('register.otherCode')}</option>
                      </select>
                    )}
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                      <input
                        type="tel"
                        value={form.telefono2}
                        onChange={(e) => setForm({...form, telefono2: e.target.value.replace(/[^\d\s-]/g, '')})}
                        placeholder={t('register.phoneNumber')}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none transition-colors"
                        style={{ color: colors.navy }}
                        onFocus={(e) => e.target.style.borderColor = colors.crimson}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        disabled={!form.pais_telefono2 && !form.codigoTel2Manual}
                      />
                    </div>
                  </div>
                  {form.codigoTel2Manual && (
                    <button
                      type="button"
                      onClick={() => setForm({...form, codigoTel2Manual: false, codigo_telefono2: '', pais_telefono2: ''})}
                      className="text-xs mt-1 hover:underline"
                      style={{ color: colors.crimson }}
                    >
                      ← {t('register.selectFromList')}
                    </button>
                  )}
                  {form.pais_telefono2 && !form.codigoTel2Manual && (
                    <p className="text-xs mt-1" style={{ color: colors.navyLight }}>
                      {t('register.code')}: {form.codigo_telefono2}
                    </p>
                  )}
                </div>
              )}

              {/* Validación visual de contraseña */}
              {form.password && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-medium mb-2" style={{ color: colors.navyLight }}>{t('register.passwordRequirements')}:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className={`flex items-center gap-1 ${form.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                      {form.password.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {t('register.min8Chars')}
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[A-Z]/.test(form.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {t('register.oneUppercase')}
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[0-9]/.test(form.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {t('register.oneNumber')}
                    </span>
                    <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                      {/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {t('register.oneSpecialChar')}
                    </span>
                  </div>
                </div>
              )}

              {/* Contraseñas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.navy }}>{t('register.password')} *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      placeholder={t('register.enterPassword')}
                      className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none transition-colors"
                      style={{ color: colors.navy }}
                      onFocus={(e) => e.target.style.borderColor = colors.crimson}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: colors.navyLight }}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.navy }}>{t('register.confirm')} *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: colors.navyLight }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                      placeholder={t('register.confirmPassword')}
                      className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border-2 rounded-xl focus:outline-none transition-colors"
                      style={{ 
                        color: colors.navy,
                        borderColor: form.confirmPassword && form.password !== form.confirmPassword ? colors.crimson : '#e2e8f0'
                      }}
                      onFocus={(e) => e.target.style.borderColor = colors.crimson}
                      onBlur={(e) => e.target.style.borderColor = form.confirmPassword && form.password !== form.confirmPassword ? colors.crimson : '#e2e8f0'}
                    />
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                    )}
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs mt-1" style={{ color: colors.crimson }}>{t('register.passwordsDoNotMatch')}</p>
                  )}
                </div>
              </div>

              {/* Botón generar/limpiar contraseña */}
              <button
                type="button"
                onClick={form.password ? clearPassword : generatePassword}
                className="text-sm flex items-center gap-1 hover:underline"
                style={{ color: form.password ? '#f59e0b' : colors.navy }}
              >
                {form.password ? (
                  <><X className="h-3.5 w-3.5" /> {t('register.clearPassword')}</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> {t('register.generatePassword')}</>
                )}
              </button>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={
                  loading || 
                  !form.rol ||
                  !form.email?.trim() ||
                  !form.nombre_completo?.trim() ||
                  !form.cuit_cliente?.trim() ||
                  !taxIdValidation.valid ||
                  !form.telefono?.trim() ||
                  (form.codigoTelManual && (!form.codigo_telefono || !form.codigo_telefono.startsWith('+'))) ||
                  !form.password ||
                  form.password !== form.confirmPassword ||
                  form.password.length < 8 ||
                  !/[A-Z]/.test(form.password) ||
                  !/[0-9]/.test(form.password) ||
                  !/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ||
                  (form.rol === 'cliente_admin' && !empresaEncontrada && !form.razon_social_manual?.trim()) ||
                  (form.rol === 'cliente_usuario' && !adminExiste)
                }
                className="w-full py-3.5 rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.crimson} 0%, ${colors.crimsonHover} 100%)`,
                }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('register.createAccount')}
              </button>
            </>
          )}
          
          {/* Separador y volver */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors hover:underline"
              style={{ color: colors.navy }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('register.backToLogin')}
            </button>
          </div>
        </form>
        
        {/* Espacio inferior */}
        <div className="h-8" />
      </div>
    </div>
  )
}

export default RegisterPage

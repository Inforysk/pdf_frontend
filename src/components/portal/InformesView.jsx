// ===============================
// INFORMES VIEW - PORTAL CLIENTE
// Sistema de Packs de Informes Prepagos
// ===============================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  FileText, Package, ShoppingCart, CreditCard, History,
  CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  Zap, Clock, RefreshCw, Sparkles, TrendingUp, X,
  BarChart3, PieChart, Activity, ArrowUpRight, ArrowDownRight,
  Lock, Code2, Ticket
} from 'lucide-react'

const REPORT_TYPES = {
  completo: { 
    label: 'Informe Completo', 
    icon: Zap, 
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-600',
    desc: 'Análisis detallado con scoring'
  },
  reducido: { 
    label: 'Informe Reducido', 
    icon: FileText, 
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    desc: 'Datos básicos y resumen'
  },
  historico: { 
    label: 'Informe Histórico', 
    icon: Clock, 
    color: 'purple',
    gradient: 'from-purple-500 to-pink-600',
    desc: 'Evolución y trayectoria'
  },
  actualizado: { 
    label: 'Informe Actualizado', 
    icon: RefreshCw, 
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    desc: 'Datos más recientes'
  },
  api: { 
    label: 'Informe API', 
    icon: Code2, 
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    desc: 'Consultas vía API'
  }
}

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', ARS: '$', MXN: '$' }

const PAYMENT_METHODS = [
  { id: 'card', label: 'Tarjeta de Crédito/Débito', icon: '💳', desc: 'Visa, Mastercard, AMEX' },
  { id: 'transfer', label: 'Transferencia Bancaria', icon: '🏦', desc: 'CBU/CVU - Acreditación en 24hs' },
  { id: 'mercadopago', label: 'MercadoPago', icon: '🔵', desc: 'Todas las opciones de MP' },
]

export default function InformesView({ isAdmin = true }) {
  const { user } = useAuth()
  const isClienteAdmin = user?.rol === 'cliente_admin' // Solo cliente_admin puede comprar packs
  
  const [balance, setBalance] = useState({})
  const [packages, setPackages] = useState([])
  const [packagesByType, setPackagesByType] = useState({})
  const [history, setHistory] = useState([])
  const [purchases, setPurchases] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedType, setSelectedType] = useState(null)
  const [purchasing, setPurchasing] = useState(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [checkoutStep, setCheckoutStep] = useState(1) // 1: selección, 2: datos, 3: procesando, 4: éxito
  const [billingData, setBillingData] = useState({ nombre: '', email: '', telefono: '' })
  
  // Estados para cupones
  const [couponCode, setCouponCode] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, type, value, discount_amount }
  const [couponError, setCouponError] = useState('')
  
  // Estados para pack personalizado
  const [unitPrices, setUnitPrices] = useState({})
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customType, setCustomType] = useState('completo')
  const [customQuantity, setCustomQuantity] = useState(1)
  const [customCheckoutMode, setCustomCheckoutMode] = useState(false) // Para saber si el checkout es personalizado

  // Detectar si se navega con parámetro tienda=1 y tipo para abrir directamente la tienda filtrada
  useEffect(() => {
    const checkTiendaParam = () => {
      const hash = window.location.hash
      if (hash.includes('tienda=1') && isClienteAdmin) {
        setActiveTab('balance')
        // Extraer el tipo si viene en la URL
        const tipoMatch = hash.match(/tipo=([a-z]+)/)
        if (tipoMatch && REPORT_TYPES[tipoMatch[1]]) {
          setSelectedType(tipoMatch[1])
        }
        // Limpiar el parámetro de la URL
        window.history.replaceState(null, '', '#informes')
      }
    }
    
    // Verificar al montar
    checkTiendaParam()
    
    // Escuchar cambios de hash
    window.addEventListener('hashchange', checkTiendaParam)
    return () => window.removeEventListener('hashchange', checkTiendaParam)
  }, [isClienteAdmin])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [balRes, pkgRes, histRes, purchRes, statsRes, pricesRes] = await Promise.allSettled([
        axios.get('/api/portal/reports/balance'),
        axios.get('/api/portal/reports/packages'),
        axios.get('/api/portal/reports/history'),
        axios.get('/api/portal/reports/purchases'),
        axios.get('/api/portal/reports/stats'),
        axios.get('/api/portal/reports/unit-prices')
      ])

      if (balRes.status === 'fulfilled' && balRes.value.data.success) {
        setBalance(balRes.value.data.balance)
      }
      if (pkgRes.status === 'fulfilled' && pkgRes.value.data.success) {
        setPackages(pkgRes.value.data.packages)
        setPackagesByType(pkgRes.value.data.by_type || {})
      }
      if (histRes.status === 'fulfilled' && histRes.value.data.success) {
        setHistory(histRes.value.data.history || [])
      }
      if (purchRes.status === 'fulfilled' && purchRes.value.data.success) {
        setPurchases(purchRes.value.data.purchases || [])
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setStats(statsRes.value.data.stats)
      }
      if (pricesRes.status === 'fulfilled' && pricesRes.value.data.success) {
        const pricesMap = {}
        pricesRes.value.data.prices.forEach(p => {
          pricesMap[p.report_type] = p
        })
        setUnitPrices(pricesMap)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
    setLoading(false)
  }

  const openPurchaseModal = (pack) => {
    setCustomCheckoutMode(false) // No es personalizado
    setShowPurchaseModal(pack)
    setCheckoutStep(1)
    setPaymentMethod('card')
    setBillingData({ nombre: '', email: '', telefono: '' })
    // Reset coupon states
    setCouponCode('')
    setAppliedCoupon(null)
    setCouponError('')
  }

  const closePurchaseModal = () => {
    setShowPurchaseModal(null)
    setCheckoutStep(1)
    setPurchasing(null)
    setCustomCheckoutMode(false)
    // Reset coupon states
    setCouponCode('')
    setAppliedCoupon(null)
    setCouponError('')
  }
  
  // Función para validar cupón
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Ingresa un código de cupón')
      return
    }
    
    const pack = showPurchaseModal
    if (!pack) return
    
    setValidatingCoupon(true)
    setCouponError('')
    
    try {
      const res = await axios.post('/api/portal/coupons/validate', {
        code: couponCode.trim().toUpperCase(),
        purchase_type: 'report_pack',
        amount: pack.precio
      })
      
      if (res.data.success && res.data.valid) {
        setAppliedCoupon({
          code: res.data.coupon.code,
          type: res.data.coupon.type,
          value: res.data.coupon.value,
          discount_amount: res.data.discount_amount,
          final_amount: res.data.final_amount
        })
        setCouponCode('')
        toast.success(`¡Cupón ${res.data.coupon.code} aplicado!`)
      } else {
        setCouponError(res.data.error || 'Cupón no válido')
        setAppliedCoupon(null)
      }
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Error validando cupón')
      setAppliedCoupon(null)
    }
    setValidatingCoupon(false)
  }
  
  // Remover cupón aplicado
  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  // Funciones para pack personalizado
  const openCustomModal = () => {
    setShowCustomModal(true)
    setCustomType('completo')
    setCustomQuantity(1)
  }

  const closeCustomModal = () => {
    setShowCustomModal(false)
  }

  const getCustomPrice = () => {
    const price = unitPrices[customType]?.precio_unitario || 0
    return (price * customQuantity).toFixed(2)
  }

  // Iniciar checkout del pack personalizado (abre el modal de pago)
  const startCustomCheckout = () => {
    if (customQuantity < 1 || customQuantity > 1000) {
      toast.error('Cantidad debe estar entre 1 y 1000')
      return
    }
    
    // Crear un "pack virtual" con los datos personalizados
    const customPack = {
      id: null, // Sin ID porque es personalizado
      nombre: `Pack Personalizado`,
      report_type: customType,
      quantity: customQuantity,
      precio: parseFloat(getCustomPrice()),
      precio_original: null,
      currency_code: unitPrices[customType]?.currency_code || 'USD',
      isCustom: true // Marcador para saber que es personalizado
    }
    
    setShowCustomModal(false)
    setCustomCheckoutMode(true)
    setShowPurchaseModal(customPack)
    setCheckoutStep(1)
    setPaymentMethod('card')
    setBillingData({ nombre: '', email: '', telefono: '' })
    // Reset coupon states
    setCouponCode('')
    setAppliedCoupon(null)
    setCouponError('')
  }

  // Procesar compra (tanto pack normal como personalizado)
  const handlePurchase = async (packOrId) => {
    setCheckoutStep(3) // Procesando
    
    const pack = showPurchaseModal
    const isCustom = pack?.isCustom || customCheckoutMode
    
    // Simular delay de procesamiento de pago
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    try {
      let res
      // Calcular precio final considerando cupón
      const finalPrice = appliedCoupon ? appliedCoupon.final_amount : pack.precio
      
      if (isCustom) {
        // Compra personalizada
        res = await axios.post('/api/portal/reports/purchase-custom', {
          report_type: pack.report_type,
          quantity: pack.quantity,
          payment_method: paymentMethod,
          billing_data: billingData,
          coupon_code: appliedCoupon?.code || null,
          final_price: finalPrice
        })
      } else {
        // Compra de pack normal
        res = await axios.post('/api/portal/reports/purchase', { 
          package_id: pack.id,
          payment_method: paymentMethod,
          billing_data: billingData,
          coupon_code: appliedCoupon?.code || null,
          final_price: finalPrice
        })
      }
      
      // Si la compra fue exitosa y había cupón, registrar el uso
      if (res.data.success && appliedCoupon) {
        try {
          await axios.post('/api/portal/coupons/apply', {
            code: appliedCoupon.code,
            purchase_type: 'report_pack',
            original_amount: pack.precio,
            discount_amount: appliedCoupon.discount_amount,
            final_amount: finalPrice,
            reference_id: res.data.purchase_id || null
          })
        } catch (couponErr) {
          console.error('Error registrando uso de cupón:', couponErr)
        }
      }
      
      if (res.data.success) {
        setCheckoutStep(4) // Éxito
        await new Promise(resolve => setTimeout(resolve, 1500))
        const discountMsg = appliedCoupon ? ` (ahorraste $${appliedCoupon.discount_amount.toFixed(2)})` : ''
        toast.success((res.data.message || '¡Compra exitosa!') + discountMsg)
        closePurchaseModal()
        loadData()
      } else {
        setCheckoutStep(2)
        toast.error(res.data.error || 'Error en la compra')
      }
    } catch (err) {
      setCheckoutStep(2)
      toast.error(err.response?.data?.error || 'Error al procesar la compra')
    }
    setPurchasing(null)
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('es', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
  }

  const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code] || '$'

  const totalDisponibles = Object.values(balance).reduce((sum, b) => sum + (b.balance || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            Tienda de Packs
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Compra packs de créditos y úsalos para solicitar informes
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Balance Total Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Informes disponibles</p>
            <p className="text-3xl sm:text-4xl font-bold">{totalDisponibles}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
        </div>
        
        {/* Balance por tipo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(REPORT_TYPES).map(([type, config]) => {
            const Icon = config.icon
            const bal = balance[type]?.balance || 0
            return (
              <div key={type} className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-white/80" />
                  <span className="text-xs text-white/80 font-medium">{config.label.replace('Informe ', '')}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{bal}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'balance', label: 'Tienda de Packs', icon: ShoppingCart },
          { id: 'history', label: 'Historial', icon: History },
          { id: 'purchases', label: 'Compras', icon: CreditCard },
        ].filter(tab => tab.id !== 'balance' || isClienteAdmin).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Resumen rápido */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    Activo
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalDisponibles}</p>
                <p className="text-xs text-gray-500">Créditos disponibles</p>
              </div>
              
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <PieChart className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.consumos_mes_actual || 0}</p>
                <p className="text-xs text-gray-500">Usados este mes</p>
              </div>
              
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <History className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_consumos || 0}</p>
                <p className="text-xs text-gray-500">Total consumidos</p>
              </div>
              
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">${stats?.total_pagado?.toFixed(0) || 0}</p>
                <p className="text-xs text-gray-500">Total invertido</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-white/80" />
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    Ahorro
                  </span>
                </div>
                <p className="text-2xl font-bold">${stats?.total_ahorrado?.toFixed(0) || 0}</p>
                <p className="text-xs text-white/80">Total ahorrado</p>
              </div>
            </div>

            {/* Distribución por tipo */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Consumos por tipo */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-500" />
                  Consumos por tipo
                </h3>
                <div className="space-y-3">
                  {Object.entries(REPORT_TYPES).map(([type, config]) => {
                    const Icon = config.icon
                    const count = stats?.consumos_por_tipo?.[type] || 0
                    const total = stats?.total_consumos || 1
                    const percent = Math.round((count / total) * 100) || 0
                    
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 text-${config.color}-500`} />
                            <span className="text-sm text-gray-700">{config.label.replace('Informe ', '')}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-${config.color}-500 rounded-full transition-all`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Balance actual */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-500" />
                  Balance actual
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(REPORT_TYPES).map(([type, config]) => {
                    const Icon = config.icon
                    const bal = balance[type]?.balance || 0
                    
                    return (
                      <div key={type} className={`p-3 rounded-xl bg-${config.color}-50 border border-${config.color}-100`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 text-${config.color}-600`} />
                          <span className={`text-xs font-medium text-${config.color}-700`}>{config.label.replace('Informe ', '')}</span>
                        </div>
                        <p className={`text-2xl font-bold text-${config.color}-700`}>{bal}</p>
                      </div>
                    )
                  })}
                </div>
                
                {totalDisponibles === 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Sin informes disponibles</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('balance')}
                      className="mt-2 text-sm text-amber-700 underline hover:no-underline"
                    >
                      Comprar ahora →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actividad reciente */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Actividad reciente
                </h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Ver todo →
                </button>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 5).map(item => {
                    const typeConfig = REPORT_TYPES[item.report_type] || REPORT_TYPES.completo
                    const Icon = typeConfig.icon
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-lg bg-${typeConfig.color}-100`}>
                          <Icon className={`h-4 w-4 text-${typeConfig.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.razon_social || item.cuit}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.used_at)}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                          {typeConfig.label.replace('Informe ', '')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'balance' && isClienteAdmin && (
          <motion.div
            key="balance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Tipo selector */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !selectedType 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {Object.entries(REPORT_TYPES).map(([type, config]) => {
                // Clases específicas para evitar problemas de Tailwind con clases dinámicas
                const colorClasses = {
                  completo: 'bg-indigo-600',
                  reducido: 'bg-blue-600',
                  historico: 'bg-purple-600',
                  actualizado: 'bg-orange-600',
                  api: 'bg-emerald-600'
                }
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedType === type 
                        ? `${colorClasses[type]} text-white` 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {config.label.replace('Informe ', '')}
                  </button>
                )
              })}
            </div>

            {/* Packs Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tarjeta Pack Personalizado - SIEMPRE PRIMERO */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden shadow-sm hover:shadow-lg hover:border-gray-400 transition cursor-pointer"
                onClick={openCustomModal}
              >
                <div className="bg-gradient-to-r from-gray-600 to-gray-800 p-4">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-sm font-medium opacity-90">
                      Personalizado
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-2">Pack a Medida</h3>
                </div>
                
                <div className="p-5">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-gray-900">
                      Elige cantidad
                    </span>
                  </div>
                  
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mb-3">
                    <Zap className="h-3 w-3" />
                    Sin mínimo
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    Compra exactamente la cantidad que necesitas de cualquier tipo
                  </p>
                  
                  <button
                    className="w-full py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Crear Pack
                  </button>
                </div>
              </motion.div>

              {/* Packs predefinidos */}
              {packages
                .filter(p => !selectedType || p.report_type === selectedType)
                .map(pack => {
                  const typeConfig = REPORT_TYPES[pack.report_type] || REPORT_TYPES.completo
                  const Icon = typeConfig.icon
                  const ahorro = pack.precio_original ? (pack.precio_original - pack.precio) : 0
                  
                  return (
                    <motion.div
                      key={pack.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition"
                    >
                      <div className={`bg-gradient-to-r ${typeConfig.gradient} p-4`}>
                        <div className="flex items-center gap-2 text-white">
                          <Icon className="h-5 w-5" />
                          <span className="text-sm font-medium opacity-90">
                            {typeConfig.label}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mt-2">{pack.nombre}</h3>
                      </div>
                      
                      <div className="p-5">
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold text-gray-900">
                            {getCurrencySymbol(pack.currency_code)}{pack.precio}
                          </span>
                          {pack.precio_original && (
                            <span className="text-lg text-gray-400 line-through">
                              {getCurrencySymbol(pack.currency_code)}{pack.precio_original}
                            </span>
                          )}
                        </div>
                        
                        {ahorro > 0 && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mb-3">
                            <TrendingUp className="h-3 w-3" />
                            Ahorras {getCurrencySymbol(pack.currency_code)}{ahorro.toFixed(2)}
                          </div>
                        )}
                        
                        <p className="text-gray-600 text-sm mb-4">
                          <span className="font-semibold text-gray-900">{pack.quantity}</span> informes {pack.report_type}s
                        </p>
                        
                        <button
                          onClick={() => openPurchaseModal(pack)}
                          className={`w-full py-2.5 bg-gradient-to-r ${typeConfig.gradient} text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Comprar
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
            </div>

            {packages.filter(p => !selectedType || p.report_type === selectedType).length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay packs disponibles para este tipo</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {history.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Sin informes generados aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium">CUIT/ID</th>
                        <th className="px-4 py-3 text-left font-medium">Empresa</th>
                        <th className="px-4 py-3 text-left font-medium">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map(item => {
                        const typeConfig = REPORT_TYPES[item.report_type] || REPORT_TYPES.completo
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">{formatDate(item.used_at)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                                {typeConfig.label.replace('Informe ', '')}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-blue-600">{item.cuit}</td>
                            <td className="px-4 py-3 text-gray-900">{item.razon_social || '-'}</td>
                            <td className="px-4 py-3 text-gray-500">{item.usuario_nombre || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'purchases' && (
          <motion.div
            key="purchases"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {purchases.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Sin compras registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {purchases.map(p => {
                    const typeConfig = REPORT_TYPES[p.report_type] || REPORT_TYPES.completo
                    return (
                      <div key={p.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-${typeConfig.color}-100`}>
                              <Package className={`h-5 w-5 text-${typeConfig.color}-600`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{p.package_nombre}</p>
                              <p className="text-xs text-gray-500">{formatDate(p.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {getCurrencySymbol(p.currency_code)}{parseFloat(p.total_paid).toFixed(2)}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              +{p.quantity} informes
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Checkout Mejorado */}
      <AnimatePresence>
        {showPurchaseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => checkoutStep < 3 && closePurchaseModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const pack = showPurchaseModal
                const typeConfig = REPORT_TYPES[pack.report_type] || REPORT_TYPES.completo
                const Icon = typeConfig.icon
                const ahorro = pack.precio_original ? (pack.precio_original - pack.precio) : 0
                
                return (
                  <>
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${typeConfig.gradient} p-5 text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-white/20 rounded-xl">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-white/80 text-xs uppercase tracking-wide">Checkout</p>
                            <h3 className="text-lg font-bold">{pack.nombre}</h3>
                          </div>
                        </div>
                        {checkoutStep < 3 && (
                          <button
                            onClick={closePurchaseModal}
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      
                      {/* Progress steps */}
                      <div className="flex items-center gap-2 mt-4">
                        {[1, 2, 3].map(step => (
                          <div key={step} className="flex items-center flex-1">
                            <div className={`h-1.5 flex-1 rounded-full transition ${
                              step <= checkoutStep ? 'bg-white' : 'bg-white/30'
                            }`} />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-5">
                      {/* Step 1: Selección de método de pago */}
                      {checkoutStep === 1 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900">Método de pago</h4>
                          <div className="space-y-2">
                            {PAYMENT_METHODS.map(method => (
                              <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition flex items-center gap-4 ${
                                  paymentMethod === method.id
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <span className="text-2xl">{method.icon}</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{method.label}</p>
                                  <p className="text-xs text-gray-500">{method.desc}</p>
                                </div>
                                {paymentMethod === method.id && (
                                  <CheckCircle className="h-5 w-5 text-indigo-600" />
                                )}
                              </button>
                            ))}
                          </div>
                          
                          {/* Campo de cupón */}
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Ticket className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-gray-700">¿Tienes un cupón de descuento?</span>
                            </div>
                            {!appliedCoupon ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={couponCode}
                                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                  placeholder="Ingresa el código"
                                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none ${
                                    couponError ? 'border-red-300' : 'border-gray-200'
                                  }`}
                                />
                                <button
                                  onClick={validateCoupon}
                                  disabled={validatingCoupon || !couponCode.trim()}
                                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">
                                    Cupón <code className="bg-green-100 px-1.5 py-0.5 rounded">{appliedCoupon.code}</code> aplicado
                                  </span>
                                </div>
                                <button
                                  onClick={removeCoupon}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Quitar
                                </button>
                              </div>
                            )}
                            {couponError && (
                              <p className="text-xs text-red-500 mt-1">{couponError}</p>
                            )}
                          </div>
                          
                          {/* Resumen */}
                          <div className="bg-gray-50 rounded-xl p-4 space-y-2 mt-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{pack.quantity} informes {pack.report_type}</span>
                              <span className="text-gray-900">{getCurrencySymbol(pack.currency_code)}{pack.precio_original || pack.precio}</span>
                            </div>
                            {ahorro > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento pack</span>
                                <span>-{getCurrencySymbol(pack.currency_code)}{ahorro.toFixed(2)}</span>
                              </div>
                            )}
                            {appliedCoupon && (
                              <div className="flex justify-between text-sm text-purple-600">
                                <span className="flex items-center gap-1">
                                  <Ticket className="h-3 w-3" />
                                  Cupón {appliedCoupon.code}
                                  <span className="text-xs text-purple-500">
                                    ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `$${appliedCoupon.value}`})
                                  </span>
                                </span>
                                <span>-{getCurrencySymbol(pack.currency_code)}{appliedCoupon.discount_amount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="border-t pt-2 flex justify-between">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="text-xl font-bold text-gray-900">
                                {getCurrencySymbol(pack.currency_code)}{appliedCoupon ? appliedCoupon.final_amount.toFixed(2) : pack.precio}
                              </span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setCheckoutStep(2)}
                            className={`w-full py-3 bg-gradient-to-r ${typeConfig.gradient} text-white rounded-xl font-medium hover:opacity-90 transition`}
                          >
                            Continuar
                          </button>
                        </div>
                      )}
                      
                      {/* Step 2: Datos de facturación */}
                      {checkoutStep === 2 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900">Datos de facturación</h4>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Nombre completo</label>
                              <input
                                type="text"
                                value={billingData.nombre}
                                onChange={e => setBillingData({...billingData, nombre: e.target.value})}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Juan Pérez"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Email</label>
                              <input
                                type="email"
                                value={billingData.email}
                                onChange={e => setBillingData({...billingData, email: e.target.value})}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="juan@empresa.com"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Teléfono (opcional)</label>
                              <input
                                type="tel"
                                value={billingData.telefono}
                                onChange={e => setBillingData({...billingData, telefono: e.target.value})}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="+54 11 1234-5678"
                              />
                            </div>
                          </div>
                          
                          {/* Método seleccionado */}
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <span className="text-xl">{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                              </p>
                            </div>
                            <button 
                              onClick={() => setCheckoutStep(1)}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Cambiar
                            </button>
                          </div>
                          
                          <div className="flex gap-3">
                            <button
                              onClick={() => setCheckoutStep(1)}
                              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                            >
                              Atrás
                            </button>
                            <button
                              onClick={() => handlePurchase(pack.id)}
                              className={`flex-1 py-3 bg-gradient-to-r ${typeConfig.gradient} text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2`}
                            >
                              Pagar {getCurrencySymbol(pack.currency_code)}{appliedCoupon ? appliedCoupon.final_amount.toFixed(2) : pack.precio}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Step 3: Procesando */}
                      {checkoutStep === 3 && (
                        <div className="py-8 text-center">
                          <div className="relative inline-block">
                            <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl">{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.icon}</span>
                            </div>
                          </div>
                          <h4 className="mt-4 text-lg font-semibold text-gray-900">Procesando pago...</h4>
                          <p className="text-sm text-gray-500 mt-1">Por favor no cierres esta ventana</p>
                        </div>
                      )}
                      
                      {/* Step 4: Éxito */}
                      {checkoutStep === 4 && (
                        <div className="py-8 text-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4"
                          >
                            <CheckCircle className="h-10 w-10 text-green-600" />
                          </motion.div>
                          <h4 className="text-lg font-semibold text-gray-900">¡Compra exitosa!</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Se han acreditado {pack.quantity} informes a tu cuenta
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Pack Personalizado */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeCustomModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-600 to-gray-800 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white/80 text-xs uppercase tracking-wide">Personalizado</p>
                      <h3 className="text-lg font-bold">Pack a Medida</h3>
                    </div>
                  </div>
                  <button
                    onClick={closeCustomModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 space-y-5">
                {/* Selector de tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de informe
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(REPORT_TYPES).map(([type, config]) => {
                      const Icon = config.icon
                      const gradientClasses = {
                        completo: 'from-indigo-500 to-purple-600',
                        reducido: 'from-blue-500 to-cyan-600',
                        historico: 'from-purple-500 to-pink-600',
                        actualizado: 'from-orange-500 to-amber-600',
                        api: 'from-emerald-500 to-teal-600'
                      }
                      return (
                        <button
                          key={type}
                          onClick={() => setCustomType(type)}
                          className={`p-3 rounded-xl border-2 transition flex items-center gap-2 ${
                            customType === type
                              ? 'border-gray-800 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`p-1.5 bg-gradient-to-r ${gradientClasses[type]} rounded-lg`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{config.label.replace('Informe ', '')}</p>
                            <p className="text-xs text-gray-500">${unitPrices[type]?.precio_unitario || 0} c/u</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Selector de cantidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de informes
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                      disabled={customQuantity <= 1}
                    >
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={customQuantity}
                      onChange={e => setCustomQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                      className="flex-1 text-center text-2xl font-bold py-2 border rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                    <button
                      onClick={() => setCustomQuantity(Math.min(1000, customQuantity + 1))}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                      disabled={customQuantity >= 1000}
                    >
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                  
                  {/* Botones rápidos */}
                  <div className="flex gap-2 mt-2">
                    {[1, 5, 10, 25, 50].map(qty => (
                      <button
                        key={qty}
                        onClick={() => setCustomQuantity(qty)}
                        className={`flex-1 py-1.5 text-sm rounded-lg transition ${
                          customQuantity === qty
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Resumen */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {customQuantity} x {REPORT_TYPES[customType]?.label || 'Informe'}
                    </span>
                    <span className="text-gray-600">
                      ${unitPrices[customType]?.precio_unitario || 0} c/u
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total a pagar</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${getCustomPrice()}
                    </span>
                  </div>
                </div>
                
                {/* Botón continuar al checkout */}
                <button
                  onClick={startCustomCheckout}
                  className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Continuar al pago - ${getCustomPrice()}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

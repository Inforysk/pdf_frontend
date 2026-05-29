import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  X, Check, Loader2, Star, Zap, Crown, ArrowRight, AlertCircle,
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users, Package,
  Globe, Plus, Minus, ChevronDown, ChevronUp, Sparkles, TrendingUp, Shield
} from 'lucide-react'

// Iconos para productos
const PRODUCT_ICONS = {
  INFORMES_COMERCIALES: FileText,
  API_ACCESS: Code,
  API_SCORING: BarChart3,
  MONITOREO_EMPRESAS: Eye,
  ALERTAS_MONITOREO: Bell,
  BOLETIN_OFICIAL: Newspaper,
  EXPORTACION_DATOS: Download,
  USUARIOS_ADICIONALES: Users,
}

// Iconos para planes
const PLAN_ICONS = {
  Basic: Zap,
  Professional: Star,
  Business: TrendingUp,
  Enterprise: Crown,
}

const PLAN_COLORS = {
  Basic: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-600' },
  Professional: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-600' },
  Business: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-600' },
  Enterprise: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-600' },
}

// Lista de países disponibles para informes
const PAISES_DISPONIBLES = [
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷' },
  { codigo: 'BR', nombre: 'Brasil', bandera: '🇧🇷' },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱' },
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴' },
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽' },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪' },
  { codigo: 'UY', nombre: 'Uruguay', bandera: '🇺🇾' },
  { codigo: 'EC', nombre: 'Ecuador', bandera: '🇪🇨' },
  { codigo: 'PY', nombre: 'Paraguay', bandera: '🇵🇾' },
  { codigo: 'BO', nombre: 'Bolivia', bandera: '🇧🇴' },
  { codigo: 'VE', nombre: 'Venezuela', bandera: '🇻🇪' },
  { codigo: 'PA', nombre: 'Panamá', bandera: '🇵🇦' },
  { codigo: 'CR', nombre: 'Costa Rica', bandera: '🇨🇷' },
  { codigo: 'GT', nombre: 'Guatemala', bandera: '🇬🇹' },
  { codigo: 'DO', nombre: 'Rep. Dominicana', bandera: '🇩🇴' },
  { codigo: 'HN', nombre: 'Honduras', bandera: '🇭🇳' },
  { codigo: 'JM', nombre: 'Jamaica', bandera: '🇯🇲' },
]

export default function AmpliarPlanModal({ isOpen, onClose, planActual }) {
  const [planes, setPlanes] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [personalizacion, setPersonalizacion] = useState({})
  const [paisesSeleccionados, setPaisesSeleccionados] = useState([])
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('planes') // planes, personalizar, paises
  const [expandedProducts, setExpandedProducts] = useState({})

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setSuccess(false)
      setError(null)
      setSelectedPlan(null)
      setPersonalizacion({})
      setPaisesSeleccionados([])
      setNotas('')
      setActiveTab('planes')
      
      // Cargar planes con productos
      axios.get('/api/portal/planes/comparar')
        .then(r => {
          if (r.data.success) {
            setPlanes(r.data.planes || [])
            setProductos(r.data.productos || [])
          }
        })
        .catch(() => setError('Error al cargar los planes'))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    
    try {
      const payload = {
        plan_id: selectedPlan?.id,
        personalizacion: Object.keys(personalizacion).length > 0 ? personalizacion : null,
        paises: paisesSeleccionados.length > 0 ? paisesSeleccionados : null,
        notas
      }
      
      const res = await axios.post('/api/portal/solicitar-plan-personalizado', payload)
      
      if (res.data.success) {
        setSuccess(true)
      } else {
        setError(res.data.error || 'Error al procesar la solicitud')
      }
    } catch (err) {
      // Fallback al endpoint original si no existe el nuevo
      try {
        const res = await axios.post('/api/portal/cambiar-plan', {
          plan_id: selectedPlan?.id,
          notas: `${notas}\n\nPersonalización: ${JSON.stringify(personalizacion)}\nPaíses: ${paisesSeleccionados.join(', ')}`
        })
        if (res.data.success) {
          setSuccess(true)
        } else {
          setError(res.data.error || 'Error al procesar la solicitud')
        }
      } catch (e) {
        setError(e.response?.data?.error || 'Error de conexión')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const toggleProducto = (codigo, planId) => {
    setPersonalizacion(prev => {
      const key = `${codigo}_incluido`
      const current = prev[key]
      if (current === undefined) {
        // Si no está personalizado, activar
        return { ...prev, [key]: true, [`${codigo}_cantidad`]: 50 }
      }
      // Toggle
      return { ...prev, [key]: !current }
    })
  }

  const updateCantidad = (codigo, delta) => {
    setPersonalizacion(prev => {
      const key = `${codigo}_cantidad`
      const current = prev[key] || 50
      const newVal = Math.max(10, current + delta)
      return { ...prev, [key]: newVal }
    })
  }

  const togglePais = (codigo) => {
    setPaisesSeleccionados(prev => 
      prev.includes(codigo) 
        ? prev.filter(p => p !== codigo)
        : [...prev, codigo]
    )
  }

  if (!isOpen) return null

  const planActualId = planActual?.id || planActual?.plan_id

  // Calcular resumen de personalización
  const tienePersonalizacion = Object.keys(personalizacion).some(k => k.endsWith('_incluido') && personalizacion[k])
  const tienePaises = paisesSeleccionados.length > 0

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative min-h-screen flex items-center justify-center p-2 sm:p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Ampliar tu plan
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {planActual ? `Plan actual: ${planActual.nombre || planActual.plan_nombre}` : 'Elige el plan perfecto para tu negocio'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            {[
              { id: 'planes', label: 'Comparar Planes', icon: Package },
              { id: 'personalizar', label: 'Personalizar Módulos', icon: Sparkles },
              { id: 'paises', label: 'Países e Informes', icon: Globe },
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : success ? (
              <SuccessMessage selectedPlan={selectedPlan} personalizacion={personalizacion} paises={paisesSeleccionados} onClose={onClose} />
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Tab: Comparar Planes */}
                {activeTab === 'planes' && (
                  <PlanesComparativa 
                    planes={planes}
                    productos={productos}
                    planActualId={planActualId}
                    selectedPlan={selectedPlan}
                    onSelectPlan={setSelectedPlan}
                  />
                )}

                {/* Tab: Personalizar Módulos */}
                {activeTab === 'personalizar' && (
                  <PersonalizarModulos
                    productos={productos}
                    planes={planes}
                    selectedPlan={selectedPlan}
                    personalizacion={personalizacion}
                    onToggleProducto={toggleProducto}
                    onUpdateCantidad={updateCantidad}
                    expandedProducts={expandedProducts}
                    setExpandedProducts={setExpandedProducts}
                  />
                )}

                {/* Tab: Países */}
                {activeTab === 'paises' && (
                  <PaisesSelection
                    paises={PAISES_DISPONIBLES}
                    seleccionados={paisesSeleccionados}
                    onToggle={togglePais}
                  />
                )}

                {/* Notas */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💬 Notas o requerimientos especiales
                  </label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Cuéntanos tus necesidades específicas: facturación especial, volumen esperado, integraciones..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder-gray-400"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer con resumen */}
          {!loading && !success && (
            <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
              {/* Resumen */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {selectedPlan && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <Package className="h-4 w-4" />
                    Plan: {selectedPlan.nombre}
                  </div>
                )}
                {tienePersonalizacion && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm">
                    <Sparkles className="h-4 w-4" />
                    Módulos extra
                  </div>
                )}
                {tienePaises && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm">
                    <Globe className="h-4 w-4" />
                    {paisesSeleccionados.length} países
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={(!selectedPlan && !tienePersonalizacion && !tienePaises) || submitting}
                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    (selectedPlan || tienePersonalizacion || tienePaises) && !submitting
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Solicitar cotización
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE: Comparativa de Planes
// ============================================
function PlanesComparativa({ planes, productos, planActualId, selectedPlan, onSelectPlan }) {
  return (
    <div className="space-y-6">
      {/* Grid de planes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planes.map(plan => {
          const Icon = PLAN_ICONS[plan.nombre] || Zap
          const colors = PLAN_COLORS[plan.nombre] || PLAN_COLORS.Basic
          const isCurrentPlan = plan.id === planActualId
          const isSelected = selectedPlan?.id === plan.id
          
          return (
            <div
              key={plan.id}
              onClick={() => !isCurrentPlan && onSelectPlan(plan)}
              className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                isCurrentPlan
                  ? 'border-gray-300 bg-gray-100 cursor-default'
                  : isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200 shadow-xl'
                  : `${colors.border} hover:shadow-lg hover:scale-[1.02]`
              }`}
            >
              {/* Badge */}
              {isCurrentPlan && (
                <div className="absolute top-0 left-0 right-0 bg-gray-600 text-white text-xs font-medium text-center py-1">
                  Tu plan actual
                </div>
              )}
              {isSelected && !isCurrentPlan && (
                <div className={`absolute top-0 left-0 right-0 ${colors.badge} text-white text-xs font-medium text-center py-1`}>
                  ✓ Seleccionado
                </div>
              )}
              
              <div className={`p-4 pt-${isCurrentPlan || isSelected ? '8' : '4'}`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.nombre}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">${plan.precio_mensual}</span>
                      <span className="text-sm text-gray-500">/mes</span>
                    </div>
                  </div>
                </div>

                {/* Créditos */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>{plan.creditos_mes}</strong> créditos/mes
                  </span>
                </div>

                {/* Productos incluidos - solo mostrar los que están activos */}
                <div className="space-y-1.5 text-xs">
                  {[...productos]
                    .filter(prod => plan.productos?.[prod.codigo]?.incluido) // Solo incluidos
                    .map(prod => {
                    const config = plan.productos?.[prod.codigo]
                    const limite = config?.limite
                    const IconProd = PRODUCT_ICONS[prod.codigo] || Package
                    
                    return (
                      <div 
                        key={prod.codigo}
                        className="flex items-center gap-2 text-gray-700"
                      >
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <IconProd className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{prod.nombre}</span>
                        {limite > 0 && (
                          <span className="ml-auto text-gray-500">{limite === -1 ? '∞' : limite}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla comparativa detallada */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Comparativa detallada de módulos
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-700">Módulo</th>
                {planes.map(plan => (
                  <th key={plan.id} className="text-center p-3 font-medium text-gray-700 min-w-[100px]">
                    {plan.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...productos]
                .filter(prod => {
                  // Solo mostrar productos que están incluidos en al menos un plan
                  return planes.some(p => p.productos?.[prod.codigo]?.incluido)
                })
                .sort((a, b) => {
                  // Contar en cuántos planes está incluido cada producto
                  const aCount = planes.filter(p => p.productos?.[a.codigo]?.incluido).length
                  const bCount = planes.filter(p => p.productos?.[b.codigo]?.incluido).length
                  return bCount - aCount // Más incluidos primero
                })
                .map(prod => {
                const IconProd = PRODUCT_ICONS[prod.codigo] || Package
                return (
                  <tr key={prod.codigo} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <IconProd className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{prod.nombre}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{prod.unidad}/mes</p>
                    </td>
                    {planes.map(plan => {
                      const config = plan.productos?.[prod.codigo]
                      const incluido = config?.incluido
                      const limite = config?.limite
                      
                      return (
                        <td key={plan.id} className="text-center p-3">
                          {incluido ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                limite === -1 || limite > 500 
                                  ? 'bg-green-100 text-green-700' 
                                  : limite > 100 
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {limite === -1 ? '∞' : limite}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE: Personalizar Módulos
// ============================================
function PersonalizarModulos({ productos, planes, selectedPlan, personalizacion, onToggleProducto, onUpdateCantidad, expandedProducts, setExpandedProducts }) {
  const toggleExpand = (codigo) => {
    setExpandedProducts(prev => ({ ...prev, [codigo]: !prev[codigo] }))
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Personaliza tu plan
        </h4>
        <p className="text-sm text-purple-700 mt-1">
          Añade módulos adicionales o aumenta los límites según tus necesidades. 
          Nuestro equipo te enviará una cotización personalizada.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {productos.map(prod => {
          const IconProd = PRODUCT_ICONS[prod.codigo] || Package
          const isIncluded = personalizacion[`${prod.codigo}_incluido`]
          const cantidad = personalizacion[`${prod.codigo}_cantidad`] || 50
          const isExpanded = expandedProducts[prod.codigo]
          
          // Info del plan seleccionado
          const planConfig = selectedPlan?.productos?.[prod.codigo]
          const enPlan = planConfig?.incluido
          const limitePlan = planConfig?.limite || 0
          
          return (
            <div 
              key={prod.codigo}
              className={`rounded-xl border-2 transition-all ${
                isIncluded 
                  ? 'border-purple-300 bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div 
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => toggleExpand(prod.codigo)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isIncluded ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <IconProd className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900">{prod.nombre}</h5>
                  <p className="text-xs text-gray-500 truncate">{prod.categoria} • {prod.unidad}</p>
                </div>
                
                {enPlan && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    En plan: {limitePlan === -1 ? '∞' : limitePlan}
                  </span>
                )}
                
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleProducto(prod.codigo) }}
                  className={`p-2 rounded-lg transition-colors ${
                    isIncluded 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {isIncluded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
                
                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t">
                  <p className="text-sm text-gray-600 mb-3">{prod.descripcion || `Configura la cantidad de ${prod.unidad} que necesitas.`}</p>
                  
                  {isIncluded && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">Cantidad adicional:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateCantidad(prod.codigo, -10)}
                          className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-16 text-center font-bold text-purple-700">{cantidad}</span>
                        <button
                          onClick={() => onUpdateCantidad(prod.codigo, 10)}
                          className="w-8 h-8 rounded-lg bg-purple-200 hover:bg-purple-300 text-purple-700 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">{prod.unidad}/mes</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE: Selección de Países
// ============================================
function PaisesSelection({ paises, seleccionados, onToggle }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <h4 className="font-semibold text-green-900 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Países para informes comerciales
        </h4>
        <p className="text-sm text-green-700 mt-1">
          Selecciona los países donde necesitas ejecutar informes. Podrás solicitar precios específicos o paquetes por región.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {paises.map(pais => {
          const isSelected = seleccionados.includes(pais.codigo)
          return (
            <button
              key={pais.codigo}
              onClick={() => onToggle(pais.codigo)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                isSelected 
                  ? 'border-green-500 bg-green-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{pais.bandera}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{pais.nombre}</p>
                  <p className="text-xs text-gray-500">{pais.codigo}</p>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {seleccionados.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Países seleccionados ({seleccionados.length}):</strong>{' '}
            {seleccionados.map(c => paises.find(p => p.codigo === c)?.nombre).join(', ')}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Recibirás una cotización con precios por país y opciones de paquetes regionales.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE: Mensaje de éxito
// ============================================
function SuccessMessage({ selectedPlan, personalizacion, paises, onClose }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Check className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">¡Solicitud enviada!</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6">
        Hemos recibido tu solicitud de {selectedPlan ? `plan ${selectedPlan.nombre}` : 'personalización'}.
        Nuestro equipo comercial te contactará en menos de 24 horas con una cotización personalizada.
      </p>
      
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {selectedPlan && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            📦 Plan {selectedPlan.nombre}
          </span>
        )}
        {Object.keys(personalizacion).some(k => k.endsWith('_incluido') && personalizacion[k]) && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            ✨ Módulos extra
          </span>
        )}
        {paises.length > 0 && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            🌍 {paises.length} países
          </span>
        )}
      </div>
      
      <button
        onClick={onClose}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
      >
        Entendido
      </button>
    </div>
  )
}

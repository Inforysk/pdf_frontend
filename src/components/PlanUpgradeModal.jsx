import { useState, useEffect } from 'react'
import { 
  X, Loader2, Check, ChevronRight, Zap, Crown, Infinity,
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users, Package,
  Plus, Minus, AlertCircle
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Mapa de iconos
const ICONOS = {
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users, Package
}

export default function PlanUpgradeModal({ isOpen, onClose, currentPlan }) {
  const [planes, setPlanes] = useState([])
  const [productos, setProductos] = useState([])
  const [miPlan, setMiPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [customizations, setCustomizations] = useState({})
  const [view, setView] = useState('planes') // 'planes' | 'personalizar'

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [planesRes, miPlanRes] = await Promise.all([
        axios.get('/api/portal/planes/comparar'),
        axios.get('/api/portal/mi-plan/productos'),
      ])
      
      if (planesRes.data.success) {
        setPlanes(planesRes.data.planes)
        setProductos(planesRes.data.productos)
      }
      
      if (miPlanRes.data.success) {
        setMiPlan(miPlanRes.data)
        setSelectedPlan(miPlanRes.data.plan?.id)
      }
    } catch (err) {
      toast.error('Error al cargar planes')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId)
  }

  const handleCustomize = (productoId, field, value) => {
    setCustomizations(prev => ({
      ...prev,
      [productoId]: {
        ...prev[productoId],
        [field]: value
      }
    }))
  }

  const handleSolicitar = async () => {
    // Aquí iría la lógica para solicitar el cambio/upgrade
    toast.success('Solicitud enviada. Te contactaremos pronto.')
    onClose()
  }

  if (!isOpen) return null

  const planActual = miPlan?.plan
  const isCurrentPlan = (planId) => planId === planActual?.id

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ampliar tu plan</h2>
              <p className="text-sm text-gray-500">
                Tu plan actual: <span className="font-medium">{planActual?.nombre || 'Sin plan'}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setView('planes')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === 'planes' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Cambiar Plan
            </button>
            <button
              onClick={() => setView('personalizar')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === 'personalizar' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Personalizar Módulos
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : view === 'planes' ? (
              <PlanesView 
                planes={planes}
                productos={productos}
                currentPlanId={planActual?.id}
                selectedPlan={selectedPlan}
                onSelectPlan={handleSelectPlan}
              />
            ) : (
              <PersonalizarView 
                miPlan={miPlan}
                productos={productos}
                customizations={customizations}
                onCustomize={handleCustomize}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              Cancelar
            </button>
            <button 
              onClick={handleSolicitar}
              disabled={selectedPlan === planActual?.id && Object.keys(customizations).length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Solicitar cambio <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// VISTA: PLANES
// ============================================
function PlanesView({ planes, productos, currentPlanId, selectedPlan, onSelectPlan }) {
  return (
    <div className="space-y-6">
      {/* Cards de planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {planes.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const isSelected = plan.id === selectedPlan
          
          return (
            <div 
              key={plan.id}
              onClick={() => !isCurrent && onSelectPlan(plan.id)}
              className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                isSelected && !isCurrent
                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                  : isCurrent
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                    Plan actual
                  </span>
                </div>
              )}
              
              {!isCurrent && plan.precio_mensual > (planes.find(p => p.id === currentPlanId)?.precio_mensual || 0) && (
                <div className="absolute -top-3 right-4">
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Upgrade
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                {plan.nombre === 'Enterprise' ? (
                  <Crown className="h-5 w-5 text-amber-500" />
                ) : (
                  <Zap className="h-5 w-5 text-blue-500" />
                )}
                <h3 className="font-bold text-lg">{plan.nombre}</h3>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">${plan.precio_mensual}</span>
                <span className="text-gray-500">/mes</span>
              </div>

              {/* Productos principales */}
              <div className="space-y-2 text-sm">
                {productos.slice(0, 4).map(prod => {
                  const config = plan.productos?.[prod.codigo] || {}
                  const IconComponent = ICONOS[prod.icono] || Package
                  
                  return (
                    <div key={prod.id} className="flex items-center gap-2">
                      {config.incluido ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={config.incluido ? 'text-gray-700' : 'text-gray-400'}>
                        {config.limite ? `${config.limite} ${prod.unidad}` : config.incluido ? 'Ilimitado' : 'No incluido'}
                      </span>
                      <span className="text-xs text-gray-400">{prod.nombre}</span>
                    </div>
                  )
                })}
              </div>

              {isSelected && !isCurrent && (
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-center gap-2 text-blue-600 text-sm font-medium">
                    <Check className="h-4 w-4" />
                    Seleccionado
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabla comparativa */}
      <div className="mt-8">
        <h4 className="font-medium text-gray-900 mb-4">Comparación detallada</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                {planes.map(plan => (
                  <th key={plan.id} className={`px-4 py-3 text-center text-xs font-medium uppercase ${
                    plan.id === currentPlanId ? 'bg-amber-50 text-amber-700' : 'text-gray-500'
                  }`}>
                    {plan.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productos.map(prod => {
                const IconComponent = ICONOS[prod.icono] || Package
                return (
                  <tr key={prod.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{prod.nombre}</span>
                      </div>
                    </td>
                    {planes.map(plan => {
                      const config = plan.productos?.[prod.codigo] || {}
                      return (
                        <td key={plan.id} className={`px-4 py-3 text-center ${
                          plan.id === currentPlanId ? 'bg-amber-50/50' : ''
                        }`}>
                          {config.incluido ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium text-green-600">
                                {config.limite ? config.limite : <Infinity className="h-4 w-4 inline" />}
                              </span>
                              {config.precio_extra > 0 && (
                                <span className="text-xs text-gray-400">
                                  +${config.precio_extra}/extra
                                </span>
                              )}
                            </div>
                          ) : (
                            <X className="h-4 w-4 text-gray-300 mx-auto" />
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
// VISTA: PERSONALIZAR MÓDULOS
// ============================================
function PersonalizarView({ miPlan, productos, customizations, onCustomize }) {
  if (!miPlan) return null

  const misProductos = miPlan.productos || []

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Personaliza tu plan {miPlan.plan?.nombre}</h4>
            <p className="text-sm text-blue-700 mt-1">
              Añade módulos adicionales o aumenta los límites de tu plan actual. 
              Los cambios se facturarán de forma prorrateada.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {misProductos.map(prod => {
          const IconComponent = ICONOS[prod.icono] || Package
          const custom = customizations[prod.producto_id] || {}
          const limiteActual = prod.limite_efectivo
          const usado = prod.usado || 0
          const porcentaje = prod.porcentaje_usado || 0
          
          return (
            <div 
              key={prod.producto_id}
              className={`border rounded-lg p-4 ${prod.habilitado ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    prod.categoria === 'informes' ? 'bg-blue-100 text-blue-600' :
                    prod.categoria === 'api' ? 'bg-purple-100 text-purple-600' :
                    prod.categoria === 'monitoreo' ? 'bg-green-100 text-green-600' :
                    prod.categoria === 'alertas' ? 'bg-amber-100 text-amber-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900">{prod.nombre}</h5>
                    <span className={`text-xs ${prod.habilitado ? 'text-green-600' : 'text-gray-400'}`}>
                      {prod.habilitado ? (prod.incluido_plan ? 'Incluido en plan' : 'Añadido') : 'No incluido'}
                    </span>
                  </div>
                </div>

                {!prod.incluido_plan && (
                  <button
                    onClick={() => onCustomize(prod.producto_id, 'agregar', !custom.agregar)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 ${
                      custom.agregar 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    {custom.agregar ? (
                      <>
                        <Check className="h-4 w-4" />
                        Añadido
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Añadir
                      </>
                    )}
                  </button>
                )}
              </div>

              {prod.habilitado && (
                <div className="mt-4 space-y-3">
                  {/* Barra de uso */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Uso este mes</span>
                      <span>
                        {usado} / {limiteActual || '∞'} {prod.unidad}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          porcentaje > 90 ? 'bg-red-500' :
                          porcentaje > 70 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Aumentar límite */}
                  {limiteActual && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">¿Necesitas más capacidad?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const current = custom.extra_limite || 0
                            if (current > 0) onCustomize(prod.producto_id, 'extra_limite', current - 10)
                          }}
                          className="p-1 rounded hover:bg-gray-200"
                          disabled={!custom.extra_limite}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={custom.extra_limite || 0}
                          onChange={e => onCustomize(prod.producto_id, 'extra_limite', parseInt(e.target.value) || 0)}
                          className="w-16 text-center px-2 py-1 border rounded text-sm"
                          min="0"
                          step="10"
                        />
                        <button
                          onClick={() => {
                            const current = custom.extra_limite || 0
                            onCustomize(prod.producto_id, 'extra_limite', current + 10)
                          }}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-gray-500">extra/mes</span>
                      </div>
                    </div>
                  )}

                  {/* Precio extra */}
                  {custom.extra_limite > 0 && prod.precio_extra_plan > 0 && (
                    <div className="text-right text-sm">
                      <span className="text-gray-500">Costo adicional: </span>
                      <span className="font-medium text-blue-600">
                        +${(custom.extra_limite * prod.precio_extra_plan).toFixed(2)}/mes
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen de cambios */}
      {Object.keys(customizations).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Resumen de cambios</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            {Object.entries(customizations).map(([prodId, custom]) => {
              const prod = misProductos.find(p => p.producto_id === parseInt(prodId))
              if (!prod) return null
              return (
                <li key={prodId} className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {custom.agregar && `Añadir ${prod.nombre}`}
                  {custom.extra_limite > 0 && `+${custom.extra_limite} ${prod.unidad} en ${prod.nombre}`}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

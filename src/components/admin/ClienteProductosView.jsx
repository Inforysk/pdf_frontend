import { useState, useEffect } from 'react'
import { 
  Package, Plus, Check, X, Loader2, RefreshCw, 
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users,
  TrendingUp, ShoppingCart, Info, Zap, ChevronRight, AlertCircle
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Mapa de iconos
const ICONOS = {
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users, Package
}

export default function ClienteProductosView() {
  const [productos, setProductos] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar productos de mi plan con uso
      const [miPlanRes, todosRes] = await Promise.all([
        axios.get('/api/portal/mi-plan/productos'),
        axios.get('/api/portal/planes/comparar')
      ])
      
      if (miPlanRes.data.success) {
        setProductos(miPlanRes.data.productos || [])
        setPlan(miPlanRes.data.plan)
      }
      
      if (todosRes.data.success) {
        // Los productos vienen como lista separada en todosRes.data.productos
        // Cada plan tiene plan.productos como objeto { CODIGO: { incluido, limite, precio_extra } }
        const productosBase = todosRes.data.productos || []
        // Enriquecer con info de inclusión en planes
        const enriched = productosBase.map(prod => {
          // Buscar en qué planes está incluido
          let enPlan = null
          todosRes.data.planes?.forEach(p => {
            const config = p.productos?.[prod.codigo]
            if (config?.incluido) {
              enPlan = p.nombre
            }
          })
          return { ...prod, enPlan }
        })
        setTodosProductos(enriched)
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Separar productos incluidos de los que podrían añadirse
  const productosIncluidos = productos.filter(p => p.incluido)
  const productosNoIncluidos = todosProductos.filter(tp => 
    !productos.some(p => p.codigo === tp.codigo && p.incluido)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Mis Productos y Módulos
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona los módulos incluidos en tu plan y personaliza según tus necesidades
            </p>
          </div>
          
          {plan && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-100">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Tu Plan</div>
                <div className="font-semibold text-blue-900">{plan.nombre}</div>
              </div>
              <div className="ml-4 text-right">
                <div className="text-2xl font-bold text-blue-600">${plan.precio_mensual}</div>
                <div className="text-xs text-gray-500">/mes</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Productos Incluidos */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Módulos Incluidos en tu Plan
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Estos módulos están activos y disponibles para tu empresa
          </p>
        </div>
        
        <div className="p-4">
          {productosIncluidos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay productos configurados en tu plan</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {productosIncluidos.map(prod => (
                <ProductoCard key={prod.codigo} producto={prod} onRefresh={loadData} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Productos Adicionales */}
      {productosNoIncluidos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-600" />
              Módulos Adicionales Disponibles
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Amplía las capacidades de tu empresa añadiendo estos módulos
            </p>
          </div>
          
          <div className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {productosNoIncluidos.map(prod => (
                <ProductoDisponibleCard key={prod.codigo} producto={prod} onAdd={() => setShowAddModal(prod)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal para solicitar producto */}
      {showAddModal && (
        <SolicitarProductoModal 
          producto={showAddModal} 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); loadData(); }}
        />
      )}
    </div>
  )
}

// ============================================
// CARD: PRODUCTO INCLUIDO
// ============================================
function ProductoCard({ producto, onRefresh }) {
  const IconComponent = ICONOS[producto.icono] || Package
  const [showUpgrade, setShowUpgrade] = useState(false)
  
  const usoPorcentaje = producto.limite_mensual > 0 
    ? Math.min(100, (producto.uso_actual / producto.limite_mensual) * 100)
    : 0
  
  const usoColor = usoPorcentaje >= 90 ? 'red' : usoPorcentaje >= 70 ? 'amber' : 'green'

  return (
    <>
      <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            producto.categoria === 'informes' ? 'bg-blue-100 text-blue-600' :
            producto.categoria === 'api' ? 'bg-purple-100 text-purple-600' :
            producto.categoria === 'monitoreo' ? 'bg-green-100 text-green-600' :
            producto.categoria === 'alertas' ? 'bg-amber-100 text-amber-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-medium text-gray-900 truncate">{producto.nombre}</h5>
            <p className="text-xs text-gray-500">{producto.descripcion}</p>
          </div>
        </div>

        {/* Límite y Uso */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Uso este mes</span>
            <span className="font-medium">
              {producto.uso_actual || 0} / {producto.limite_mensual === -1 ? '∞' : producto.limite_mensual} {producto.unidad}
            </span>
          </div>
          
          {producto.limite_mensual > 0 && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  usoColor === 'red' ? 'bg-red-500' : 
                  usoColor === 'amber' ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${usoPorcentaje}%` }}
              />
            </div>
          )}
          
          {producto.limite_mensual === -1 && (
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Sin límite
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-2 border-t">
          {producto.limite_mensual > 0 ? (
            <button
              onClick={() => setShowUpgrade(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <TrendingUp className="h-4 w-4" />
              Aumentar límite
            </button>
          ) : (
            <span className="text-xs text-gray-400">Plan ilimitado</span>
          )}
          
          {producto.precio_extra > 0 && (
            <span className="text-xs text-gray-500">
              Extra: ${producto.precio_extra}/{producto.unidad}
            </span>
          )}
        </div>
      </div>

      {/* Modal para aumentar límite */}
      {showUpgrade && (
        <AumentarLimiteModal 
          producto={producto} 
          onClose={() => setShowUpgrade(false)}
          onSuccess={() => { setShowUpgrade(false); onRefresh(); }}
        />
      )}
    </>
  )
}

// ============================================
// CARD: PRODUCTO DISPONIBLE PARA AÑADIR
// ============================================
function ProductoDisponibleCard({ producto, onAdd }) {
  const IconComponent = ICONOS[producto.icono] || Package

  return (
    <div className="border rounded-lg p-4 bg-gray-50 hover:bg-white hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center opacity-60 ${
          producto.categoria === 'informes' ? 'bg-blue-100 text-blue-600' :
          producto.categoria === 'api' ? 'bg-purple-100 text-purple-600' :
          producto.categoria === 'monitoreo' ? 'bg-green-100 text-green-600' :
          producto.categoria === 'alertas' ? 'bg-amber-100 text-amber-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-700 truncate">{producto.nombre}</h5>
          <p className="text-xs text-gray-500">{producto.descripcion}</p>
        </div>
      </div>

      {/* Info */}
      <div className="mb-3 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          No incluido en tu plan actual
        </span>
      </div>

      {/* Acción */}
      <button
        onClick={onAdd}
        className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium 
                   hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        Solicitar módulo
      </button>
    </div>
  )
}

// ============================================
// MODAL: SOLICITAR PRODUCTO
// ============================================
function SolicitarProductoModal({ producto, onClose, onSuccess }) {
  const [limiteDeseado, setLimiteDeseado] = useState(100)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const IconComponent = ICONOS[producto.icono] || Package

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await axios.post('/api/portal/solicitar-producto', {
        producto_codigo: producto.codigo,
        limite_deseado: limiteDeseado,
        notas
      })
      toast.success('Solicitud enviada correctamente')
      onSuccess()
    } catch (err) {
      toast.error('Error al enviar solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            producto.categoria === 'informes' ? 'bg-blue-100 text-blue-600' :
            producto.categoria === 'api' ? 'bg-purple-100 text-purple-600' :
            producto.categoria === 'monitoreo' ? 'bg-green-100 text-green-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Solicitar: {producto.nombre}</h3>
            <p className="text-sm text-gray-500">{producto.descripcion}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad deseada ({producto.unidad || 'unidades'}/mes)
            </label>
            <input
              type="number"
              value={limiteDeseado}
              onChange={e => setLimiteDeseado(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Explica para qué necesitas este módulo..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Tu solicitud será revisada por nuestro equipo. Te contactaremos para 
                definir el precio y activar el módulo.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MODAL: AUMENTAR LÍMITE
// ============================================
function AumentarLimiteModal({ producto, onClose, onSuccess }) {
  const [nuevoLimite, setNuevoLimite] = useState(producto.limite_mensual * 2)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const IconComponent = ICONOS[producto.icono] || Package
  const incremento = nuevoLimite - producto.limite_mensual
  const costoEstimado = incremento * (producto.precio_extra || 0)

  const handleSubmit = async () => {
    if (nuevoLimite <= producto.limite_mensual) {
      toast.error('El nuevo límite debe ser mayor al actual')
      return
    }
    
    setSubmitting(true)
    try {
      await axios.post('/api/portal/solicitar-aumento-limite', {
        producto_codigo: producto.codigo,
        limite_actual: producto.limite_mensual,
        limite_deseado: nuevoLimite,
        notas
      })
      toast.success('Solicitud de aumento enviada')
      onSuccess()
    } catch (err) {
      toast.error('Error al enviar solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            producto.categoria === 'informes' ? 'bg-blue-100 text-blue-600' :
            producto.categoria === 'api' ? 'bg-purple-100 text-purple-600' :
            producto.categoria === 'monitoreo' ? 'bg-green-100 text-green-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Aumentar: {producto.nombre}</h3>
            <p className="text-sm text-gray-500">Límite actual: {producto.limite_mensual} {producto.unidad}/mes</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo límite mensual
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={producto.limite_mensual + 10}
                max={producto.limite_mensual * 5}
                step={10}
                value={nuevoLimite}
                onChange={e => setNuevoLimite(parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={nuevoLimite}
                onChange={e => setNuevoLimite(parseInt(e.target.value) || producto.limite_mensual + 10)}
                min={producto.limite_mensual + 1}
                className="w-24 px-3 py-2 border rounded-lg text-center font-medium"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Actual: {producto.limite_mensual}</span>
              <span className="text-green-600 font-medium">+{incremento} {producto.unidad}</span>
            </div>
          </div>

          {producto.precio_extra > 0 && costoEstimado > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-800">Costo adicional estimado:</span>
                <span className="font-bold text-amber-900">${costoEstimado.toFixed(2)}/mes</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Basado en ${producto.precio_extra} por {producto.unidad} adicional
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justificación (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="¿Por qué necesitas más capacidad?"
            />
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || nuevoLimite <= producto.limite_mensual}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            Solicitar aumento
          </button>
        </div>
      </div>
    </div>
  )
}

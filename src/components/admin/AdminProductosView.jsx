import { useState, useEffect } from 'react'
import { 
  Package, Plus, Edit2, Save, X, Loader2, RefreshCw, Check, 
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users,
  ChevronDown, ChevronRight, Settings, Infinity
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Mapa de iconos
const ICONOS = {
  FileText, Code, BarChart3, Eye, Bell, Newspaper, Download, Users, Package
}

// ============================================
// TABS INTERNOS
// ============================================
const SUBTABS = [
  { key: 'productos', label: 'Productos', icon: Package },
  { key: 'configuracion', label: 'Config. por Plan', icon: Settings },
]

export default function AdminProductosView() {
  const [activeSubTab, setActiveSubTab] = useState('productos')

  return (
    <div className="space-y-4 px-1 sm:px-0">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Productos y Módulos
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configura los productos disponibles y sus límites por plan
        </p>

        {/* Sub-tabs */}
        <div className="mt-4 bg-gray-100 rounded-lg p-1">
          <div className="grid grid-cols-2 gap-1">
          {SUBTABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`min-h-11 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all min-w-0 ${
                  activeSubTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate text-xs sm:text-sm">{tab.label}</span>
              </button>
            )
          })}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'productos' && <ProductosTab />}
      {activeSubTab === 'configuracion' && <ConfigPlanTab />}
    </div>
  )
}

// ============================================
// TAB: PRODUCTOS
// ============================================
function ProductosTab() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/productos')
      if (res.data.success) setProductos(res.data.productos)
    } catch (err) {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data) => {
    try {
      if (editing) {
        await axios.put(`/api/admin/productos/${editing.id}`, data)
        toast.success('Producto actualizado')
      } else {
        await axios.post('/api/admin/productos', data)
        toast.success('Producto creado')
      }
      setShowForm(false)
      setEditing(null)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  const handleToggleActive = async (prod) => {
    try {
      await axios.put(`/api/admin/productos/${prod.id}`, { activo: !prod.activo })
      toast.success(prod.activo ? 'Producto desactivado' : 'Producto activado')
      loadData()
    } catch { toast.error('Error') }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Productos/Módulos Disponibles</h4>
          <p className="text-sm text-gray-500">{productos.length} productos configurados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary text-sm flex items-center gap-1">
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>

      {showForm && (
        <ProductoForm 
          producto={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos.map(prod => {
          const IconComponent = ICONOS[prod.icono] || Package
          return (
            <div 
              key={prod.id} 
              className={`border rounded-lg p-4 ${!prod.activo ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
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
                    <span className="text-xs text-gray-500">{prod.codigo}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setEditing(prod); setShowForm(true) }}
                  className="text-gray-400 hover:text-blue-600 p-1"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              
              {prod.descripcion && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{prod.descripcion}</p>
              )}
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    prod.categoria === 'informes' ? 'bg-blue-100 text-blue-700' :
                    prod.categoria === 'api' ? 'bg-purple-100 text-purple-700' :
                    prod.categoria === 'monitoreo' ? 'bg-green-100 text-green-700' :
                    prod.categoria === 'alertas' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {prod.categoria}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({prod.unidad})
                  </span>
                </div>
                <button
                  onClick={() => handleToggleActive(prod)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    prod.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {prod.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// FORM: PRODUCTO
// ============================================
function ProductoForm({ producto, onSave, onCancel }) {
  const [form, setForm] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    categoria: producto?.categoria || 'general',
    unidad: producto?.unidad || 'unidades',
    icono: producto?.icono || 'Package',
    orden: producto?.orden || 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son requeridos')
      return
    }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 border">
      <h5 className="font-medium mb-3">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
          <input
            type="text"
            value={form.codigo}
            onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })}
            disabled={!!producto}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="API_ACCESS"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Acceso API"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
          <select
            value={form.categoria}
            onChange={e => setForm({ ...form, categoria: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="informes">Informes</option>
            <option value="api">API</option>
            <option value="monitoreo">Monitoreo</option>
            <option value="alertas">Alertas</option>
            <option value="general">General</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unidad</label>
          <input
            type="text"
            value={form.unidad}
            onChange={e => setForm({ ...form, unidad: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="consultas"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text"
            value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Descripción del producto..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Icono</label>
          <select
            value={form.icono}
            onChange={e => setForm({ ...form, icono: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            {Object.keys(ICONOS).map(icon => (
              <option key={icon} value={icon}>{icon}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
          <input
            type="number"
            value={form.orden}
            onChange={e => setForm({ ...form, orden: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
      </div>
    </form>
  )
}

// ============================================
// TAB: CONFIGURACIÓN POR PLAN
// ============================================
function ConfigPlanTab() {
  const [planes, setPlanes] = useState([])
  const [productos, setProductos] = useState([])
  const [planConfig, setPlanConfig] = useState({})
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [planesRes, prodRes] = await Promise.all([
        axios.get('/api/admin/planes'),
        axios.get('/api/admin/productos'),
      ])
      if (planesRes.data.success) {
        const activePlans = (planesRes.data.planes || []).filter(p => p.activo)
        setPlanes(activePlans)
        if (activePlans.length > 0 && !selectedPlan) {
          setSelectedPlan(activePlans[0].id)
        }
      }
      if (prodRes.data.success) setProductos(prodRes.data.productos.filter(p => p.activo))
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPlan) loadPlanConfig()
  }, [selectedPlan])

  const loadPlanConfig = async () => {
    try {
      const res = await axios.get(`/api/admin/planes/${selectedPlan}/productos`)
      if (res.data.success) {
        const config = {}
        res.data.productos.forEach(p => {
          config[p.producto_id] = {
            incluido: p.incluido,
            limite_mensual: p.limite_mensual,
            precio_extra: p.precio_extra || 0
          }
        })
        setPlanConfig(config)
      }
    } catch (err) {
      toast.error('Error al cargar configuración')
    }
  }

  const handleSaveConfig = async (productoId, config) => {
    setSaving(true)
    try {
      await axios.post(`/api/admin/planes/${selectedPlan}/productos`, {
        producto_id: productoId,
        ...config
      })
      toast.success('Configuración guardada')
      setPlanConfig(prev => ({ ...prev, [productoId]: config }))
    } catch (err) {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  const planActual = planes.find(p => p.id === selectedPlan)

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Configuración de Productos por Plan</h4>
          <p className="text-sm text-gray-500">Define qué productos y límites incluye cada plan</p>
        </div>
        <select
          value={selectedPlan || ''}
          onChange={e => setSelectedPlan(parseInt(e.target.value))}
          className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm font-medium"
        >
          {planes.map(plan => (
            <option key={plan.id} value={plan.id}>
              {plan.nombre} - ${plan.precio_mensual}/mes
            </option>
          ))}
        </select>
      </div>

      {planActual && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <span className="font-medium text-blue-900">{planActual.nombre}</span>
              <span className="text-blue-600 ml-2">${planActual.precio_mensual}/mes</span>
            </div>
            <span className="text-sm text-blue-700 whitespace-nowrap">
              {planActual.creditos_mes} créditos base
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {productos.map(prod => {
          const config = planConfig[prod.id] || { incluido: false, limite_mensual: null, precio_extra: 0, precio_excedente: 0 }
          const IconComponent = ICONOS[prod.icono] || Package
          
          return (
            <ProductoConfigRow
              key={prod.id}
              producto={prod}
              config={config}
              IconComponent={IconComponent}
              onSave={(newConfig) => handleSaveConfig(prod.id, newConfig)}
              saving={saving}
            />
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// ROW: CONFIGURACIÓN PRODUCTO EN PLAN
// ============================================
function ProductoConfigRow({ producto, config, IconComponent, onSave, saving }) {
  const [expanded, setExpanded] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setLocalConfig(config)
    setDirty(false)
  }, [config])

  const handleChange = (field, value) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleSave = () => {
    onSave(localConfig)
    setDirty(false)
  }

  return (
    <div className={`border rounded-lg ${localConfig.incluido ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
      <div 
        className="p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="pt-0.5 shrink-0">
              {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </div>
            <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
              producto.categoria === 'informes' ? 'bg-blue-100 text-blue-600' :
              producto.categoria === 'api' ? 'bg-purple-100 text-purple-600' :
              producto.categoria === 'monitoreo' ? 'bg-green-100 text-green-600' :
              producto.categoria === 'alertas' ? 'bg-amber-100 text-amber-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 break-words">{producto.nombre}</p>
              <p className="text-xs text-gray-500 break-all mt-0.5">({producto.codigo})</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
            {localConfig.incluido ? (
              <span className="flex items-center gap-1 text-sm text-green-600 min-w-0">
                <Check className="h-4 w-4 shrink-0" />
                <span className="truncate">{localConfig.limite_mensual ? `${localConfig.limite_mensual}/${producto.unidad}` : 'Ilimitado'}</span>
              </span>
            ) : (
              <span className="text-sm text-gray-400">No incluido</span>
            )}
            {dirty && (
              <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" title="Sin guardar"></span>
            )}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-2 lg:pt-6">
              <input
                type="checkbox"
                id={`inc-${producto.id}`}
                checked={localConfig.incluido}
                onChange={e => handleChange('incluido', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor={`inc-${producto.id}`} className="text-sm">Incluido en plan</label>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Límite mensual</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localConfig.limite_mensual || ''}
                  onChange={e => handleChange('limite_mensual', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="∞"
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!localConfig.incluido}
                />
                {!localConfig.limite_mensual && localConfig.incluido && (
                  <Infinity className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio activación</label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={localConfig.precio_extra || ''}
                  onChange={e => handleChange('precio_extra', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!localConfig.incluido}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">$/excedente</label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={localConfig.precio_excedente || ''}
                  onChange={e => handleChange('precio_excedente', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!localConfig.incluido}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className={`w-full lg:w-auto px-3 py-2 rounded text-sm font-medium inline-flex items-center justify-center ${
                  dirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  Package, Plus, Edit2, Trash2, Save, X, RefreshCw, Loader2,
  DollarSign, Percent, Calculator, Eye, ToggleLeft, ToggleRight,
  FileText, Zap, Clock, TrendingUp, History, Code2, Settings, 
  Palette, Hash, EyeOff, GripVertical
} from 'lucide-react'

// Mapeo de iconos disponibles
const ICON_MAP = {
  FileText, Zap, Clock, TrendingUp, History, Code2, Package
}

const ICON_OPTIONS = [
  { value: 'FileText', label: 'Documento', icon: FileText },
  { value: 'Zap', label: 'Rayo', icon: Zap },
  { value: 'Clock', label: 'Reloj', icon: Clock },
  { value: 'History', label: 'Historial', icon: History },
  { value: 'TrendingUp', label: 'Tendencia', icon: TrendingUp },
  { value: 'Code2', label: 'Código', icon: Code2 },
  { value: 'Package', label: 'Paquete', icon: Package },
]

const COLOR_OPTIONS = [
  { value: 'text-blue-600', label: 'Azul', bg: 'bg-blue-100' },
  { value: 'text-indigo-600', label: 'Índigo', bg: 'bg-indigo-100' },
  { value: 'text-purple-600', label: 'Púrpura', bg: 'bg-purple-100' },
  { value: 'text-orange-600', label: 'Naranja', bg: 'bg-orange-100' },
  { value: 'text-emerald-600', label: 'Esmeralda', bg: 'bg-emerald-100' },
  { value: 'text-red-600', label: 'Rojo', bg: 'bg-red-100' },
  { value: 'text-gray-600', label: 'Gris', bg: 'bg-gray-100' },
]

export default function AdminReportPacksView() {
  const [activeTab, setActiveTab] = useState('tipos') // tipos | packs | pricing
  const [packages, setPackages] = useState([])
  const [pricing, setPricing] = useState([]) // Ahora son los tipos completos
  const [loading, setLoading] = useState(true)
  const [editingPack, setEditingPack] = useState(null)
  const [showPackForm, setShowPackForm] = useState(false)
  
  // Form state para packs
  const [packForm, setPackForm] = useState({
    nombre: '',
    descripcion: '',
    report_type: 'completo',
    quantity: 5,
    precio: 0,
    precio_original: 0,
    discount_percent: 0,
    currency_code: 'USD',
    is_active: true,
    orden: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pkgRes, priceRes] = await Promise.all([
        axios.get('/api/admin/reports/packages'),
        axios.get('/api/admin/reports/pricing')
      ])
      if (pkgRes.data.success) setPackages(pkgRes.data.packages || [])
      if (priceRes.data.success) setPricing(priceRes.data.pricing || [])
    } catch (err) {
      toast.error('Error al cargar datos')
    }
    setLoading(false)
  }

  // Calcular precio automáticamente basado en precio base y descuento
  const calculatePrice = (basePrice, quantity, discountPercent) => {
    const unitPrice = basePrice * (1 - discountPercent / 100)
    return Math.round(unitPrice * quantity * 100) / 100
  }

  // Obtener precio base del tipo seleccionado
  const getBasePrice = (reportType) => {
    const priceInfo = pricing.find(p => p.report_type === reportType)
    return priceInfo?.precio_unitario || 0
  }

  // Actualizar form con cálculo automático
  const updatePackForm = (field, value) => {
    const newForm = { ...packForm, [field]: value }
    
    // Recalcular precios si cambian campos relevantes
    if (['report_type', 'quantity', 'discount_percent'].includes(field)) {
      const basePrice = field === 'report_type' ? getBasePrice(value) : getBasePrice(newForm.report_type)
      const qty = field === 'quantity' ? Number(value) : newForm.quantity
      const disc = field === 'discount_percent' ? Number(value) : newForm.discount_percent
      
      newForm.precio_original = basePrice * qty
      newForm.precio = calculatePrice(basePrice, qty, disc)
    }
    
    setPackForm(newForm)
  }

  // Iniciar edición de pack
  const handleEditPack = (pack) => {
    setEditingPack(pack.id)
    setPackForm({
      nombre: pack.nombre,
      descripcion: pack.descripcion || '',
      report_type: pack.report_type,
      quantity: pack.quantity,
      precio: pack.precio,
      precio_original: pack.precio_original || pack.precio,
      discount_percent: pack.precio_original ? Math.round((1 - pack.precio / pack.precio_original) * 100) : 0,
      currency_code: pack.currency_code || 'USD',
      is_active: pack.is_active,
      orden: pack.orden || 0
    })
    setShowPackForm(true)
  }

  // Nuevo pack
  const handleNewPack = () => {
    setEditingPack(null)
    const basePrice = getBasePrice('completo')
    setPackForm({
      nombre: '',
      descripcion: '',
      report_type: 'completo',
      quantity: 5,
      precio: basePrice * 5,
      precio_original: basePrice * 5,
      discount_percent: 0,
      currency_code: 'USD',
      is_active: true,
      orden: packages.length + 1
    })
    setShowPackForm(true)
  }

  // Guardar pack
  const handleSavePack = async () => {
    if (!packForm.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    try {
      if (editingPack) {
        await axios.put(`/api/admin/reports/packages/${editingPack}`, packForm)
        toast.success('Pack actualizado')
      } else {
        await axios.post('/api/admin/reports/packages', packForm)
        toast.success('Pack creado')
      }
      setShowPackForm(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    }
  }

  // Toggle activo pack
  const handleTogglePack = async (pack) => {
    try {
      await axios.put(`/api/admin/reports/packages/${pack.id}`, { 
        is_active: !pack.is_active 
      })
      toast.success(pack.is_active ? 'Pack desactivado' : 'Pack activado')
      loadData()
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  // Actualizar precio base
  const handleUpdatePricing = async (reportType, newPrice) => {
    try {
      await axios.put(`/api/admin/reports/pricing/${reportType}`, {
        precio_unitario: parseFloat(newPrice)
      })
      toast.success('Precio actualizado')
      loadData()
    } catch (err) {
      toast.error('Error al actualizar precio')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            Gestión de Informes Prepagos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra tipos, packs y precios de informes
          </p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('tipos')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tipos' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="h-4 w-4" />
          Tipos de Informe
        </button>
        <button
          onClick={() => setActiveTab('packs')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'packs' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="h-4 w-4" />
          Packs
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pricing' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Precios
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'tipos' && (
          <TiposTab 
            key="tipos"
            tipos={pricing}
            onReload={loadData}
          />
        )}
        {activeTab === 'packs' && (
          <PacksTab 
            key="packs"
            packages={packages}
            pricing={pricing}
            onNew={handleNewPack}
            onEdit={handleEditPack}
            onToggle={handleTogglePack}
            showForm={showPackForm}
            packForm={packForm}
            editingPack={editingPack}
            onFormChange={updatePackForm}
            onSave={handleSavePack}
            onCancel={() => setShowPackForm(false)}
            getBasePrice={getBasePrice}
          />
        )}
        {activeTab === 'pricing' && (
          <PricingTab 
            key="pricing"
            pricing={pricing}
            onUpdate={handleUpdatePricing}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ========================================
// TAB: PACKS DE INFORMES
// ========================================
function PacksTab({ 
  packages, pricing, onNew, onEdit, onToggle, 
  showForm, packForm, editingPack, onFormChange, onSave, onCancel,
  getBasePrice 
}) {
  // Agrupar packs por tipo
  const packsByType = packages.reduce((acc, p) => {
    if (!acc[p.report_type]) acc[p.report_type] = []
    acc[p.report_type].push(p)
    return acc
  }, {})

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Botón nuevo pack */}
      <div className="flex justify-end">
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pack
        </button>
      </div>

      {/* Modal/Form de edición */}
      <AnimatePresence>
        {showForm && (
          <PackFormModal
            packForm={packForm}
            editingPack={editingPack}
            pricing={pricing}
            onChange={onFormChange}
            onSave={onSave}
            onCancel={onCancel}
            getBasePrice={getBasePrice}
          />
        )}
      </AnimatePresence>

      {/* Lista de packs por tipo */}
      {Object.entries(packsByType).map(([type, packs]) => {
        const tipoInfo = pricing.find(p => p.report_type === type) || {}
        const Icon = ICON_MAP[tipoInfo.icono] || Package
        const colorClass = tipoInfo.color ? `bg-gray-100 ${tipoInfo.color}` : 'bg-gray-100 text-gray-700'
        
        return (
          <div key={type} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className={`px-4 py-3 border-b flex items-center gap-2 ${colorClass}`}>
              <Icon className="h-5 w-5" />
              <span className="font-semibold">
                {tipoInfo.nombre || `Informe ${type}`}
              </span>
              <span className="text-xs opacity-75">
                ({packs.length} pack{packs.length !== 1 ? 's' : ''})
              </span>
            </div>
            
            <div className="divide-y">
              {packs.map(pack => (
                <PackRow 
                  key={pack.id} 
                  pack={pack} 
                  onEdit={onEdit}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        )
      })}

      {packages.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay packs configurados</p>
          <button onClick={onNew} className="mt-3 text-indigo-600 hover:underline">
            Crear primer pack
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Fila de pack individual
function PackRow({ pack, onEdit, onToggle }) {
  const ahorro = pack.precio_original ? pack.precio_original - pack.precio : 0
  const descuento = pack.precio_original ? Math.round((1 - pack.precio / pack.precio_original) * 100) : 0

  return (
    <div className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition ${!pack.is_active ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{pack.nombre}</span>
          {!pack.is_active && (
            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
              Inactivo
            </span>
          )}
          {descuento > 0 && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              -{descuento}%
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{pack.descripcion}</p>
      </div>

      <div className="text-right">
        <div className="flex items-center gap-2">
          {pack.precio_original && pack.precio_original > pack.precio && (
            <span className="text-sm text-gray-400 line-through">
              ${pack.precio_original}
            </span>
          )}
          <span className="font-bold text-lg text-gray-900">
            ${pack.precio}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {pack.quantity} informes • ${(pack.precio / pack.quantity).toFixed(2)} c/u
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggle(pack)}
          className={`p-2 rounded-lg transition ${
            pack.is_active 
              ? 'text-green-600 hover:bg-green-50' 
              : 'text-gray-400 hover:bg-gray-100'
          }`}
          title={pack.is_active ? 'Desactivar' : 'Activar'}
        >
          {pack.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
        </button>
        <button
          onClick={() => onEdit(pack)}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          title="Editar"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Modal de formulario de pack
function PackFormModal({ packForm, editingPack, pricing, onChange, onSave, onCancel, getBasePrice }) {
  const basePrice = getBasePrice(packForm.report_type)
  const unitPrice = basePrice * (1 - packForm.discount_percent / 100)
  const ahorro = packForm.precio_original - packForm.precio

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingPack ? 'Editar Pack' : 'Nuevo Pack'}
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Columna izquierda - Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Pack
              </label>
              <input
                type="text"
                value={packForm.nombre}
                onChange={e => onChange('nombre', e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: Pack Profesional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={packForm.descripcion}
                onChange={e => onChange('descripcion', e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: 10 informes completos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Informe
              </label>
              <select
                value={packForm.report_type}
                onChange={e => onChange('report_type', e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {pricing.map(p => (
                  <option key={p.report_type} value={p.report_type}>
                    {p.nombre} (${p.precio_unitario}/u){p.es_api ? ' [API]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={packForm.quantity}
                  onChange={e => onChange('quantity', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descuento %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={packForm.discount_percent}
                    onChange={e => onChange('discount_percent', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Final (override)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={packForm.precio}
                  onChange={e => onChange('precio', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 pl-7 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Puedes ajustar manualmente el precio final
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={packForm.is_active}
                onChange={e => onChange('is_active', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Pack activo (visible para clientes)
              </label>
            </div>
          </div>

          {/* Columna derecha - Preview */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Vista Previa
            </h4>

            <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Precio base</span>
                <span className="font-medium">${basePrice} / informe</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Cantidad</span>
                <span className="font-medium">{packForm.quantity} informes</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="font-medium">${packForm.precio_original.toFixed(2)}</span>
              </div>

              {packForm.discount_percent > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-sm">Descuento ({packForm.discount_percent}%)</span>
                  <span className="font-medium">-${ahorro.toFixed(2)}</span>
                </div>
              )}

              <hr className="my-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Precio unitario</span>
                <span className="font-bold">${unitPrice.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">Total Pack</span>
                <span className="font-bold text-2xl text-indigo-600">
                  ${packForm.precio.toFixed(2)}
                </span>
              </div>

              {ahorro > 0 && (
                <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center">
                  <span className="text-green-700 font-medium">
                    Ahorro: ${ahorro.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {editingPack ? 'Guardar Cambios' : 'Crear Pack'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ========================================
// TAB: PRECIOS BASE
// ========================================
function PricingTab({ pricing, onUpdate }) {
  const [editingType, setEditingType] = useState(null)
  const [tempPrice, setTempPrice] = useState('')

  const handleEdit = (type, currentPrice) => {
    setEditingType(type)
    setTempPrice(currentPrice.toString())
  }

  const handleSave = (type) => {
    onUpdate(type, tempPrice)
    setEditingType(null)
  }

  const handleCancel = () => {
    setEditingType(null)
    setTempPrice('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl shadow-sm border overflow-hidden"
    >
      <div className="px-6 py-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">Precios Base por Tipo de Informe</h3>
        <p className="text-sm text-gray-500 mt-1">
          Estos precios se usan como referencia para calcular los packs
        </p>
      </div>

      <div className="divide-y">
        {pricing.map(p => {
          const Icon = ICON_MAP[p.icono] || FileText
          const isEditing = editingType === p.report_type

          return (
            <div key={p.report_type} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 ${p.color}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <p className="font-medium text-gray-900">{p.nombre}</p>
                <p className="text-sm text-gray-500">{p.descripcion}</p>
              </div>

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tempPrice}
                        onChange={e => setTempPrice(e.target.value)}
                        className="w-24 px-3 py-1.5 pl-7 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => handleSave(p.report_type)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-xl text-gray-900">
                      ${p.precio_unitario}
                    </span>
                    <span className="text-sm text-gray-500">/informe</span>
                    <button
                      onClick={() => handleEdit(p.report_type, p.precio_unitario)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pricing.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay precios configurados</p>
        </div>
      )}
    </motion.div>
  )
}

// ========================================
// TAB: TIPOS DE INFORME
// ========================================
function TiposTab({ tipos, onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [editingTipo, setEditingTipo] = useState(null)
  const [form, setForm] = useState({
    report_type: '',
    nombre: '',
    descripcion: '',
    precio_unitario: 0,
    icono: 'FileText',
    color: 'text-blue-600',
    orden: 0,
    is_active: true,
    visible_en_busqueda: true,
    es_api: false
  })

  const handleNew = () => {
    setEditingTipo(null)
    setForm({
      report_type: '',
      nombre: '',
      descripcion: '',
      precio_unitario: 0,
      icono: 'FileText',
      color: 'text-blue-600',
      orden: tipos.length + 1,
      is_active: true,
      visible_en_busqueda: true,
      es_api: false
    })
    setShowForm(true)
  }

  const handleEdit = (tipo) => {
    setEditingTipo(tipo.report_type)
    setForm({
      report_type: tipo.report_type,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      precio_unitario: tipo.precio_unitario || 0,
      icono: tipo.icono || 'FileText',
      color: tipo.color || 'text-blue-600',
      orden: tipo.orden || 0,
      is_active: tipo.is_active,
      visible_en_busqueda: tipo.visible_en_busqueda,
      es_api: tipo.es_api || false
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!editingTipo && !form.report_type.trim()) {
      toast.error('El código del tipo es requerido')
      return
    }

    try {
      if (editingTipo) {
        await axios.put(`/api/admin/reports/types/${editingTipo}`, form)
        toast.success('Tipo actualizado')
      } else {
        await axios.post('/api/admin/reports/types', form)
        toast.success('Tipo creado')
      }
      setShowForm(false)
      onReload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    }
  }

  const handleToggleActive = async (tipo) => {
    try {
      await axios.put(`/api/admin/reports/types/${tipo.report_type}`, {
        is_active: !tipo.is_active
      })
      toast.success(tipo.is_active ? 'Tipo desactivado' : 'Tipo activado')
      onReload()
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  const handleToggleVisible = async (tipo) => {
    try {
      await axios.put(`/api/admin/reports/types/${tipo.report_type}`, {
        visible_en_busqueda: !tipo.visible_en_busqueda
      })
      toast.success(tipo.visible_en_busqueda ? 'Oculto en búsqueda' : 'Visible en búsqueda')
      onReload()
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (tipo) => {
    if (!confirm(`¿Eliminar el tipo "${tipo.nombre}"?`)) return
    
    try {
      await axios.delete(`/api/admin/reports/types/${tipo.report_type}`)
      toast.success('Tipo eliminado')
      onReload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Botón nuevo */}
      <div className="flex justify-end">
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Tipo
        </button>
      </div>

      {/* Modal form */}
      <AnimatePresence>
        {showForm && (
          <TipoFormModal
            form={form}
            editingTipo={editingTipo}
            onChange={(field, value) => setForm({ ...form, [field]: value })}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Lista de tipos */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Tipos de Informe Configurados</h3>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona qué tipos de informe aparecen en el buscador
          </p>
        </div>

        <div className="divide-y">
          {tipos.map(tipo => {
            const Icon = ICON_MAP[tipo.icono] || FileText
            
            return (
              <div 
                key={tipo.report_type} 
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition ${!tipo.is_active ? 'opacity-50' : ''}`}
              >
                <div className="text-gray-300 cursor-grab">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 ${tipo.color}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{tipo.nombre}</span>
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {tipo.report_type}
                    </code>
                    {tipo.es_api && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        API
                      </span>
                    )}
                    {!tipo.is_active && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                        Inactivo
                      </span>
                    )}
                    {!tipo.visible_en_busqueda && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Oculto
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{tipo.descripcion}</p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-gray-900">${tipo.precio_unitario}</span>
                  <p className="text-xs text-gray-500">Orden: {tipo.orden}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleVisible(tipo)}
                    className={`p-2 rounded-lg transition ${
                      tipo.visible_en_busqueda 
                        ? 'text-blue-600 hover:bg-blue-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={tipo.visible_en_busqueda ? 'Ocultar en búsqueda' : 'Mostrar en búsqueda'}
                  >
                    {tipo.visible_en_busqueda ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleToggleActive(tipo)}
                    className={`p-2 rounded-lg transition ${
                      tipo.is_active 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={tipo.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {tipo.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(tipo)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!tipo.es_api && (
                    <button
                      onClick={() => handleDelete(tipo)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {tipos.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay tipos configurados</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Modal de formulario de tipo
function TipoFormModal({ form, editingTipo, onChange, onSave, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingTipo ? 'Editar Tipo' : 'Nuevo Tipo de Informe'}
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!editingTipo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código (único, sin espacios)
              </label>
              <input
                type="text"
                value={form.report_type}
                onChange={e => onChange('report_type', e.target.value.toLowerCase().replace(/\s/g, '_'))}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="ej: premium, express"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => onChange('nombre', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder="ej: Informe Premium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={e => onChange('descripcion', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder="ej: Análisis completo con scoring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unitario
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.precio_unitario}
                  onChange={e => onChange('precio_unitario', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 pl-7 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orden
              </label>
              <input
                type="number"
                value={form.orden}
                onChange={e => onChange('orden', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icono
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange('icono', opt.value)}
                    className={`p-2 rounded-lg border transition ${
                      form.icono === opt.value 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={opt.label}
                  >
                    <opt.icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange('color', opt.value)}
                    className={`w-8 h-8 rounded-lg ${opt.bg} ${opt.value} flex items-center justify-center transition ring-2 ${
                      form.color === opt.value 
                        ? 'ring-indigo-500' 
                        : 'ring-transparent hover:ring-gray-300'
                    }`}
                    title={opt.label}
                  >
                    {form.color === opt.value && '✓'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => onChange('is_active', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Activo (disponible para uso)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.visible_en_busqueda}
                onChange={e => onChange('visible_en_busqueda', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Visible en búsqueda (aparece en dropdown)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.es_api}
                onChange={e => onChange('es_api', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Es tipo API (no genera informe, solo solicitud)</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {editingTipo ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

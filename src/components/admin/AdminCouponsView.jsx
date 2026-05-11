import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Ticket, Plus, Search, Edit2, Trash2, Users, Eye, Copy,
  Loader2, X, Check, Calendar, Tag, Percent, DollarSign,
  Gift, Clock, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react'

const TYPE_CONFIG = {
  percentage: { label: 'Porcentaje', icon: Percent, color: 'text-purple-600 bg-purple-50' },
  fixed: { label: 'Monto fijo', icon: DollarSign, color: 'text-green-600 bg-green-50' }
}

const APPLIES_CONFIG = {
  all: { label: 'Todo', color: 'bg-blue-100 text-blue-700' },
  report_pack: { label: 'Packs', color: 'bg-amber-100 text-amber-700' },
  subscription: { label: 'Suscripción', color: 'bg-purple-100 text-purple-700' }
}

export default function AdminCouponsView() {
  const [coupons, setCoupons] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(null) // coupon object
  const [showUsageModal, setShowUsageModal] = useState(null) // coupon object
  const [editingCoupon, setEditingCoupon] = useState(null)

  useEffect(() => {
    loadCoupons()
    loadClients()
  }, [])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/coupons')
      if (res.data.success) {
        setCoupons(res.data.coupons || [])
      }
    } catch (err) {
      toast.error('Error cargando cupones')
    }
    setLoading(false)
  }

  const loadClients = async () => {
    try {
      const res = await axios.get('/api/admin/coupons/clients')
      if (res.data.success) {
        setClients(res.data.clients || [])
      }
    } catch (err) { /* ignore */ }
  }

  const deleteCoupon = async (coupon) => {
    if (!confirm(`¿Eliminar cupón ${coupon.code}?`)) return
    try {
      const res = await axios.delete(`/api/admin/coupons/${coupon.id}`)
      if (res.data.success) {
        toast.success('Cupón eliminado')
        loadCoupons()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error eliminando cupón')
    }
  }

  const toggleActive = async (coupon) => {
    try {
      const res = await axios.put(`/api/admin/coupons/${coupon.id}`, {
        is_active: !coupon.is_active
      })
      if (res.data.success) {
        toast.success(coupon.is_active ? 'Cupón desactivado' : 'Cupón activado')
        loadCoupons()
      }
    } catch (err) {
      toast.error('Error actualizando cupón')
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Código copiado')
  }

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  // Calcular métricas
  const totalCoupons = coupons.length
  const activeCoupons = coupons.filter(c => c.is_active).length
  const totalDiscountGiven = coupons.reduce((sum, c) => sum + (Number(c.total_discount_given) || 0), 0)
  const totalUses = coupons.reduce((sum, c) => sum + (Number(c.total_uses) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="h-7 w-7 text-purple-600" />
            Gestión de Cupones
          </h1>
          <p className="text-gray-500 text-sm mt-1">Crear, asignar y rastrear cupones de descuento</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCoupons}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="Refrescar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo cupón
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total cupones" value={totalCoupons} icon={Ticket} color="purple" />
        <MetricCard label="Activos" value={activeCoupons} icon={CheckCircle} color="green" />
        <MetricCard label="Usos totales" value={totalUses} icon={Users} color="blue" />
        <MetricCard 
          label="Descuentos otorgados" 
          value={`$${totalDiscountGiven.toFixed(0)}`} 
          icon={DollarSign} 
          color="amber" 
        />
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Lista de cupones */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Aplica a</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Usos</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Expira</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCoupons.map((coupon) => (
                <CouponRow 
                  key={coupon.id} 
                  coupon={coupon}
                  onCopy={copyCode}
                  onToggle={toggleActive}
                  onDelete={deleteCoupon}
                  onEdit={() => setEditingCoupon(coupon)}
                  onAssign={() => setShowAssignModal(coupon)}
                  onViewUsage={() => setShowUsageModal(coupon)}
                />
              ))}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    {search ? 'No se encontraron cupones' : 'No hay cupones creados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar cupón */}
      {(showCreateModal || editingCoupon) && (
        <CouponFormModal
          coupon={editingCoupon}
          onClose={() => { setShowCreateModal(false); setEditingCoupon(null); }}
          onSave={() => { setShowCreateModal(false); setEditingCoupon(null); loadCoupons(); }}
        />
      )}

      {/* Modal asignar cupón */}
      {showAssignModal && (
        <AssignCouponModal
          coupon={showAssignModal}
          clients={clients}
          onClose={() => setShowAssignModal(null)}
          onAssigned={loadCoupons}
        />
      )}

      {/* Modal ver uso */}
      {showUsageModal && (
        <CouponUsageModal
          coupon={showUsageModal}
          onClose={() => setShowUsageModal(null)}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600'
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function CouponRow({ coupon, onCopy, onToggle, onDelete, onEdit, onAssign, onViewUsage }) {
  const typeConfig = TYPE_CONFIG[coupon.type] || TYPE_CONFIG.percentage
  const appliesConfig = APPLIES_CONFIG[coupon.applies_to] || APPLIES_CONFIG.all
  const TypeIcon = typeConfig.icon

  const isExpired = coupon.valid_to && new Date(coupon.valid_to) < new Date()
  const isExhausted = coupon.max_uses && coupon.used_count >= coupon.max_uses

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
            {coupon.code}
          </code>
          <button onClick={() => onCopy(coupon.code)} className="text-gray-400 hover:text-gray-600">
            <Copy className="h-3.5 w-3.5" />
          </button>
          {coupon.is_public && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">PÚBLICO</span>
          )}
        </div>
        {coupon.description && (
          <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{coupon.description}</p>
        )}
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${typeConfig.color}`}>
          <TypeIcon className="h-3 w-3" />
          {typeConfig.label}
        </span>
      </td>
      <td className="py-3 px-4 font-bold text-gray-900">
        {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${appliesConfig.color}`}>
          {appliesConfig.label}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="font-medium text-gray-700">
          {coupon.used_count || 0}
          {coupon.max_uses && <span className="text-gray-400">/{coupon.max_uses}</span>}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">
        {coupon.valid_to 
          ? new Date(coupon.valid_to).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
          : 'Sin límite'
        }
      </td>
      <td className="py-3 px-4 text-center">
        {isExpired ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3" /> Expirado
          </span>
        ) : isExhausted ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Agotado
          </span>
        ) : coupon.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" /> Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Inactivo
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onViewUsage}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Ver uso"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onAssign}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
            title="Asignar"
          >
            <Gift className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggle(coupon)}
            className={`p-1.5 rounded-lg ${coupon.is_active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
            title={coupon.is_active ? 'Desactivar' : 'Activar'}
          >
            {coupon.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </button>
          {coupon.used_count === 0 && (
            <button
              onClick={() => onDelete(coupon)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function CouponFormModal({ coupon, onClose, onSave }) {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    type: coupon?.type || 'percentage',
    value: coupon?.value || '',
    applies_to: coupon?.applies_to || 'all',
    min_purchase: coupon?.min_purchase || '',
    max_discount: coupon?.max_discount || '',
    max_uses: coupon?.max_uses || '',
    valid_to: coupon?.valid_to ? coupon.valid_to.split('T')[0] : '',
    is_active: coupon?.is_active ?? true,
    is_public: coupon?.is_public ?? false
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...form,
        value: parseFloat(form.value),
        min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : null,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_to: form.valid_to || null
      }
      
      const res = coupon
        ? await axios.put(`/api/admin/coupons/${coupon.id}`, data)
        : await axios.post('/api/admin/coupons', data)
      
      if (res.data.success) {
        toast.success(coupon ? 'Cupón actualizado' : 'Cupón creado')
        onSave()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error guardando cupón')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-purple-600" />
            {coupon ? 'Editar cupón' : 'Nuevo cupón'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Código */}
          {!coupon && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="INFORYSK20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descuento de bienvenida"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Tipo y valor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                disabled={!!coupon}
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'percentage' ? '10' : '50'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Aplica a */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aplica a *</label>
            <select
              value={form.applies_to}
              onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todo</option>
              <option value="report_pack">Solo packs de informes</option>
              <option value="subscription">Solo suscripciones</option>
            </select>
          </div>

          {/* Límites */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compra mínima</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.min_purchase}
                onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.type === 'percentage' ? 'Descuento máximo' : 'Usos máximos'}
              </label>
              <input
                type="number"
                min="0"
                value={form.type === 'percentage' ? form.max_discount : form.max_uses}
                onChange={(e) => setForm({ 
                  ...form, 
                  [form.type === 'percentage' ? 'max_discount' : 'max_uses']: e.target.value 
                })}
                placeholder="Sin límite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Usos máximos (si es fixed) */}
          {form.type === 'fixed' && (
            <div className="hidden">
              {/* max_uses ya está arriba para fixed */}
            </div>
          )}
          {form.type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usos máximos</label>
              <input
                type="number"
                min="0"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Sin límite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Fecha de expiración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de expiración</label>
            <input
              type="date"
              value={form.valid_to}
              onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Activo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Público (visible para todos)</span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {coupon ? 'Guardar cambios' : 'Crear cupón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignCouponModal({ coupon, clients: initialClients, onClose, onAssigned }) {
  const [selectedClient, setSelectedClient] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(true)

  useEffect(() => {
    loadAssignments()
    loadClients()
  }, [coupon.id])

  // Actualizar clientes cuando cambien las props
  useEffect(() => {
    if (initialClients && initialClients.length > 0) {
      setClients(initialClients)
      setLoadingClients(false)
    }
  }, [initialClients])

  const loadClients = async () => {
    setLoadingClients(true)
    try {
      const res = await axios.get('/api/admin/coupons/clients')
      console.log('Clientes cargados:', res.data) // Debug
      if (res.data.success) {
        setClients(res.data.clients || [])
      }
    } catch (err) {
      console.error('Error cargando clientes:', err)
      toast.error('Error cargando lista de clientes')
    }
    setLoadingClients(false)
  }

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/admin/coupons/${coupon.id}/assignments`)
      if (res.data.success) {
        setAssignments(res.data.assignments || [])
      }
    } catch (err) { /* ignore */ }
    setLoading(false)
  }

  const handleAssign = async () => {
    if (!selectedClient) {
      toast.error('Selecciona un cliente')
      return
    }
    setAssigning(true)
    try {
      const res = await axios.post(`/api/admin/coupons/${coupon.id}/assign`, {
        empresa_cliente_id: selectedClient.id
      })
      if (res.data.success) {
        toast.success('Cupón asignado')
        setSelectedClient(null)
        setSearchTerm('')
        loadAssignments()
        onAssigned()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error asignando cupón')
    }
    setAssigning(false)
  }

  const clearSelection = () => {
    setSelectedClient(null)
    setSearchTerm('')
  }

  // Filtrar clientes por búsqueda
  const filteredClients = clients.filter(c => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    // Buscar en todos los campos posibles
    const searchFields = [
      c.razon_social,
      c.nombre,  // Campo alternativo
      c.admin_nombre,
      c.cuit,
      c.identificacion,  // Campo alternativo
      c.admin_email
    ]
    return searchFields.some(field => 
      field && String(field).toLowerCase().includes(term)
    )
  })

  // IDs ya asignados (para deshabilitar)
  const assignedIds = new Set(assignments.map(a => a.empresa_cliente_id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Asignar cupón a cliente
            </h2>
            <p className="text-sm text-gray-500">
              Cupón: <code className="font-mono bg-purple-50 px-1.5 py-0.5 rounded font-bold text-purple-700">{coupon.code}</code>
              {coupon.description && <span className="ml-2 text-gray-400">• {coupon.description}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Cliente seleccionado */}
          {selectedClient && (
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-purple-600 font-medium mb-1">Cliente seleccionado:</p>
                  <p className="font-bold text-gray-900">{selectedClient.razon_social || selectedClient.nombre || 'Sin nombre'}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    {(selectedClient.cuit || selectedClient.identificacion) && (
                      <span className="font-mono bg-white px-2 py-0.5 rounded">CUIT: {selectedClient.cuit || selectedClient.identificacion}</span>
                    )}
                    {selectedClient.admin_nombre && (
                      <span>Admin: {selectedClient.admin_nombre}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearSelection}
                  className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                  title="Quitar selección"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="mt-3 w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar asignación
              </button>
            </div>
          )}

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por razón social, CUIT, admin o email..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Lista de clientes */}
          <div>
            <p className="text-xs text-gray-500 mb-2">
              {loadingClients ? 'Cargando clientes...' : `${filteredClients.length} cliente${filteredClients.length !== 1 ? 's' : ''} disponible${filteredClients.length !== 1 ? 's' : ''}`}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
              {loadingClients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">
                    {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes disponibles'}
                  </p>
                  {!searchTerm && clients.length === 0 && (
                    <button
                      onClick={loadClients}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Reintentar carga
                    </button>
                  )}
                </div>
              ) : (
                filteredClients.map(c => {
                  const isAssigned = assignedIds.has(c.id)
                  const isSelected = selectedClient?.id === c.id
                  const clientName = c.razon_social || c.nombre || 'Sin nombre'
                  const clientCuit = c.cuit || c.identificacion
                  return (
                    <button
                      key={c.id}
                      onClick={() => !isAssigned && setSelectedClient(c)}
                      disabled={isAssigned}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-purple-100 border-2 border-purple-500'
                          : isAssigned
                          ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{clientName}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {clientCuit && (
                              <span className="text-xs font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                {clientCuit}
                              </span>
                            )}
                            {c.admin_nombre && (
                              <span className="text-xs text-gray-500">
                                👤 {c.admin_nombre}
                              </span>
                            )}
                            {c.admin_email && (
                              <span className="text-xs text-gray-400 truncate">
                                {c.admin_email}
                              </span>
                            )}
                          </div>
                        </div>
                        {isAssigned && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                            Ya asignado
                          </span>
                        )}
                        {isSelected && !isAssigned && (
                          <CheckCircle className="h-5 w-5 text-purple-600 ml-2 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Lista de asignaciones actuales */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Asignaciones actuales ({assignments.length})
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">Sin asignaciones</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{a.empresa_nombre || a.usuario_nombre}</p>
                      <p className="text-xs text-gray-500">
                        Asignado el {new Date(a.assigned_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    {a.is_used ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Usado</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Pendiente</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CouponUsageModal({ coupon, onClose }) {
  const [usage, setUsage] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsage()
  }, [coupon.id])

  const loadUsage = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/admin/coupons/${coupon.id}/usage`)
      if (res.data.success) {
        setUsage(res.data.usage || [])
      }
    } catch (err) { /* ignore */ }
    setLoading(false)
  }

  const totalDiscount = usage.reduce((sum, u) => sum + (u.discount_amount || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Historial de uso
            </h2>
            <p className="text-sm text-gray-500">
              <code className="font-mono bg-purple-50 px-1.5 py-0.5 rounded">{coupon.code}</code>
              {' • '}
              Total descuentos: <span className="font-bold text-green-600">${totalDiscount.toFixed(2)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : usage.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Este cupón aún no ha sido usado</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">Tipo compra</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Original</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Descuento</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Final</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usage.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{u.usuario_nombre || '-'}</p>
                      <p className="text-xs text-gray-500">{u.empresa_nombre}</p>
                    </td>
                    <td className="py-2 text-gray-600">{u.purchase_type}</td>
                    <td className="py-2 text-right text-gray-600">${Number(u.original_amount || 0).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium text-green-600">-${Number(u.discount_amount || 0).toFixed(2)}</td>
                    <td className="py-2 text-right font-bold text-gray-900">${Number(u.final_amount || 0).toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-500">
                      {new Date(u.used_at).toLocaleDateString('es-ES', { 
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

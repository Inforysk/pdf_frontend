import { useState, useEffect } from 'react'
import { 
  Users, Building2, Plus, Edit2, Trash2, Save, X, Loader2, 
  RefreshCw, Calculator, TrendingUp, DollarSign, Award, 
  ChevronDown, ChevronRight, ArrowUpDown, Percent, Globe2, Search
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

// ============================================
// TABS INTERNOS
// ============================================
const SUBTABS = [
  { key: 'proveedores', label: 'Proveedores Fijos', icon: Building2 },
  { key: 'clientes', label: 'Clientes Asignados', icon: Users },
  { key: 'margenes', label: 'Márgenes', icon: Percent },
  { key: 'simulador', label: 'Simulador', icon: Calculator },
]

export default function AdminProveedoresView() {
  const [activeSubTab, setActiveSubTab] = useState('proveedores')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          Motor de Pricing - Proveedores Fijos
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona proveedores, asignaciones de clientes, márgenes y simula precios
        </p>

        {/* Sub-tabs */}
        <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
          {SUBTABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeSubTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'proveedores' && <ProveedoresTab />}
      {activeSubTab === 'clientes' && <ClientesProveedorTab />}
      {activeSubTab === 'margenes' && <MargenesTab />}
      {activeSubTab === 'simulador' && <SimuladorTab />}
    </div>
  )
}

// ============================================
// TAB: PROVEEDORES FIJOS
// ============================================
function ProveedoresTab() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/proveedores')
      if (res.data.success) setProveedores(res.data.proveedores)
    } catch (err) {
      toast.error('Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data) => {
    try {
      if (editing) {
        await axios.put(`/api/admin/proveedores/${editing.id}`, data)
        toast.success('Proveedor actualizado')
      } else {
        await axios.post('/api/admin/proveedores', data)
        toast.success('Proveedor creado')
      }
      setShowForm(false)
      setEditing(null)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  const handleToggleActive = async (prov) => {
    try {
      await axios.put(`/api/admin/proveedores/${prov.id}`, { activo: !prov.activo })
      toast.success(prov.activo ? 'Proveedor desactivado' : 'Proveedor activado')
      loadData()
    } catch { toast.error('Error') }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Proveedores de Informes</h4>
          <p className="text-sm text-gray-500">{proveedores.length} proveedores configurados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary text-sm flex items-center gap-1">
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <ProveedorForm 
          proveedor={editing} 
          onSave={handleSave} 
          onCancel={() => { setShowForm(false); setEditing(null) }} 
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Moneda</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clientes</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {proveedores.map(prov => (
              <tr key={prov.id} className={!prov.activo ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-4 py-3">
                  <span className="font-mono font-medium text-sm">{prov.codigo}</span>
                </td>
                <td className="px-4 py-3">
                  <div>{prov.nombre}</div>
                  {prov.descripcion && <div className="text-xs text-gray-500">{prov.descripcion}</div>}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm">{prov.moneda_defecto}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium">{prov.clientes_asignados || 0}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(prov)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      prov.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {prov.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditing(prov); setShowForm(true) }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {proveedores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay proveedores configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// FORM: PROVEEDOR
// ============================================
function ProveedorForm({ proveedor, onSave, onCancel }) {
  const [form, setForm] = useState({
    codigo: proveedor?.codigo || '',
    nombre: proveedor?.nombre || '',
    descripcion: proveedor?.descripcion || '',
    moneda_defecto: proveedor?.moneda_defecto || 'EUR',
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
      <h5 className="font-medium mb-3">{proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
          <input
            type="text"
            value={form.codigo}
            onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
            disabled={!!proveedor}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="EULER"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Euler Hermes"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
          <select
            value={form.moneda_defecto}
            onChange={e => setForm({ ...form, moneda_defecto: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text"
            value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Proveedor de informes comerciales..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          <X className="h-4 w-4" /> Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {proveedor ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

// ============================================
// TAB: CLIENTES ASIGNADOS A PROVEEDORES
// ============================================
function ClientesProveedorTab() {
  const [proveedores, setProveedores] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedProv, setExpandedProv] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [provRes, empRes] = await Promise.all([
        axios.get('/api/admin/proveedores'),
        axios.get('/api/admin/empresas-clientes'),
      ])
      if (provRes.data.success) setProveedores(provRes.data.proveedores.filter(p => p.activo))
      if (empRes.data.success) setEmpresas(empRes.data.empresas || [])
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const loadClientesProveedor = async (proveedorId) => {
    try {
      const res = await axios.get(`/api/admin/proveedores/${proveedorId}/clientes`)
      if (res.data.success) {
        setAsignaciones(prev => ({ ...prev, [proveedorId]: res.data.clientes }))
      }
    } catch (err) {
      toast.error('Error al cargar clientes')
    }
  }

  const handleExpand = (provId) => {
    if (expandedProv === provId) {
      setExpandedProv(null)
    } else {
      setExpandedProv(provId)
      if (!asignaciones[provId]) {
        loadClientesProveedor(provId)
      }
    }
  }

  const handleAsignar = async (data) => {
    try {
      await axios.post('/api/admin/cliente-proveedor', data)
      toast.success('Cliente asignado correctamente')
      setShowForm(false)
      loadData()
      if (expandedProv) loadClientesProveedor(expandedProv)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  const handleDesasignar = async (asignacionId, provId) => {
    if (!confirm('¿Desasignar este cliente del proveedor?')) return
    try {
      await axios.delete(`/api/admin/cliente-proveedor/${asignacionId}`)
      toast.success('Cliente desasignado')
      loadClientesProveedor(provId)
    } catch (err) {
      toast.error('Error')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Asignación de Clientes</h4>
          <p className="text-sm text-gray-500">Asigna empresas clientes a proveedores fijos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1">
          <Plus className="h-4 w-4" /> Nueva Asignación
        </button>
      </div>

      {/* Form asignación */}
      {showForm && (
        <AsignacionForm 
          proveedores={proveedores}
          empresas={empresas}
          onSave={handleAsignar}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lista de proveedores con clientes */}
      <div className="space-y-2">
        {proveedores.map(prov => (
          <div key={prov.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => handleExpand(prov.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedProv === prov.id ? 
                  <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                }
                <span className="font-mono font-medium text-sm">{prov.codigo}</span>
                <span className="text-gray-600">{prov.nombre}</span>
              </div>
              <span className="text-sm text-gray-500">{prov.clientes_asignados || 0} clientes</span>
            </button>
            
            {expandedProv === prov.id && (
              <div className="border-t bg-gray-50 p-4">
                {asignaciones[prov.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {asignaciones[prov.id].map(a => (
                      <div key={a.id} className={`flex items-center justify-between p-2 rounded ${a.activo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                        <div>
                          <span className="font-medium">{a.empresa_nombre}</span>
                          <span className="text-xs text-gray-500 ml-2">{a.empresa_cuit}</span>
                          {a.descuento_pct > 0 && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1 rounded">
                              -{a.descuento_pct}%
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDesasignar(a.id, prov.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay clientes asignados a este proveedor
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// FORM: ASIGNACIÓN
// ============================================
function AsignacionForm({ proveedores, empresas, onSave, onCancel }) {
  const [form, setForm] = useState({
    empresa_cliente_id: '',
    proveedor_id: '',
    usa_precio_lista: true,
    aplicar_margen: true,
    descuento_pct: 0,
    notas: '',
  })
  const [saving, setSaving] = useState(false)
  const [searchEmpresa, setSearchEmpresa] = useState('')

  const filteredEmpresas = empresas.filter(e => 
    e.nombre?.toLowerCase().includes(searchEmpresa.toLowerCase()) ||
    e.identificacion?.includes(searchEmpresa)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.empresa_cliente_id || !form.proveedor_id) {
      toast.error('Selecciona empresa y proveedor')
      return
    }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 border">
      <h5 className="font-medium mb-3">Nueva Asignación Cliente-Proveedor</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Empresa Cliente</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={searchEmpresa}
              onChange={e => setSearchEmpresa(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm mb-1"
            />
            <select
              value={form.empresa_cliente_id}
              onChange={e => setForm({ ...form, empresa_cliente_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
              size={4}
            >
              <option value="">-- Seleccionar --</option>
              {filteredEmpresas.slice(0, 20).map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.identificacion})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
          <select
            value={form.proveedor_id}
            onChange={e => setForm({ ...form, proveedor_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">-- Seleccionar --</option>
            {proveedores.map(prov => (
              <option key={prov.id} value={prov.id}>
                {prov.codigo} - {prov.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Descuento (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.descuento_pct}
            onChange={e => setForm({ ...form, descuento_pct: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.aplicar_margen}
              onChange={e => setForm({ ...form, aplicar_margen: e.target.checked })}
            />
            Aplicar margen
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.usa_precio_lista}
              onChange={e => setForm({ ...form, usa_precio_lista: e.target.checked })}
            />
            Usar precio lista
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Asignar
        </button>
      </div>
    </form>
  )
}

// ============================================
// TAB: MÁRGENES
// ============================================
function MargenesTab() {
  const [margenes, setMargenes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [margRes, provRes] = await Promise.all([
        axios.get('/api/admin/pricing/margenes'),
        axios.get('/api/admin/proveedores'),
      ])
      if (margRes.data.success) setMargenes(margRes.data.margenes)
      if (provRes.data.success) setProveedores(provRes.data.proveedores)
    } catch (err) {
      toast.error('Error al cargar márgenes')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data) => {
    try {
      if (editing) {
        await axios.put(`/api/admin/pricing/margenes/${editing.id}`, data)
        toast.success('Margen actualizado')
      } else {
        await axios.post('/api/admin/pricing/margenes', data)
        toast.success('Margen creado')
      }
      setShowForm(false)
      setEditing(null)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Configuración de Márgenes</h4>
          <p className="text-sm text-gray-500">Define márgenes globales, por proveedor o por cliente</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary text-sm flex items-center gap-1">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {showForm && (
        <MargenForm
          margen={editing}
          proveedores={proveedores}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mín %</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Objetivo %</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Máx %</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Urgente +%</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">72hrs +%</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {margenes.map(m => (
              <tr key={m.id} className={!m.activo ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.scope === 'global' ? 'bg-purple-100 text-purple-700' :
                      m.scope === 'proveedor' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {m.scope}
                    </span>
                    <span className="text-sm">{m.scope_nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm">{m.margen_min_pct}%</td>
                <td className="px-4 py-3 text-center font-mono text-sm font-medium">{m.margen_objetivo_pct}%</td>
                <td className="px-4 py-3 text-center font-mono text-sm">{m.margen_max_pct}%</td>
                <td className="px-4 py-3 text-center font-mono text-sm text-orange-600">+{m.markup_urgente_pct || 0}%</td>
                <td className="px-4 py-3 text-center font-mono text-sm text-blue-600">+{m.markup_72hrs_pct || 0}%</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditing(m); setShowForm(true) }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {margenes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No hay márgenes configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// FORM: MARGEN
// ============================================
function MargenForm({ margen, proveedores, onSave, onCancel }) {
  const [form, setForm] = useState({
    scope: margen?.scope || 'global',
    scope_id: margen?.scope_id || null,
    margen_min_pct: margen?.margen_min_pct || 15,
    margen_objetivo_pct: margen?.margen_objetivo_pct || 25,
    margen_max_pct: margen?.margen_max_pct || 50,
    markup_urgente_pct: margen?.markup_urgente_pct || 0,
    markup_72hrs_pct: margen?.markup_72hrs_pct || 0,
    redondeo: margen?.redondeo || 'entero',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 border">
      <h5 className="font-medium mb-3">{margen ? 'Editar Margen' : 'Nuevo Margen'}</h5>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Scope</label>
          <select
            value={form.scope}
            onChange={e => setForm({ ...form, scope: e.target.value, scope_id: null })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            disabled={!!margen}
          >
            <option value="global">Global</option>
            <option value="proveedor">Por Proveedor</option>
            <option value="cliente">Por Cliente</option>
          </select>
        </div>
        {form.scope === 'proveedor' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              value={form.scope_id || ''}
              onChange={e => setForm({ ...form, scope_id: parseInt(e.target.value) || null })}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Margen Mínimo %</label>
          <input
            type="number"
            step="0.1"
            value={form.margen_min_pct}
            onChange={e => setForm({ ...form, margen_min_pct: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Margen Objetivo %</label>
          <input
            type="number"
            step="0.1"
            value={form.margen_objetivo_pct}
            onChange={e => setForm({ ...form, margen_objetivo_pct: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Margen Máximo %</label>
          <input
            type="number"
            step="0.1"
            value={form.margen_max_pct}
            onChange={e => setForm({ ...form, margen_max_pct: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Markup Urgente %</label>
          <input
            type="number"
            step="0.1"
            value={form.markup_urgente_pct}
            onChange={e => setForm({ ...form, markup_urgente_pct: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Markup 72hrs %</label>
          <input
            type="number"
            step="0.1"
            value={form.markup_72hrs_pct}
            onChange={e => setForm({ ...form, markup_72hrs_pct: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Redondeo</label>
          <select
            value={form.redondeo}
            onChange={e => setForm({ ...form, redondeo: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="entero">Entero</option>
            <option value="decena">Decena</option>
            <option value="decimal">2 decimales</option>
          </select>
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
// TAB: SIMULADOR DE PRECIOS
// ============================================

// Mapa de códigos ISO a nombres de países
const PAISES_NOMBRES = {
  AR: 'Argentina', BB: 'Barbados', BR: 'Brasil', BS: 'Bahamas',
  CA: 'Canadá', CL: 'Chile', CO: 'Colombia', DO: 'Rep. Dominicana',
  FK: 'Malvinas', GY: 'Guyana', JM: 'Jamaica', MX: 'México',
  PE: 'Perú', US: 'Estados Unidos', UY: 'Uruguay', VE: 'Venezuela'
}

function SimuladorTab() {
  const [empresas, setEmpresas] = useState([])
  const [paises, setPaises] = useState([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [resultado, setResultado] = useState(null)
  
  const [form, setForm] = useState({
    empresa_cliente_id: '',
    pais: '',
    urgencia: 'normal',
    moneda: 'EUR',
  })

  const [searchEmpresa, setSearchEmpresa] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [empRes, paisRes] = await Promise.all([
        axios.get('/api/admin/empresas-clientes'),
        axios.get('/api/admin/pricing/paises'),
      ])
      if (empRes.data.success) setEmpresas(empRes.data.empresas || [])
      if (paisRes.data.success) {
        setPaises(paisRes.data.paises || [])
      }
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSimular = async () => {
    if (!form.empresa_cliente_id || !form.pais) {
      toast.error('Selecciona empresa y país')
      return
    }
    setSimulating(true)
    setResultado(null)
    try {
      const res = await axios.post('/api/admin/pricing/simular', form)
      setResultado(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error en simulación')
    } finally {
      setSimulating(false)
    }
  }

  const filteredEmpresas = empresas.filter(e =>
    e.nombre?.toLowerCase().includes(searchEmpresa.toLowerCase()) ||
    e.identificacion?.includes(searchEmpresa)
  )

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Simulador de Precios
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Empresa Cliente</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchEmpresa}
              onChange={e => setSearchEmpresa(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm mb-1"
            />
            <select
              value={form.empresa_cliente_id}
              onChange={e => setForm({ ...form, empresa_cliente_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
              size={4}
            >
              <option value="">-- Seleccionar --</option>
              {filteredEmpresas.slice(0, 20).map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
            <select
              value={form.pais}
              onChange={e => setForm({ ...form, pais: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {paises.map(p => (
                <option key={p} value={p}>{PAISES_NOMBRES[p] || p} ({p})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Urgencia</label>
            <select
              value={form.urgencia}
              onChange={e => setForm({ ...form, urgencia: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="normal">Normal (5-7 días)</option>
              <option value="72hrs">72 horas</option>
              <option value="urgente">Urgente (24h)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
            <select
              value={form.moneda}
              onChange={e => setForm({ ...form, moneda: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSimular}
            disabled={simulating || !form.empresa_cliente_id || !form.pais}
            className="btn-primary flex items-center gap-2"
          >
            {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Simular Precio
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h4 className="font-medium text-gray-900 mb-4">Resultado de Simulación</h4>
          
          {resultado.success ? (
            <div className="space-y-4">
              {/* Precio principal */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Precio Final ({form.urgencia})</p>
                    <p className="text-4xl font-bold">{resultado.moneda} {resultado.precio_final?.toFixed(2)}</p>
                    <p className="text-sm mt-1 opacity-80">
                      Modalidad: {resultado.modalidad} 
                      {resultado.proveedor && ` | Proveedor: ${resultado.proveedor}`}
                    </p>
                  </div>
                  <DollarSign className="h-16 w-16 opacity-30" />
                </div>
              </div>

              {/* Desglose */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Costo Base</p>
                  <p className="text-xl font-bold text-gray-900">
                    {resultado.moneda} {resultado.costo_base?.toFixed(2) || resultado.precio_base?.toFixed(2)}
                  </p>
                </div>
                {resultado.margen_pct !== undefined && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase">Margen Aplicado</p>
                    <p className="text-xl font-bold text-green-600">+{resultado.margen_pct?.toFixed(1)}%</p>
                  </div>
                )}
                {resultado.descuento_pct > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase">Descuento Cliente</p>
                    <p className="text-xl font-bold text-red-600">-{resultado.descuento_pct?.toFixed(1)}%</p>
                  </div>
                )}
              </div>

              {/* Alternativas */}
              {resultado.alternativas && resultado.alternativas.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Alternativas de Proveedores</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {resultado.alternativas.map((alt, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                        alt.seleccionado ? 'bg-blue-50 border-blue-200' : 'bg-white'
                      }`}>
                        <div className="flex items-center gap-2">
                          {alt.seleccionado && <Award className="h-4 w-4 text-blue-600" />}
                          <span className="font-medium">{alt.proveedor}</span>
                        </div>
                        <span className="font-mono font-medium">
                          {resultado.moneda} {alt.precio_final?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 text-red-700 rounded-lg p-4">
              <p className="font-medium">Error en simulación</p>
              <p className="text-sm">{resultado.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { 
  Users, Building2, Plus, Edit2, Trash2, Save, X, Loader2, 
  RefreshCw, Calculator, TrendingUp, DollarSign, Award, 
  ChevronDown, ChevronRight, ArrowUpDown, Percent, Globe2, Search,
  AlertTriangle, ShieldAlert, ShieldCheck, Link2
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import AdminPricingExchangeRatesTab from './AdminPricingExchangeRatesTab'

// ============================================
// TABS INTERNOS
// ============================================
const SUBTABS = [
  { key: 'proveedores', label: 'Proveedores Fijos', icon: Building2 },
  { key: 'precios', label: 'Precios x País', icon: Globe2 },
  { key: 'tasas', label: 'Tasa de Cambio', icon: TrendingUp },
  { key: 'clientes', label: 'Clientes Asignados', icon: Users },
  { key: 'margenes', label: 'Márgenes', icon: Percent },
  { key: 'simulador', label: 'Simulador', icon: Calculator },
]

export default function AdminProveedoresView() {
  const [activeSubTab, setActiveSubTab] = useState('proveedores')

  return (
    <div className="space-y-4 px-1 sm:px-0">
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
        <div className="mt-4 bg-gray-100 rounded-lg p-1">
          <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap">
          {SUBTABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex min-h-11 items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all min-w-0 ${
                  activeSubTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-xs sm:text-sm">{tab.label}</span>
              </button>
            )
          })}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'proveedores' && <ProveedoresTab />}
      {activeSubTab === 'precios' && <PreciosPaisTab />}
      {activeSubTab === 'tasas' && <AdminPricingExchangeRatesTab />}
      {activeSubTab === 'clientes' && <ClientesProveedorTab />}
      {activeSubTab === 'margenes' && <MargenesTab />}
      {activeSubTab === 'simulador' && <SimuladorTab />}
    </div>
  )
}

// ============================================
// TAB: PRECIOS POR PAÍS
// ============================================
const PAISES_LABELS = {
  AR: 'Argentina', BB: 'Barbados', BR: 'Brasil', BS: 'Bahamas',
  CA: 'Canadá', CL: 'Chile', CO: 'Colombia', DO: 'Rep. Dominicana',
  FK: 'Malvinas', GY: 'Guyana', JM: 'Jamaica', MX: 'México',
  PE: 'Perú', US: 'Estados Unidos', UY: 'Uruguay', VE: 'Venezuela',
  EC: 'Ecuador', BO: 'Bolivia', PY: 'Paraguay', PA: 'Panamá',
  CR: 'Costa Rica', GT: 'Guatemala', HN: 'Honduras', NI: 'Nicaragua',
  SV: 'El Salvador', PR: 'Puerto Rico', CU: 'Cuba', HT: 'Haití',
}

const MONITOREO_PRECIO_EUR = 120

function PreciosPaisTab() {
  const [precios, setPrecios] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [paises, setPaises] = useState([])
  const [pricingPolicy, setPricingPolicy] = useState('notify')
  const [loading, setLoading] = useState(true)
  const [loadingMissing, setLoadingMissing] = useState(false)
  const [showMissingModal, setShowMissingModal] = useState(false)
  const [missingData, setMissingData] = useState(null)
  const [showSyncScopeModal, setShowSyncScopeModal] = useState(false)
  const [syncTargetRow, setSyncTargetRow] = useState(null)
  const [syncingScope, setSyncingScope] = useState(false)
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroPais, setFiltroPais] = useState('')
  const [filtroMoneda, setFiltroMoneda] = useState('EUR')
  const [eurUsd, setEurUsd] = useState(1.2)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [preciosRes, provRes] = await Promise.all([
        axios.get('/api/admin/proveedores/precios-pais'),
        axios.get('/api/admin/proveedores'),
      ])
      if (preciosRes.data.success) {
        setPrecios(preciosRes.data.precios)
        setPaises(preciosRes.data.paises || [])
      }
      if (provRes.data.success) setProveedores(provRes.data.proveedores)

      try {
        const policyRes = await axios.get('/api/admin/pricing/policy')
        if (policyRes.data?.success && policyRes.data?.mode) {
          setPricingPolicy(policyRes.data.mode)
        }
      } catch {
        // Mantener notify por defecto si el endpoint no responde.
      }

      try {
        const tasasRes = await axios.get('/api/admin/precios-pais/tasas-cambio')
        if (tasasRes.data?.success) {
          const tasaEurUsd = tasasRes.data.tasas?.find(
            t => t.moneda_origen === 'EUR' && t.moneda_destino === 'USD'
          )
          if (tasaEurUsd?.tasa) setEurUsd(Number(tasaEurUsd.tasa))
        }
      } catch {
        // Silencioso: si no hay endpoint disponible, usamos 1.20 por defecto.
      }
    } catch (err) {
      toast.error('Error al cargar precios')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (precio) => {
    setEditingId(precio.id)
    setEditForm({
      precio_normal: precio.precio_normal,
      precio_urgente: precio.precio_urgente,
      precio_72hrs: precio.precio_72hrs,
      precio_monitoreo: precio.precio_monitoreo ?? MONITOREO_PRECIO_EUR,
    })
  }

  const handleSave = async (precioId) => {
    try {
      const res = await axios.put(`/api/admin/proveedores/precios-pais/${precioId}`, editForm)
      if (res.data.success) {
        toast.success('Precio actualizado')
        setEditingId(null)
        loadData()
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    }
  }

  const handleUpdatePolicy = async (nextMode) => {
    try {
      const res = await axios.put('/api/admin/pricing/policy', { mode: nextMode })
      if (res.data.success) {
        setPricingPolicy(res.data.mode)
        toast.success(`Política actualizada: ${res.data.mode}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error actualizando política')
    }
  }

  const loadMissingForProvider = async (providerId) => {
    setLoadingMissing(true)
    try {
      const res = await axios.get(`/api/admin/proveedores/${providerId}/precios-pais/faltantes`)
      if (res.data.success) {
        setMissingData(res.data)
        setShowMissingModal(true)
      } else {
        toast.error(res.data.error || 'No se pudo cargar faltantes')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error cargando faltantes')
    } finally {
      setLoadingMissing(false)
    }
  }

  const handleOpenMissing = () => {
    if (!filtroProveedor) {
      toast.error('Selecciona un proveedor para ver faltantes y sincronizar')
      return
    }
    loadMissingForProvider(filtroProveedor)
  }

  const syncCountryToProvider = async ({ codigo_pais, providerId, manualValues = null, silent = false }) => {
    if (!providerId) return { success: false, error: 'Proveedor inválido' }
    const payload = {
      proveedor_id: providerId,
      codigo_pais,
      sync_from_global: !manualValues,
      overwrite: false,
      moneda: 'EUR',
    }
    if (manualValues) {
      payload.sync_from_global = false
      payload.precio_normal = manualValues.precio_normal
      payload.precio_urgente = manualValues.precio_urgente
      payload.precio_72hrs = manualValues.precio_72hrs
      payload.precio_monitoreo = manualValues.precio_monitoreo ?? MONITOREO_PRECIO_EUR
    }

    try {
      const res = await axios.post('/api/admin/proveedores/precios-pais', payload)
      if (res.data.success) {
        if (!silent) {
          toast.success('País agregado al motor pricing del proveedor')
        }
        return { success: true }
      } else {
        if (!silent) {
          toast.error(res.data.error || 'No se pudo sincronizar')
        }
        return { success: false, error: res.data.error || 'No se pudo sincronizar' }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error sincronizando país'
      if (!silent) {
        toast.error(msg)
      }
      return { success: false, error: msg }
    }
  }

  const handleSyncCountry = async ({ codigo_pais, manualValues = null }) => {
    if (!missingData?.proveedor?.id) return
    const result = await syncCountryToProvider({
      codigo_pais,
      providerId: missingData.proveedor.id,
      manualValues,
      silent: false,
    })
    if (result.success) {
      await loadData()
      await loadMissingForProvider(missingData.proveedor.id)
    }
  }

  const getMissingProvidersForCountry = (codigoPais) => {
    if (!codigoPais) return []
    const code = String(codigoPais).toUpperCase()
    const activos = (proveedores || []).filter(p => p.activo !== false)
    return activos.filter((prov) => {
      return !(precios || []).some(p => p.proveedor_id === prov.id && String(p.codigo_pais || '').toUpperCase() === code)
    })
  }

  const handleOpenSyncScope = (row) => {
    setSyncTargetRow(row)
    setShowSyncScopeModal(true)
  }

  const handleConfirmSyncScope = async (mode) => {
    if (!syncTargetRow?.codigo_pais) return
    setSyncingScope(true)
    try {
      const codigo = syncTargetRow.codigo_pais
      if (mode === 'current') {
        const result = await syncCountryToProvider({
          codigo_pais: codigo,
          providerId: missingData?.proveedor?.id,
          silent: false,
        })
        if (result.success) {
          setShowSyncScopeModal(false)
          setSyncTargetRow(null)
          await loadData()
          await loadMissingForProvider(missingData.proveedor.id)
        }
        return
      }

      const missingProviders = getMissingProvidersForCountry(codigo)
      if (missingProviders.length === 0) {
        toast('No hay proveedores pendientes para sincronizar en ese país')
        setShowSyncScopeModal(false)
        setSyncTargetRow(null)
        return
      }

      let ok = 0
      let fail = 0
      for (const prov of missingProviders) {
        const result = await syncCountryToProvider({
          codigo_pais: codigo,
          providerId: prov.id,
          silent: true,
        })
        if (result.success) ok += 1
        else fail += 1
      }

      if (ok > 0 && fail === 0) {
        toast.success(`Sincronizado ${codigo} en ${ok} proveedor(es)`)
      } else if (ok > 0 && fail > 0) {
        toast.success(`Sincronizado parcial: ${ok} ok, ${fail} con error`)
      } else {
        toast.error('No se pudo sincronizar en proveedores')
      }

      setShowSyncScopeModal(false)
      setSyncTargetRow(null)
      await loadData()
      if (missingData?.proveedor?.id) {
        await loadMissingForProvider(missingData.proveedor.id)
      }
    } finally {
      setSyncingScope(false)
    }
  }

  const preciosFiltrados = precios.filter(p => {
    if (filtroProveedor && p.proveedor_id !== parseInt(filtroProveedor)) return false
    if (filtroPais && p.codigo_pais !== filtroPais) return false
    return true
  })

  const formatPrecio = (value, monedaBase) => {
    const amount = Number(value || 0)
    if (filtroMoneda === 'USD') {
      if (monedaBase === 'USD') return `$${amount.toFixed(2)}`
      const converted = Math.round(amount * eurUsd)
      return `$${converted.toFixed(2)}`
    }
    if (monedaBase === 'EUR') return `€${amount.toFixed(2)}`
    const converted = Math.round(eurUsd > 0 ? amount / eurUsd : amount)
    return `€${converted.toFixed(2)}`
  }

  // Agrupar por proveedor
  const porProveedor = preciosFiltrados.reduce((acc, p) => {
    if (!acc[p.proveedor_codigo]) {
      acc[p.proveedor_codigo] = { nombre: p.proveedor_nombre, precios: [] }
    }
    acc[p.proveedor_codigo].precios.push(p)
    return acc
  }, {})

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-blue-600" />
            Precios por Proveedor y País
          </h4>
          <p className="text-sm text-gray-500">Precios de costo por proveedor, país y prioridad</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleOpenMissing}
            disabled={loadingMissing}
            className="btn-secondary text-sm flex items-center justify-center gap-1 w-full sm:w-auto"
          >
            {loadingMissing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Faltantes / Sync
          </button>
          <button onClick={loadData} className="btn-secondary text-sm flex items-center justify-center gap-1 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-start gap-2">
            {pricingPolicy === 'block' ? <ShieldAlert className="h-4 w-4 mt-0.5" /> : <ShieldCheck className="h-4 w-4 mt-0.5" />}
            <div>
              <p className="font-medium">Política de países sin pricing</p>
              <p className="text-xs text-amber-800">
                {pricingPolicy === 'block'
                  ? 'Modo BLOCK: se bloquea facturación automática cuando falta asociación proveedor-país.'
                  : 'Modo NOTIFY: se notifica y se permite cargar manualmente desde el modal.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleUpdatePolicy('notify')}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                pricingPolicy === 'notify' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-300 text-gray-600'
              }`}
            >
              NOTIFY
            </button>
            <button
              onClick={() => handleUpdatePolicy('block')}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                pricingPolicy === 'block' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-gray-300 text-gray-600'
              }`}
            >
              BLOCK
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
          <select
            value={filtroProveedor}
            onChange={e => setFiltroProveedor(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
          <select
            value={filtroPais}
            onChange={e => setFiltroPais(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Todos los países</option>
            {paises.map(p => (
              <option key={p} value={p}>{PAISES_LABELS[p] || p} ({p})</option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">Moneda de vista</label>
          <select
            value={filtroMoneda}
            onChange={e => setFiltroMoneda(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Conversión usando tasa oficial actual: 1 EUR = {Number(eurUsd).toFixed(4)} USD</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="space-y-6">
        {Object.entries(porProveedor).map(([codigo, data]) => (
          <div key={codigo} className="mb-6">
            <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              {codigo} - {data.nombre}
            </h5>
            <div className="md:hidden border rounded-lg overflow-hidden divide-y divide-gray-100 bg-white">
              {data.precios.map(p => (
                <PrecioProveedorMobileCard
                  key={p.id}
                  precio={p}
                    formatoPrecio={formatPrecio}
                    monedaVista={filtroMoneda}
                  editingId={editingId}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              ))}
            </div>
            <table className="hidden md:table min-w-full divide-y divide-gray-200 border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">País</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Normal</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Urgente</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">72 hrs</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Monitoreo</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Moneda</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.precios.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {PAISES_LABELS[p.codigo_pais] || p.codigo_pais} ({p.codigo_pais})
                    </td>
                    {editingId === p.id ? (
                      <>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.precio_normal}
                            onChange={e => setEditForm({...editForm, precio_normal: parseFloat(e.target.value)})}
                            className="w-20 px-2 py-1 border rounded text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.precio_urgente}
                            onChange={e => setEditForm({...editForm, precio_urgente: parseFloat(e.target.value)})}
                            className="w-20 px-2 py-1 border rounded text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.precio_72hrs}
                            onChange={e => setEditForm({...editForm, precio_72hrs: parseFloat(e.target.value)})}
                            className="w-20 px-2 py-1 border rounded text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.precio_monitoreo}
                            onChange={e => setEditForm({...editForm, precio_monitoreo: parseFloat(e.target.value)})}
                            className="w-20 px-2 py-1 border rounded text-center text-sm text-violet-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-center text-sm">{p.moneda}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleSave(p.id)} className="text-green-600 hover:text-green-800 p-1 mr-1">
                            <Save className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800 p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-center font-mono text-sm">
                          {formatPrecio(p.precio_normal, p.moneda)}
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-sm text-orange-600">
                          {formatPrecio(p.precio_urgente, p.moneda)}
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-sm text-blue-600">
                          {formatPrecio(p.precio_72hrs, p.moneda)}
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-sm text-violet-700">
                          {formatPrecio(p.precio_monitoreo ?? MONITOREO_PRECIO_EUR, p.moneda)}
                        </td>
                        <td className="px-4 py-2 text-center text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.moneda === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            base: {p.moneda || 'EUR'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800 p-1">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {preciosFiltrados.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay precios configurados con los filtros seleccionados
          </div>
        )}
      </div>

      {showMissingModal && (
        <MissingPricingModal
          data={missingData}
          onClose={() => setShowMissingModal(false)}
          onSyncCountry={handleSyncCountry}
          onRequestSync={handleOpenSyncScope}
        />
      )}

      {showSyncScopeModal && (
        <SyncScopeModal
          targetRow={syncTargetRow}
          currentProvider={missingData?.proveedor}
          missingProviders={getMissingProvidersForCountry(syncTargetRow?.codigo_pais)}
          syncing={syncingScope}
          onClose={() => {
            if (syncingScope) return
            setShowSyncScopeModal(false)
            setSyncTargetRow(null)
          }}
          onConfirm={handleConfirmSyncScope}
        />
      )}
    </div>
  )
}

function MissingPricingModal({ data, onClose, onSyncCountry, onRequestSync }) {
  const [manualForm, setManualForm] = useState({})
  const [searchPais, setSearchPais] = useState('')
  const [selectedCodigo, setSelectedCodigo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [manualConfirmPayload, setManualConfirmPayload] = useState(null)
  const [confirmingManualSave, setConfirmingManualSave] = useState(false)
  const pageSize = 5

  if (!data) return null

  const manualRows = data.missing_in_both || []
  const countryOptions = useMemo(() => {
    return [...manualRows]
      .sort((a, b) => `${a.pais}`.localeCompare(`${b.pais}`))
      .map(r => ({ codigo_pais: r.codigo_pais, pais: r.pais }))
  }, [manualRows])

  const filteredManualRows = useMemo(() => {
    const q = (searchPais || '').trim().toLowerCase()
    return manualRows.filter((row) => {
      if (selectedCodigo && row.codigo_pais !== selectedCodigo) return false
      if (!q) return true
      const txt = `${row.pais || ''} ${row.codigo_pais || ''}`.toLowerCase()
      return txt.includes(q)
    })
  }, [manualRows, searchPais, selectedCodigo])

  const totalPages = Math.max(1, Math.ceil(filteredManualRows.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedManualRows = filteredManualRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchPais, selectedCodigo, data?.proveedor?.id])

  const getManualValues = (codigo) => {
    return manualForm[codigo] || {
      precio_normal: 0,
      precio_urgente: 0,
      precio_72hrs: 0,
      precio_monitoreo: MONITOREO_PRECIO_EUR,
    }
  }

  const updateManualValues = (codigo, field, value) => {
    const prev = getManualValues(codigo)
    setManualForm((curr) => ({
      ...curr,
      [codigo]: {
        ...prev,
        [field]: Number(value) || 0,
      }
    }))
  }

  const openManualConfirm = (row) => {
    const form = getManualValues(row.codigo_pais)
    setManualConfirmPayload({
      codigo_pais: row.codigo_pais,
      pais: row.pais,
      manualValues: {
        precio_normal: Number(form.precio_normal) || 0,
        precio_urgente: Number(form.precio_urgente) || 0,
        precio_72hrs: Number(form.precio_72hrs) || 0,
        precio_monitoreo: Number(form.precio_monitoreo) || MONITOREO_PRECIO_EUR,
      }
    })
  }

  const handleConfirmManualSave = async () => {
    if (!manualConfirmPayload) return
    setConfirmingManualSave(true)
    try {
      await onSyncCountry({
        codigo_pais: manualConfirmPayload.codigo_pais,
        manualValues: manualConfirmPayload.manualValues,
      })
      setManualConfirmPayload(null)
    } finally {
      setConfirmingManualSave(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              Diferenciador de Países - {data.proveedor?.codigo}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Faltantes en proveedor: {data.summary?.missing_in_provider || 0} | Sin base global: {data.summary?.missing_in_both || 0}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <h5 className="text-sm font-semibold text-gray-900 mb-2">1) Países con precio global (sync directo)</h5>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">País</th>
                    <th className="px-3 py-2 text-center">Normal</th>
                    <th className="px-3 py-2 text-center">Urgente</th>
                    <th className="px-3 py-2 text-center">72h</th>
                    <th className="px-3 py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.sync_candidates || []).map((row) => (
                    <tr key={`sync-${row.codigo_pais}`}>
                      <td className="px-3 py-2">{row.pais} ({row.codigo_pais})</td>
                      <td className="px-3 py-2 text-center">{Number(row.precio_normal || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">{Number(row.precio_urgente || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">{Number(row.precio_72hrs || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onRequestSync(row)}
                          className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                        >
                          Sincronizar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(data.sync_candidates || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-gray-500">No hay candidatos de sincronización</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-900 mb-2">2) Países sin precio global (carga manual)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <input
                type="text"
                value={searchPais}
                onChange={(e) => setSearchPais(e.target.value)}
                placeholder="Buscar país o código (ej: Andorra / AD)"
                className="px-3 py-2 border rounded-md text-sm"
              />
              <select
                value={selectedCodigo}
                onChange={(e) => setSelectedCodigo(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Todos los países</option>
                {countryOptions.map((opt) => (
                  <option key={opt.codigo_pais} value={opt.codigo_pais}>
                    {opt.pais} ({opt.codigo_pais})
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden md:grid md:grid-cols-5 gap-2 mb-2 px-1 text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
              <span>Normal</span>
              <span>Urgente</span>
              <span>72h</span>
              <span>Monitoreo (defecto 120)</span>
              <span className="text-right">Acción</span>
            </div>
            <div className="space-y-3">
              {paginatedManualRows.map((row) => {
                const form = getManualValues(row.codigo_pais)
                return (
                  <div key={`manual-${row.codigo_pais}`} className="border rounded-lg p-3">
                    <div className="font-medium text-sm text-gray-800 mb-2">{row.pais} ({row.codigo_pais})</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className="px-2 py-1.5 border rounded-md text-sm"
                        placeholder="Normal"
                        value={form.precio_normal}
                        onChange={(e) => updateManualValues(row.codigo_pais, 'precio_normal', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="px-2 py-1.5 border rounded-md text-sm"
                        placeholder="Urgente"
                        value={form.precio_urgente}
                        onChange={(e) => updateManualValues(row.codigo_pais, 'precio_urgente', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="px-2 py-1.5 border rounded-md text-sm"
                        placeholder="72h"
                        value={form.precio_72hrs}
                        onChange={(e) => updateManualValues(row.codigo_pais, 'precio_72hrs', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="px-2 py-1.5 border rounded-md text-sm"
                        placeholder="Monitoreo"
                        value={form.precio_monitoreo}
                        onChange={(e) => updateManualValues(row.codigo_pais, 'precio_monitoreo', e.target.value)}
                      />
                      <button
                        onClick={() => openManualConfirm(row)}
                        className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                      >
                        Guardar Manual
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredManualRows.length === 0 && (
                <div className="border rounded-lg p-4 text-center text-sm text-gray-500">
                  No hay países que coincidan con el filtro.
                </div>
              )}

              {filteredManualRows.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-gray-500">
                    Mostrando {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredManualRows.length)} de {filteredManualRows.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="px-2.5 py-1 text-xs border rounded-md disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-gray-600">Página {safePage} / {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="px-2.5 py-1 text-xs border rounded-md disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {manualConfirmPayload && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => {
          if (!confirmingManualSave) setManualConfirmPayload(null)
        }}>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">Confirmar carga manual</h4>
              <button
                onClick={() => setManualConfirmPayload(null)}
                disabled={confirmingManualSave}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <p className="text-gray-700">
                Se agregarán estos valores para <span className="font-semibold">{manualConfirmPayload.pais} ({manualConfirmPayload.codigo_pais})</span>:
              </p>

              <div className="border rounded-lg p-3 bg-gray-50 space-y-1 text-gray-800">
                <div className="flex items-center justify-between">
                  <span>Normal</span>
                  <span className="font-semibold">{Number(manualConfirmPayload.manualValues.precio_normal).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Urgente</span>
                  <span className="font-semibold">{Number(manualConfirmPayload.manualValues.precio_urgente).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>72h</span>
                  <span className="font-semibold">{Number(manualConfirmPayload.manualValues.precio_72hrs).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Monitoreo</span>
                  <span className="font-semibold">{Number(manualConfirmPayload.manualValues.precio_monitoreo).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setManualConfirmPayload(null)}
                  disabled={confirmingManualSave}
                  className="px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmManualSave}
                  disabled={confirmingManualSave}
                  className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {confirmingManualSave ? 'Guardando...' : 'Confirmar y Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SyncScopeModal({ targetRow, currentProvider, missingProviders, syncing, onClose, onConfirm }) {
  if (!targetRow) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h4 className="text-base font-semibold text-gray-900">Confirmar sincronización</h4>
          <button onClick={onClose} disabled={syncing} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <p className="text-gray-700">
            País: <span className="font-semibold">{targetRow.pais} ({targetRow.codigo_pais})</span>
          </p>
          <p className="text-gray-700">
            Proveedor actual: <span className="font-semibold">{currentProvider?.codigo} - {currentProvider?.nombre}</span>
          </p>

          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="font-medium text-gray-800 mb-2">Proveedores que hoy no tienen este país ({missingProviders.length})</p>
            <div className="max-h-44 overflow-y-auto text-xs text-gray-700 space-y-1">
              {missingProviders.length > 0 ? missingProviders.map((p) => (
                <div key={p.id}>- {p.codigo} - {p.nombre}</div>
              )) : <div>No hay faltantes para este país.</div>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={() => onConfirm('current')}
              disabled={syncing}
              className="px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Solo {currentProvider?.codigo}
            </button>
            <button
              onClick={() => onConfirm('all')}
              disabled={syncing || missingProviders.length === 0}
              className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar a todos los faltantes'}
            </button>
          </div>
        </div>
      </div>
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Proveedores de Informes</h4>
          <p className="text-sm text-gray-500">{proveedores.length} proveedores configurados</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={loadData} className="btn-secondary text-sm flex items-center justify-center gap-1 w-11 sm:w-auto sm:px-3">
            <RefreshCw className="h-4 w-4" />
          </button>
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary text-sm flex-1 sm:flex-none flex items-center justify-center gap-1">
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
      <div className="md:hidden divide-y divide-gray-100 border rounded-lg overflow-hidden">
        {proveedores.map(prov => (
          <ProveedorMobileCard
            key={prov.id}
            prov={prov}
            onToggleActive={() => handleToggleActive(prov)}
            onEdit={() => { setEditing(prov); setShowForm(true) }}
          />
        ))}
        {proveedores.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No hay proveedores configurados
          </div>
        )}
      </div>
      <div className="hidden md:block overflow-x-auto">
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
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm w-full sm:w-auto justify-center">
          <X className="h-4 w-4" /> Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary text-sm w-full sm:w-auto justify-center">
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Asignación de Clientes</h4>
          <p className="text-sm text-gray-500">Asigna empresas clientes a proveedores fijos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center justify-center gap-1 w-full sm:w-auto">
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
              className="w-full px-3 sm:px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0 text-left">
                <div className="pt-0.5 shrink-0">
                  {expandedProv === prov.id ? 
                    <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                    <span className="font-mono font-medium text-xs sm:text-sm break-all">{prov.codigo}</span>
                    <span className="text-sm text-gray-700 break-words">{prov.nombre}</span>
                  </div>
                  <span className="mt-1 inline-flex text-xs sm:text-sm text-gray-500">{prov.clientes_asignados || 0} clientes asignados</span>
                </div>
              </div>
            </button>
            
            {expandedProv === prov.id && (
              <div className="border-t bg-gray-50 p-4">
                {asignaciones[prov.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {asignaciones[prov.id].map(a => (
                      <div key={a.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border ${a.activo ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                        <div className="min-w-0 space-y-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words">{a.empresa_nombre}</p>
                            <p className="text-xs text-gray-500 break-all">{a.empresa_cuit}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${a.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                              {a.activo ? 'Activa' : 'Inactiva'}
                            </span>
                            {a.descuento_pct > 0 && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                                Descuento {a.descuento_pct}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDesasignar(a.id, prov.id)}
                          className="self-stretch sm:self-auto inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                          Desasignar
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

function ProveedorMobileCard({ prov, onToggleActive, onEdit }) {
  return (
    <div className={`p-4 space-y-3 ${!prov.activo ? 'bg-gray-50 opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-medium text-sm break-all">{prov.codigo}</p>
          <p className="font-medium text-gray-900 mt-1 break-words">{prov.nombre}</p>
          {prov.descripcion && <p className="text-xs text-gray-500 mt-1">{prov.descripcion}</p>}
        </div>
        <button
          onClick={onEdit}
          className="inline-flex items-center justify-center h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-400 mb-1">Moneda</p>
          <p className="font-mono text-sm">{prov.moneda_defecto}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-1">Clientes</p>
          <p className="font-medium text-sm">{prov.clientes_asignados || 0}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-1">Estado</p>
          <button
            onClick={onToggleActive}
            className={`px-2 py-1 rounded-full text-[11px] font-medium ${
              prov.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {prov.activo ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PrecioProveedorMobileCard({ precio: p, formatoPrecio, monedaVista, editingId, editForm, setEditForm, onEdit, onSave, onCancel }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 break-words">{PAISES_LABELS[p.codigo_pais] || p.codigo_pais} ({p.codigo_pais})</p>
          <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-[11px] font-medium ${
            p.moneda === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>
            base: {p.moneda || 'EUR'} | vista: {monedaVista}
          </span>
        </div>
        {editingId !== p.id && (
          <button onClick={() => onEdit(p)} className="inline-flex items-center justify-center h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0">
            <Edit2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {editingId === p.id ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            <input type="number" step="0.01" value={editForm.precio_normal} onChange={e => setEditForm({ ...editForm, precio_normal: parseFloat(e.target.value) })} className="w-full px-2 py-2 border rounded text-center text-sm" />
            <input type="number" step="0.01" value={editForm.precio_urgente} onChange={e => setEditForm({ ...editForm, precio_urgente: parseFloat(e.target.value) })} className="w-full px-2 py-2 border rounded text-center text-sm" />
            <input type="number" step="0.01" value={editForm.precio_72hrs} onChange={e => setEditForm({ ...editForm, precio_72hrs: parseFloat(e.target.value) })} className="w-full px-2 py-2 border rounded text-center text-sm" />
            <input type="number" step="0.01" value={editForm.precio_monitoreo} onChange={e => setEditForm({ ...editForm, precio_monitoreo: parseFloat(e.target.value) })} className="w-full px-2 py-2 border rounded text-center text-sm text-violet-700" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={() => onSave(p.id)} className="inline-flex items-center justify-center gap-1 px-3 py-2 text-[11px] text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"><Save className="h-3.5 w-3.5" /> Guardar</button>
            <button onClick={onCancel} className="inline-flex items-center justify-center gap-1 px-3 py-2 text-[11px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"><X className="h-3.5 w-3.5" /> Cancelar</button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div><p className="text-gray-400 mb-1">Normal</p><p className="font-mono text-sm">{formatoPrecio(p.precio_normal, p.moneda)}</p></div>
          <div><p className="text-gray-400 mb-1">Urgente</p><p className="font-mono text-sm text-orange-600">{formatoPrecio(p.precio_urgente, p.moneda)}</p></div>
          <div><p className="text-gray-400 mb-1">72 hrs</p><p className="font-mono text-sm text-blue-600">{formatoPrecio(p.precio_72hrs, p.moneda)}</p></div>
          <div><p className="text-gray-400 mb-1">Monitoreo</p><p className="font-mono text-sm text-violet-700">{formatoPrecio(p.precio_monitoreo ?? MONITOREO_PRECIO_EUR, p.moneda)}</p></div>
        </div>
      )}
    </div>
  )
}

function MargenMobileCard({ margen: m, onEdit }) {
  return (
    <div className={`p-4 space-y-3 ${!m.activo ? 'bg-gray-50 opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            m.scope === 'global' ? 'bg-purple-100 text-purple-700' :
            m.scope === 'proveedor' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {m.scope}
          </span>
          <span className="text-sm text-gray-700 break-words">{m.scope_nombre}</span>
        </div>
        <button onClick={onEdit} className="inline-flex items-center justify-center h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0">
          <Edit2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><p className="text-gray-400 mb-1">Min %</p><p className="font-mono text-sm">{m.margen_min_pct}%</p></div>
        <div><p className="text-gray-400 mb-1">Objetivo %</p><p className="font-mono text-sm font-medium">{m.margen_objetivo_pct}%</p></div>
        <div><p className="text-gray-400 mb-1">Max %</p><p className="font-mono text-sm">{m.margen_max_pct}%</p></div>
        <div><p className="text-gray-400 mb-1">Urgente +%</p><p className="font-mono text-sm text-orange-600">+{m.markup_urgente_pct || 0}%</p></div>
        <div><p className="text-gray-400 mb-1">72hrs +%</p><p className="font-mono text-sm text-blue-600">+{m.markup_72hrs_pct || 0}%</p></div>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
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
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm w-full sm:w-auto justify-center">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm w-full sm:w-auto justify-center">
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Configuración de Márgenes</h4>
          <p className="text-sm text-gray-500">Define márgenes globales, por proveedor o por cliente</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary text-sm flex items-center justify-center gap-1 w-full sm:w-auto">
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

      <div className="md:hidden divide-y divide-gray-100 border rounded-lg overflow-hidden">
        {margenes.map(m => (
          <MargenMobileCard key={m.id} margen={m} onEdit={() => { setEditing(m); setShowForm(true) }} />
        ))}
        {margenes.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No hay márgenes configurados
          </div>
        )}
      </div>
      <div className="hidden md:block overflow-x-auto">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm w-full sm:w-auto justify-center">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm w-full sm:w-auto justify-center">
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
              <option value="monitoreo">Monitoreo (tarifa fija €120)</option>
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
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
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
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm opacity-80">Precio Final ({form.urgencia})</p>
                    <p className="text-3xl sm:text-4xl font-bold break-words">{resultado.moneda} {resultado.precio_final?.toFixed(2)}</p>
                    <p className="text-sm mt-1 opacity-80 break-words">
                      Modalidad: {resultado.modalidad} 
                      {resultado.proveedor && ` | Proveedor: ${resultado.proveedor}`}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 sm:h-16 sm:w-16 opacity-30 shrink-0" />
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
                      <div key={i} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border ${
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

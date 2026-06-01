import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Globe, Plus, Search, Edit2, Trash2, Save, X, RefreshCw, Loader2,
  DollarSign, Euro, Clock, Zap, FileText, Upload, Download, History,
  Users, Filter, ChevronDown, ChevronRight, Eye, ToggleLeft, ToggleRight,
  Calendar, Percent, AlertCircle, CheckCircle, MapPin, Settings
} from 'lucide-react'

// Configuración de urgencias
const URGENCIA_CONFIG = {
  normal: { label: 'Normal', icon: FileText, color: 'text-blue-600 bg-blue-50', days: '5-7 días' },
  urgente: { label: 'Urgente', icon: Zap, color: 'text-orange-600 bg-orange-50', days: '48-72 hrs' },
  '72hrs': { label: '72 Horas', icon: Clock, color: 'text-red-600 bg-red-50', days: '72 hrs' }
}

export default function AdminPreciosPaisView() {
  const [precios, setPrecios] = useState([])
  const [regiones, setRegiones] = useState([])
  const [tasas, setTasas] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPrecio, setEditingPrecio] = useState(null)
  const [showHistorial, setShowHistorial] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showTasasModal, setShowTasasModal] = useState(false)
  const [expandedRegions, setExpandedRegions] = useState({})

  useEffect(() => {
    loadPrecios()
  }, [selectedRegion, showInactive])

  const loadPrecios = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedRegion) params.append('region_id', selectedRegion)
      if (showInactive) params.append('include_inactive', 'true')
      
      const res = await axios.get(`/api/admin/precios-pais?${params}`)
      if (res.data.success) {
        setPrecios(res.data.precios || [])
        setRegiones(res.data.regiones || [])
        setTasas(res.data.tasas || {})
        // Expandir todas las regiones por defecto
        const expanded = {}
        res.data.regiones?.forEach(r => expanded[r.id] = true)
        setExpandedRegions(expanded)
      }
    } catch (err) {
      toast.error('Error cargando precios')
    }
    setLoading(false)
  }

  const handleSave = async (data) => {
    try {
      if (editingPrecio) {
        const res = await axios.put(`/api/admin/precios-pais/${editingPrecio.id}`, data)
        if (res.data.success) {
          toast.success('Precio actualizado')
          loadPrecios()
          setShowModal(false)
          setEditingPrecio(null)
        } else {
          toast.error(res.data.error)
        }
      } else {
        const res = await axios.post('/api/admin/precios-pais', data)
        if (res.data.success) {
          toast.success('Precio creado')
          loadPrecios()
          setShowModal(false)
        } else {
          toast.error(res.data.error)
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error guardando')
    }
  }

  const handleDelete = async (precio) => {
    if (!confirm(`¿Desactivar precio de ${precio.pais}?`)) return
    try {
      const res = await axios.delete(`/api/admin/precios-pais/${precio.id}`)
      if (res.data.success) {
        toast.success('Precio desactivado')
        loadPrecios()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error('Error eliminando')
    }
  }

  const handleToggleActive = async (precio) => {
    const newStatus = !precio.is_active
    try {
      const res = await axios.put(`/api/admin/precios-pais/${precio.id}`, {
        is_active: newStatus,
        motivo_cambio: newStatus ? 'Reactivado' : 'Desactivado'
      })
      if (res.data.success) {
        toast.success(newStatus ? 'País activado' : 'País desactivado')
        loadPrecios()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error('Error cambiando estado')
    }
  }

  const handleExport = async () => {
    try {
      const res = await axios.get('/api/admin/precios-pais/exportar', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'precios_pais.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Exportado correctamente')
    } catch (err) {
      toast.error('Error exportando')
    }
  }

  // Filtrar por búsqueda
  const filteredPrecios = precios.filter(p =>
    p.pais.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo_pais || '').toLowerCase().includes(search.toLowerCase())
  )

  // Agrupar por región
  const preciosByRegion = filteredPrecios.reduce((acc, p) => {
    const regionKey = p.region_id || 0
    if (!acc[regionKey]) acc[regionKey] = []
    acc[regionKey].push(p)
    return acc
  }, {})

  // Métricas
  const totalPaises = precios.length
  const totalActivos = precios.filter(p => p.is_active).length
  const monedaBase = precios[0]?.moneda || 'EUR'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-7 w-7 text-indigo-600" />
            Precios por País
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Lista de precios de informes completos por país y urgencia
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowTasasModal(true)}
            className="h-11 w-full sm:w-auto sm:px-3 inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 sm:border-0"
            title="Tasas de cambio"
          >
            <Settings className="h-5 w-5" />
            <span className="ml-2 sm:hidden">Tasas</span>
          </button>
          <button
            onClick={loadPrecios}
            className="h-11 w-full sm:w-auto sm:px-3 inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 sm:border-0"
            title="Refrescar"
          >
            <RefreshCw className="h-5 w-5" />
            <span className="ml-2 sm:hidden">Actualizar</span>
          </button>
          <button
            onClick={handleExport}
            className="h-11 flex items-center justify-center gap-2 px-3 py-2 text-gray-700 bg-white border rounded-xl hover:bg-gray-50 text-sm"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="h-11 flex items-center justify-center gap-2 px-3 py-2 text-gray-700 bg-white border rounded-xl hover:bg-gray-50 text-sm"
          >
            <Upload className="h-4 w-4" />
            Importar
          </button>
          <button
            onClick={() => { setEditingPrecio(null); setShowModal(true) }}
            className="col-span-2 sm:col-span-1 w-full sm:w-auto h-11 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo país
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total países" value={totalPaises} icon={Globe} color="indigo" />
        <MetricCard label="Activos" value={totalActivos} icon={CheckCircle} color="green" />
        <MetricCard label="Regiones" value={regiones.length} icon={MapPin} color="purple" />
        <MetricCard 
          label="Moneda base" 
          value={monedaBase} 
          icon={monedaBase === 'EUR' ? Euro : DollarSign} 
          color="amber" 
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start sm:items-center">
        <div className="relative w-full max-w-none sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar país..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedRegion || ''}
            onChange={e => setSelectedRegion(e.target.value || null)}
            className="w-full sm:w-auto px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las regiones</option>
            {regiones.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            Ver inactivos
          </label>
        </div>
      </div>

      {/* Tabla de precios agrupada por región */}
      <div className="space-y-4">
        {regiones.map(region => {
          const regionPrecios = preciosByRegion[region.id] || []
          if (regionPrecios.length === 0 && !selectedRegion) return null
          
          const isExpanded = expandedRegions[region.id]
          
          return (
            <div key={region.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <button
                onClick={() => setExpandedRegions(prev => ({ ...prev, [region.id]: !prev[region.id] }))}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <MapPin className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-gray-900 truncate">{region.nombre}</span>
                  <span className="text-sm text-gray-500 whitespace-nowrap">({regionPrecios.length} países)</span>
                </div>
              </button>
              
              <AnimatePresence>
                {isExpanded && regionPrecios.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="md:hidden divide-y">
                      {regionPrecios.map(precio => (
                        <PrecioMobileCard
                          key={precio.id}
                          precio={precio}
                          tasas={tasas}
                          onEdit={() => { setEditingPrecio(precio); setShowModal(true) }}
                          onDelete={() => handleDelete(precio)}
                          onToggleActive={() => handleToggleActive(precio)}
                          onShowHistorial={() => setShowHistorial(precio)}
                        />
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-[920px] w-full">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">País</th>
                            <th className="px-4 py-3 text-center">Normal</th>
                            <th className="px-4 py-3 text-center">Urgente</th>
                            <th className="px-4 py-3 text-center">72 Hrs</th>
                            <th className="px-4 py-3 text-center">Conversión</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {regionPrecios.map(precio => (
                            <PrecioRow
                              key={precio.id}
                              precio={precio}
                              tasas={tasas}
                              onEdit={() => { setEditingPrecio(precio); setShowModal(true) }}
                              onDelete={() => handleDelete(precio)}
                              onToggleActive={() => handleToggleActive(precio)}
                              onShowHistorial={() => setShowHistorial(precio)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Países sin región */}
        {preciosByRegion[0]?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-100">
              <span className="font-semibold text-gray-700">Sin región asignada</span>
              <span className="text-sm text-gray-500 ml-2">({preciosByRegion[0].length} países)</span>
            </div>
            <div className="md:hidden divide-y">
              {preciosByRegion[0].map(precio => (
                <PrecioMobileCard
                  key={precio.id}
                  precio={precio}
                  tasas={tasas}
                  onEdit={() => { setEditingPrecio(precio); setShowModal(true) }}
                  onDelete={() => handleDelete(precio)}
                  onToggleActive={() => handleToggleActive(precio)}
                  onShowHistorial={() => setShowHistorial(precio)}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[920px] w-full">
                <tbody className="divide-y">
                  {preciosByRegion[0].map(precio => (
                    <PrecioRow
                      key={precio.id}
                      precio={precio}
                      tasas={tasas}
                      onEdit={() => { setEditingPrecio(precio); setShowModal(true) }}
                      onDelete={() => handleDelete(precio)}
                      onToggleActive={() => handleToggleActive(precio)}
                      onShowHistorial={() => setShowHistorial(precio)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {filteredPrecios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay precios configurados</p>
          <button 
            onClick={() => setShowModal(true)} 
            className="mt-3 text-indigo-600 hover:underline"
          >
            Crear primer precio
          </button>
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showModal && (
          <PrecioModal
            precio={editingPrecio}
            regiones={regiones}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingPrecio(null) }}
          />
        )}
        
        {showHistorial && (
          <HistorialModal
            precio={showHistorial}
            onClose={() => setShowHistorial(null)}
          />
        )}
        
        {showImportModal && (
          <ImportModal
            regiones={regiones}
            onClose={() => setShowImportModal(false)}
            onSuccess={() => { setShowImportModal(false); loadPrecios() }}
          />
        )}
        
        {showTasasModal && (
          <TasasModal
            tasas={tasas}
            onClose={() => setShowTasasModal(false)}
            onSuccess={() => { setShowTasasModal(false); loadPrecios() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ========================================
// COMPONENTES AUXILIARES
// ========================================

function MetricCard({ label, value, icon: Icon, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600'
  }

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border shadow-sm min-w-0">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${colors[color]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none break-words">{value}</p>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-tight">{label}</p>
        </div>
      </div>
    </div>
  )
}

function PrecioMobileCard({ precio, tasas, onEdit, onDelete, onToggleActive, onShowHistorial }) {
  const moneda = precio.moneda || 'EUR'
  const MonedaIcon = moneda === 'EUR' ? Euro : DollarSign

  const getConversion = () => {
    if (moneda === 'EUR') {
      const tasa = tasas['EUR_USD'] || 1.08
      return {
        label: 'USD',
        normal: (precio.precio_normal * tasa).toFixed(2),
        urgente: (precio.precio_urgente * tasa).toFixed(2),
        hrs72: (precio.precio_72hrs * tasa).toFixed(2)
      }
    }
    const tasa = tasas['USD_EUR'] || 0.93
    return {
      label: 'EUR',
      normal: (precio.precio_normal * tasa).toFixed(2),
      urgente: (precio.precio_urgente * tasa).toFixed(2),
      hrs72: (precio.precio_72hrs * tasa).toFixed(2)
    }
  }

  const conversion = getConversion()

  return (
    <div className={`p-4 space-y-3 ${!precio.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900 break-words">{precio.pais}</span>
            {precio.codigo_pais && (
              <span className="text-xs text-gray-400">({precio.codigo_pais})</span>
            )}
            {precio.clientes_especiales > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                {precio.clientes_especiales} especiales
              </span>
            )}
          </div>
          {precio.vigente_hasta && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              Hasta {new Date(precio.vigente_hasta).toLocaleDateString()}
            </p>
          )}
        </div>
        {precio.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-green-100 text-green-700 rounded-full whitespace-nowrap">
            <CheckCircle className="h-3 w-3" /> Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-200 text-gray-600 rounded-full whitespace-nowrap">
            Inactivo
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-400 mb-1">Normal</p>
          <div className="flex items-center gap-1">
            <MonedaIcon className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold">{precio.precio_normal}</span>
          </div>
        </div>
        <div>
          <p className="text-gray-400 mb-1">Urgente</p>
          <div className="flex items-center gap-1">
            <MonedaIcon className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-orange-600">{precio.precio_urgente}</span>
          </div>
        </div>
        <div>
          <p className="text-gray-400 mb-1">72 Hrs</p>
          <div className="flex items-center gap-1">
            <MonedaIcon className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-red-600">{precio.precio_72hrs}</span>
          </div>
        </div>
        <div className="col-span-3">
          <p className="text-gray-400 mb-1">Conversión {conversion.label}</p>
          <p className="text-[11px] text-gray-600 break-words">
            {conversion.normal} / {conversion.urgente} / {conversion.hrs72}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        {precio.cambios_count > 0 && (
          <button
            onClick={onShowHistorial}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
          >
            <History className="h-3.5 w-3.5" /> Historial
          </button>
        )}
        <button
          onClick={onToggleActive}
          className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] rounded-lg ${
            precio.is_active
              ? 'text-orange-700 bg-orange-50 hover:bg-orange-100'
              : 'text-green-700 bg-green-50 hover:bg-green-100'
          }`}
        >
          {precio.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          {precio.is_active ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
        >
          <Edit2 className="h-3.5 w-3.5" /> Editar
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-[11px] text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      </div>
    </div>
  )
}

function PrecioRow({ precio, tasas, onEdit, onDelete, onToggleActive, onShowHistorial }) {
  const moneda = precio.moneda || 'EUR'
  const MonedaIcon = moneda === 'EUR' ? Euro : DollarSign
  
  // Calcular conversión
  const getConversion = () => {
    if (moneda === 'EUR') {
      const tasa = tasas['EUR_USD'] || 1.08
      return {
        label: 'USD',
        normal: (precio.precio_normal * tasa).toFixed(2),
        urgente: (precio.precio_urgente * tasa).toFixed(2),
        hrs72: (precio.precio_72hrs * tasa).toFixed(2)
      }
    } else {
      const tasa = tasas['USD_EUR'] || 0.93
      return {
        label: 'EUR',
        normal: (precio.precio_normal * tasa).toFixed(2),
        urgente: (precio.precio_urgente * tasa).toFixed(2),
        hrs72: (precio.precio_72hrs * tasa).toFixed(2)
      }
    }
  }
  
  const conversion = getConversion()

  return (
    <tr className={`hover:bg-gray-50 transition ${!precio.is_active ? 'opacity-50 bg-gray-50' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{precio.pais}</span>
          {precio.codigo_pais && (
            <span className="text-xs text-gray-400">({precio.codigo_pais})</span>
          )}
          {precio.clientes_especiales > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              {precio.clientes_especiales} especiales
            </span>
          )}
        </div>
        {precio.vigente_hasta && (
          <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            Hasta {new Date(precio.vigente_hasta).toLocaleDateString()}
          </p>
        )}
      </td>
      
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <MonedaIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-semibold">{precio.precio_normal}</span>
        </div>
      </td>
      
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <MonedaIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-semibold text-orange-600">{precio.precio_urgente}</span>
        </div>
      </td>
      
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <MonedaIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-semibold text-red-600">{precio.precio_72hrs}</span>
        </div>
      </td>
      
      <td className="px-4 py-3 text-center">
        <div className="text-xs text-gray-500">
          <span className="font-medium">{conversion.label}</span>
          <span className="mx-1">→</span>
          <span>{conversion.normal} / {conversion.urgente} / {conversion.hrs72}</span>
        </div>
      </td>
      
      <td className="px-4 py-3 text-center">
        {precio.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
            Inactivo
          </span>
        )}
      </td>
      
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {precio.cambios_count > 0 && (
            <button
              onClick={onShowHistorial}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title={`Ver historial (${precio.cambios_count} cambios)`}
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onToggleActive}
            className={`p-1.5 rounded-lg transition ${
              precio.is_active 
                ? 'text-green-500 hover:text-orange-600 hover:bg-orange-50' 
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            }`}
            title={precio.is_active ? 'Desactivar' : 'Activar'}
          >
            {precio.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// Modal para crear/editar precio
function PrecioModal({ precio, regiones, onSave, onClose }) {
  const [form, setForm] = useState({
    pais: precio?.pais || '',
    codigo_pais: precio?.codigo_pais || '',
    region_id: precio?.region_id || '',
    precio_normal: precio?.precio_normal || 0,
    precio_urgente: precio?.precio_urgente || 0,
    precio_72hrs: precio?.precio_72hrs || 0,
    moneda: precio?.moneda || 'EUR',
    vigente_desde: precio?.vigente_desde?.split('T')[0] || '',
    vigente_hasta: precio?.vigente_hasta?.split('T')[0] || '',
    is_active: precio?.is_active !== false,
    motivo_cambio: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.pais.trim()) {
      toast.error('El país es requerido')
      return
    }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            {precio ? `Editar: ${precio.pais}` : 'Nuevo precio por país'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
              <input
                type="text"
                value={form.pais}
                onChange={e => setForm({ ...form, pais: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="ARGENTINA"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código ISO</label>
              <input
                type="text"
                value={form.codigo_pais}
                onChange={e => setForm({ ...form, codigo_pais: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="AR"
                maxLength={5}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
              <select
                value={form.region_id}
                onChange={e => setForm({ ...form, region_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sin región</option>
                {regiones.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={form.moneda}
                onChange={e => setForm({ ...form, moneda: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dólar)</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Precios por Urgencia
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Normal
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_normal}
                  onChange={e => setForm({ ...form, precio_normal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-orange-600 mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Urgente
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_urgente}
                  onChange={e => setForm({ ...form, precio_urgente: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-red-600 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> 72 Hrs
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_72hrs}
                  onChange={e => setForm({ ...form, precio_72hrs: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vigente desde</label>
              <input
                type="date"
                value={form.vigente_desde}
                onChange={e => setForm({ ...form, vigente_desde: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vigente hasta</label>
              <input
                type="date"
                value={form.vigente_hasta}
                onChange={e => setForm({ ...form, vigente_hasta: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {precio && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del cambio</label>
              <input
                type="text"
                value={form.motivo_cambio}
                onChange={e => setForm({ ...form, motivo_cambio: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="Actualización de tarifas 2026..."
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Precio activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {precio ? 'Guardar cambios' : 'Crear precio'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Modal de historial de cambios
function HistorialModal({ precio, onClose }) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistorial()
  }, [])

  const loadHistorial = async () => {
    try {
      const res = await axios.get(`/api/admin/precios-pais/${precio.id}/historial`)
      if (res.data.success) {
        setHistorial(res.data.historial || [])
      }
    } catch (err) {
      toast.error('Error cargando historial')
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Historial de cambios: {precio.pais}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay cambios registrados</p>
          ) : (
            <div className="space-y-4">
              {historial.map((h, idx) => (
                <div key={h.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-900">{h.usuario}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Normal</p>
                      <p>
                        <span className="text-red-500 line-through">{h.precio_normal_anterior}</span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600 font-medium">{h.precio_normal_nuevo}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Urgente</p>
                      <p>
                        <span className="text-red-500 line-through">{h.precio_urgente_anterior}</span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600 font-medium">{h.precio_urgente_nuevo}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">72 Hrs</p>
                      <p>
                        <span className="text-red-500 line-through">{h.precio_72hrs_anterior}</span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600 font-medium">{h.precio_72hrs_nuevo}</span>
                      </p>
                    </div>
                  </div>
                  
                  {h.motivo && (
                    <p className="mt-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2">
                      <strong>Motivo:</strong> {h.motivo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Modal de importación
function ImportModal({ regiones, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [regionId, setRegionId] = useState('')
  const [moneda, setMoneda] = useState('EUR')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  const handleImport = async () => {
    if (!file) {
      toast.error('Seleccione un archivo')
      return
    }

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    if (regionId) formData.append('region_id', regionId)
    formData.append('moneda', moneda)

    try {
      const res = await axios.post('/api/admin/precios-pais/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (res.data.success) {
        toast.success(res.data.message)
        if (res.data.errors?.length > 0) {
          res.data.errors.forEach(e => toast.error(e))
        }
        onSuccess()
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error importando')
    }
    setImporting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            Importar precios
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo Excel (.xls, .xlsx)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={e => setFile(e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full p-4 border-2 border-dashed rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click para seleccionar archivo'}
              </span>
            </button>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Formato esperado:</p>
            <p>Columnas: País | Normal | Urgente | 72Hrs</p>
            <p className="text-xs mt-1 text-blue-600">
              El archivo debe tener una fila de encabezados con "Country" o "País"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Región (opcional)</label>
              <select
                value={regionId}
                onChange={e => setRegionId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option value="">Sin asignar</option>
                {regiones.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Modal de tasas de cambio
function TasasModal({ tasas, onClose, onSuccess }) {
  const [eurUsd, setEurUsd] = useState(tasas['EUR_USD'] || 1.08)
  const [usdEur, setUsdEur] = useState(tasas['USD_EUR'] || 0.93)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await axios.put('/api/admin/precios-pais/tasas-cambio', {
        tasas: [
          { moneda_origen: 'EUR', moneda_destino: 'USD', tasa: eurUsd },
          { moneda_origen: 'USD', moneda_destino: 'EUR', tasa: usdEur }
        ]
      })
      
      if (res.data.success) {
        toast.success('Tasas actualizadas')
        onSuccess()
      }
    } catch (err) {
      toast.error('Error actualizando tasas')
    }
    setSaving(false)
  }

  // Auto-calcular inversa
  const handleEurUsdChange = (val) => {
    setEurUsd(val)
    if (val > 0) setUsdEur(Math.round((1 / val) * 1000000) / 1000000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Tasas de cambio
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Euro className="h-4 w-4" /> 1 EUR =
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                value={eurUsd}
                onChange={e => handleEurUsdChange(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border rounded-xl"
              />
              <span className="text-gray-500">USD</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> 1 USD =
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                value={usdEur}
                onChange={e => setUsdEur(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border rounded-xl"
              />
              <span className="text-gray-500">EUR</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Las tasas se usan para mostrar conversiones en la tabla de precios.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

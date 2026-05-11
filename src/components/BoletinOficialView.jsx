import { useState, useEffect, useCallback } from 'react'
import {
  Search, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock,
  BarChart3, RefreshCw, FileText, ExternalLink, ChevronDown, ChevronRight,
  Building2, Calendar, Hash, Globe, Download, Upload, X, Info,
  ShieldAlert, Users, TrendingUp, AlertOctagon, GitCompare
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCuit(cuit) {
  const d = (cuit || '').replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
  return cuit
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseStructuredText(text) {
  const src = normalizeText(text)
  if (!src || !src.includes(':')) return null
  const parts = src.split(',').map(p => p.trim()).filter(Boolean)
  const obj = {}
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx <= 0) continue
    const key = normalizeText(part.slice(0, idx)).toLowerCase()
    const value = normalizeText(part.slice(idx + 1))
    if (key && value) obj[key] = value
  }
  return Object.keys(obj).length >= 3 ? obj : null
}

function buildDiff(newText, oldText) {
  const current = normalizeText(newText)
  const previous = normalizeText(oldText)
  if (!current || !previous || current === previous) {
    return { hasChanges: false, fieldChanges: [], currentChunk: '', previousChunk: '' }
  }

  const a = parseStructuredText(current)
  const b = parseStructuredText(previous)
  if (a && b) {
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]))
    const fieldChanges = keys
      .filter(k => normalizeText(a[k]) !== normalizeText(b[k]))
      .map(k => ({ field: k, current: a[k] || '—', previous: b[k] || '—' }))
    return {
      hasChanges: fieldChanges.length > 0,
      fieldChanges,
      currentChunk: '',
      previousChunk: ''
    }
  }

  let left = 0
  while (left < current.length && left < previous.length && current[left] === previous[left]) left += 1

  let right = 0
  while (
    right < (current.length - left) &&
    right < (previous.length - left) &&
    current[current.length - 1 - right] === previous[previous.length - 1 - right]
  ) {
    right += 1
  }

  const currentChunk = normalizeText(current.slice(left, current.length - right))
  const previousChunk = normalizeText(previous.slice(left, previous.length - right))

  return {
    hasChanges: Boolean(currentChunk || previousChunk),
    fieldChanges: [],
    currentChunk,
    previousChunk
  }
}

function RiskBadge({ nivel }) {
  if (!nivel) return null
  const map = {
    bajo:    { color: 'bg-emerald-100 text-emerald-700', label: 'Riesgo Bajo' },
    medio:   { color: 'bg-yellow-100 text-yellow-700',  label: 'Riesgo Medio' },
    alto:    { color: 'bg-orange-100 text-orange-700',  label: 'Riesgo Alto' },
    critico: { color: 'bg-red-100 text-red-700',        label: '⚠ Riesgo Crítico' },
  }
  const cfg = map[nivel] || { color: 'bg-gray-100 text-gray-500', label: nivel }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <ShieldAlert className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

function AlertaBadges({ registro }) {
  const alertas = [
    { key: 'tiene_quiebra',    label: 'QUIEBRA',    color: 'bg-red-600 text-white' },
    { key: 'tiene_concurso',   label: 'CONCURSO',   color: 'bg-orange-500 text-white' },
    { key: 'tiene_liquidacion',label: 'LIQUIDACIÓN',color: 'bg-amber-500 text-white' },
    { key: 'tiene_disolucion', label: 'DISOLUCIÓN', color: 'bg-yellow-500 text-white' },
  ]
  const activas = alertas.filter(a => registro[a.key])
  if (!activas.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {activas.map(a => (
        <span key={a.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${a.color}`}>
          <AlertOctagon className="h-3 w-3" /> {a.label}
        </span>
      ))}
    </div>
  )
}

function EstadoBadge({ estado }) {
  const map = {
    encontrado:     { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Encontrado' },
    no_encontrado:  { color: 'bg-amber-100 text-amber-700',   icon: AlertTriangle,  label: 'No encontrado' },
    error:          { color: 'bg-red-100 text-red-700',        icon: XCircle,        label: 'Error' },
    procesando:     { color: 'bg-blue-100 text-blue-700',      icon: Loader2,        label: 'Procesando' },
  }
  const cfg = map[estado] || { color: 'bg-gray-100 text-gray-500', icon: Info, label: estado || 'Desconocido' }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

function ConfiabilidadBar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0))
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
    </div>
  )
}

// ─── Tarjeta de resultado individual ────────────────────────────────────────

function ResultadoCard({ registro, onVerHistorial }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="h-4 w-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{formatCuit(registro.cuit)}</p>
              {registro.razon_social && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{registro.razon_social}</p>
              )}
              <AlertaBadges registro={registro} />
            </div>
            <div className="flex flex-col items-end gap-1">
              <EstadoBadge estado={registro.estado} />
              <RiskBadge nivel={registro.bo_risk_nivel} />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            {registro.tipo_publicacion && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {registro.tipo_publicacion}
              </span>
            )}
            {registro.fecha_publicacion && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {registro.fecha_publicacion}
              </span>
            )}
            {registro.numero_boletin && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                BO Nº {registro.numero_boletin}
              </span>
            )}
            {registro.ultima_busqueda && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(registro.ultima_busqueda).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>

          {registro.confiabilidad != null && (
            <div className="mt-2">
              <ConfiabilidadBar value={registro.confiabilidad} />
            </div>
          )}
          {registro.capital_social_bo && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Capital BO: {registro.capital_social_bo}
            </p>
          )}
          {registro.directores_json?.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Users className="h-3 w-3" /> {registro.directores_json.length} director(es) registrado(s)
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 flex flex-wrap gap-2 bg-gray-50 rounded-b-xl">
          {registro.url_busqueda && (
            <a
              href={registro.url_busqueda}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Ver en Boletín Oficial
            </a>
          )}
          <button
            onClick={() => onVerHistorial(registro.cuit)}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Clock className="h-3 w-3" /> Historial de búsquedas
          </button>
          {registro.intentos > 1 && (
            <span className="text-xs text-gray-400">{registro.intentos} intentos</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Panel de Estadísticas ───────────────────────────────────────────────────

function StatsPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/v1/boletin-oficial/stats')
      if (res.data.success) setStats(res.data.data)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
  if (!stats) return null

  const cards = [
    { label: 'Total Registros', value: stats.total_registros, color: 'blue' },
    { label: 'Encontrados', value: stats.encontrados, color: 'emerald' },
    { label: 'No Encontrados', value: stats.no_encontrados, color: 'amber' },
    { label: 'Errores', value: stats.errores, color: 'red' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className={`bg-${c.color}-50 border border-${c.color}-100 rounded-xl p-4`}>
          <p className={`text-2xl font-bold text-${c.color}-700`}>{c.value ?? '—'}</p>
          <p className={`text-xs text-${c.color}-600 mt-0.5`}>{c.label}</p>
        </div>
      ))}
      <div className="col-span-2 lg:col-span-4 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap gap-6">
        <div>
          <span className="text-xs text-gray-500">Confiabilidad promedio</span>
          <p className="font-semibold text-gray-800">{stats.confiabilidad_promedio ?? '—'}%</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Tasa de éxito</span>
          <p className="font-semibold text-gray-800">{stats.tasa_exito ?? '—'}</p>
        </div>
        {stats.ultima_busqueda_sistema && (
          <div>
            <span className="text-xs text-gray-500">Última búsqueda</span>
            <p className="font-semibold text-gray-800">
              {new Date(stats.ultima_busqueda_sistema).toLocaleString('es-AR')}
            </p>
          </div>
        )}
        <button
          onClick={fetchStats}
          className="ml-auto self-center p-2 rounded-lg hover:bg-gray-200 text-gray-400"
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Modal de Historial ──────────────────────────────────────────────────────

function HistorialModal({ cuit, onClose }) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`/api/v1/boletin-oficial/historial/${encodeURIComponent(cuit)}`)
        if (res.data.success) setHistorial(res.data.data.historial || [])
      } catch {
        toast.error('Error al cargar historial')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [cuit])

  const iconMap = { success: CheckCircle2, not_found: AlertTriangle, error: XCircle }
  const colorMap = { success: 'text-emerald-500', not_found: 'text-amber-500', error: 'text-red-400' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Historial de búsquedas</h3>
            <p className="text-xs text-gray-500 mt-0.5">{formatCuit(cuit)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
          {!loading && historial.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sin historial registrado</p>
          )}
          {!loading && historial.map((h, idx) => {
            const Icon = iconMap[h.resultado] || Info
            const color = colorMap[h.resultado] || 'text-gray-400'
            return (
              <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 capitalize">{h.resultado?.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {h.fecha ? new Date(h.fecha).toLocaleString('es-AR') : '—'}
                    {h.tiempo_ms ? ` · ${h.tiempo_ms}ms` : ''}
                    {h.resultados_encontrados > 0 ? ` · ${h.resultados_encontrados} resultados` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BoletinOficialView() {
  const [tab, setTab] = useState('buscar') // 'buscar' | 'historial' | 'masivo' | 'alertas' | 'stats'
  const [cuitInput, setCuitInput] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [searching, setSearching] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [registros, setRegistros] = useState([])
  const [loadingRegistros, setLoadingRegistros] = useState(false)
  const [historialCuit, setHistorialCuit] = useState(null)
  const [bulkInput, setBulkInput] = useState('')
  const [bulkResults, setBulkResults] = useState(null)
  const [bulkSearching, setBulkSearching] = useState(false)

  const [alertasData, setAlertasData] = useState([])
  const [loadingAlertas, setLoadingAlertas] = useState(false)
  const [historialLista, setHistorialLista] = useState([])
  const [historialListaLoading, setHistorialListaLoading] = useState(false)
  const [historialDetalle, setHistorialDetalle] = useState(null)
  const [historialDetalleLoading, setHistorialDetalleLoading] = useState(false)
  const [selectedHistorialCuit, setSelectedHistorialCuit] = useState('')
  const [historialFiltro, setHistorialFiltro] = useState('')
  const [soloActualizadosHoy, setSoloActualizadosHoy] = useState(false)
  const [soloReferenciaAlta, setSoloReferenciaAlta] = useState(false)
  const [soloCambiosDetectados, setSoloCambiosDetectados] = useState(false)
  const [soloSeccionSegunda, setSoloSeccionSegunda] = useState(false)
  const [soloSeccionCuarta, setSoloSeccionCuarta] = useState(false)

  const loadAlertas = useCallback(async () => {
    setLoadingAlertas(true)
    try {
      const res = await axios.get('/api/v1/boletin-oficial/alertas?limite=100')
      if (res.data.success) setAlertasData(res.data.data.alertas || [])
    } catch {
      toast.error('Error al cargar alertas')
    } finally {
      setLoadingAlertas(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'alertas') loadAlertas()
  }, [tab, loadAlertas])

  const loadHistorialLista = useCallback(async () => {
    setHistorialListaLoading(true)
    try {
      const res = await axios.get('/api/v1/boletin-oficial/recientes?limite=300')
      if (res.data.success) {
        const items = res.data.data?.items || []
        setHistorialLista(items)
        if (!selectedHistorialCuit && items.length > 0) {
          setSelectedHistorialCuit(items[0].cuit)
        }
      }
    } catch {
      toast.error('Error al cargar listado de historial BO')
    } finally {
      setHistorialListaLoading(false)
    }
  }, [selectedHistorialCuit])

  const loadHistorialDetalle = useCallback(async (cuit) => {
    if (!cuit) return
    setHistorialDetalleLoading(true)
    try {
      const res = await axios.get(`/api/v1/boletin-oficial/historial/${encodeURIComponent(cuit)}?limite=150`)
      if (res.data.success) {
        setHistorialDetalle(res.data.data)
      }
    } catch {
      toast.error('Error al cargar detalle histórico')
    } finally {
      setHistorialDetalleLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'historial') {
      loadHistorialLista()
    }
  }, [tab, loadHistorialLista])

  useEffect(() => {
    if (tab === 'historial' && selectedHistorialCuit) {
      loadHistorialDetalle(selectedHistorialCuit)
    }
  }, [tab, selectedHistorialCuit, loadHistorialDetalle])

  const handleSearch = async (e) => {
    e.preventDefault()
    const cuit = cuitInput.trim()
    if (!cuit) return toast.error('Ingresá un CUIT para buscar')

    setSearching(true)
    setLastResult(null)

    try {
      const res = await axios.post('/api/v1/boletin-oficial/search', {
        cuit,
        razon_social: razonSocial.trim() || undefined
      })

      if (res.data.success) {
        setLastResult(res.data.data)
        const data = res.data.data

        if (data.encontrado) {
          toast.success(`Encontrado en el Boletín Oficial (${data.confiabilidad}% confianza)`)
        } else {
          toast(`CUIT no encontrado en el Boletín Oficial`, { icon: '⚠️' })
        }

        // Agregar al listado local si no está
        setRegistros(prev => {
          const exists = prev.find(r => r.cuit === cuit)
          const nuevo = {
            cuit,
            razon_social: data.resultados?.[0]?.titulo || razonSocial || null,
            estado: data.estado,
            confiabilidad: data.confiabilidad,
            tipo_publicacion: data.tipo_publicacion,
            fecha_publicacion: data.fecha_publicacion,
            ultima_busqueda: new Date().toISOString(),
            intentos: 1,
          }
          if (exists) return prev.map(r => r.cuit === cuit ? { ...r, ...nuevo } : r)
          return [nuevo, ...prev]
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al buscar en el Boletín Oficial')
    } finally {
      setSearching(false)
    }
  }

  const handleGetSaved = async () => {
    const cuit = cuitInput.trim()
    if (!cuit) return

    try {
      const res = await axios.get(`/api/v1/boletin-oficial/${encodeURIComponent(cuit)}`)
      if (res.data.success) {
        const d = res.data.data
        setRegistros(prev => {
          const exists = prev.find(r => r.cuit === cuit)
          if (exists) return prev.map(r => r.cuit === cuit ? { ...r, ...d } : r)
          return [d, ...prev]
        })
        toast.success('Registro cargado')
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast(`No hay registro guardado para ese CUIT`, { icon: 'ℹ️' })
      } else {
        toast.error('Error al obtener registro')
      }
    }
  }

  const handleBulkSearch = async () => {
    const lines = bulkInput.trim().split(/[\n,;]/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return toast.error('Ingresá al menos un CUIT')
    if (lines.length > 100) return toast.error('Máximo 100 CUITs por búsqueda masiva')

    setBulkSearching(true)
    setBulkResults(null)

    try {
      const res = await axios.post('/api/v1/boletin-oficial/bulk-search', { cuits: lines })
      if (res.data.success) {
        setBulkResults(res.data.data)
        toast.success(`Procesados ${res.data.data.procesados} CUITs`)

        // Actualizar listado local
        setRegistros(prev => {
          const newMap = {}
          res.data.data.resultados.forEach(r => { newMap[r.cuit] = r })
          const updated = prev.map(r => newMap[r.cuit] ? { ...r, ...newMap[r.cuit] } : r)
          const existing = new Set(prev.map(r => r.cuit))
          res.data.data.resultados.filter(r => !existing.has(r.cuit)).forEach(r => updated.unshift(r))
          return updated
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error en búsqueda masiva')
    } finally {
      setBulkSearching(false)
    }
  }

  const exportCSV = () => {
    if (!registros.length) return
    const headers = ['CUIT', 'Razon Social', 'Estado', 'Confiabilidad', 'Tipo', 'Fecha Publicacion', 'Ultima Busqueda']
    const rows = registros.map(r => [
      r.cuit, r.razon_social || '', r.estado || '', r.confiabilidad ?? '',
      r.tipo_publicacion || '', r.fecha_publicacion || '',
      r.ultima_busqueda ? new Date(r.ultima_busqueda).toLocaleDateString('es-AR') : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `boletin_oficial_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'buscar',  label: 'Búsqueda Individual', icon: Search },
    { id: 'historial', label: 'Historial BO',       icon: Clock },
    { id: 'masivo',  label: 'Búsqueda Masiva',     icon: Upload },
    { id: 'alertas', label: 'Alertas Críticas',     icon: ShieldAlert },
    { id: 'stats',   label: 'Estadísticas',          icon: BarChart3 },
  ]

  const historialListaFiltrada = historialLista.filter((it) => {
    const q = (historialFiltro || '').trim().toLowerCase()
    const cuitNorm = String(it.cuit || '').replace(/\D/g, '')
    const razon = String(it.razon_social || '').toLowerCase()
    const matchesText = !q || cuitNorm.includes(q.replace(/\D/g, '')) || razon.includes(q)

    const ultimaAct = it.ultima_actualizacion ? new Date(it.ultima_actualizacion) : null
    const now = new Date()
    const isToday = !!ultimaAct &&
      ultimaAct.getFullYear() === now.getFullYear() &&
      ultimaAct.getMonth() === now.getMonth() &&
      ultimaAct.getDate() === now.getDate()

    if (!matchesText) return false
    if (soloActualizadosHoy && !isToday) return false
    if (soloReferenciaAlta && !it.referencia_alta) return false
    if (soloCambiosDetectados && !it.actualizacion_detectada) return false

    const seccion = String(it.seccion_principal || '').toLowerCase()
    if (!(soloSeccionSegunda && soloSeccionCuarta)) {
      if (soloSeccionSegunda && seccion !== 'segunda') return false
      if (soloSeccionCuarta && seccion !== 'cuarta') return false
    }

    return true
  })

  return (
    <div className="w-full max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Boletín Oficial Argentina</h1>
          <p className="text-sm text-gray-500 mt-0.5">Búsqueda de publicaciones societarias</p>
        </div>
        <a
          href="https://www.boletinoficial.gob.ar"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
        >
          <Globe className="h-3.5 w-3.5" />
          boletinoficial.gob.ar
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── TAB: Búsqueda Individual ── */}
      {tab === 'buscar' && (
        <div className="space-y-5">
          {/* Formulario de búsqueda */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">CUIT *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={cuitInput}
                      onChange={e => setCuitInput(e.target.value)}
                      placeholder="20-12345678-9"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Razón Social (opcional)</label>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={e => setRazonSocial(e.target.value)}
                    placeholder="Para mejorar el matching"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={searching || !cuitInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {searching ? 'Buscando...' : 'Buscar en BO'}
                </button>
                <button
                  type="button"
                  onClick={handleGetSaved}
                  disabled={!cuitInput.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="Cargar el resultado ya guardado en la base de datos"
                >
                  <FileText className="h-4 w-4" />
                  Ver guardado
                </button>
              </div>
            </form>
          </div>

          {/* Resultado de la última búsqueda */}
          {lastResult && (
            <div className={`rounded-2xl border p-5 ${
              lastResult.encontrado
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {lastResult.encontrado
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  : <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${lastResult.encontrado ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {lastResult.encontrado
                      ? `Encontrado — ${lastResult.resultados_totales} publicacion${lastResult.resultados_totales !== 1 ? 'es' : ''}`
                      : 'No encontrado en el Boletín Oficial'
                    }
                  </p>
                  <p className={`text-xs mt-0.5 ${lastResult.encontrado ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Confiabilidad: {lastResult.confiabilidad}% · {lastResult.tiempo_ms}ms
                  </p>
                  {lastResult.resultados?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {lastResult.resultados.map((r, idx) => (
                        <div key={idx} className="bg-white/70 rounded-lg p-3 text-xs text-gray-700">
                          <p className="font-medium">{r.titulo}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-gray-500">
                            {r.fecha && <span>📅 {r.fecha}</span>}
                            {r.tipo && <span>📂 {r.tipo}</span>}
                            {r.seccion && <span>🧩 Sección {r.seccion}</span>}
                            {r.numero_boletin && <span># BO {r.numero_boletin}</span>}
                            <span>🎯 {r.confianza}%</span>
                          </div>
                          {r.texto_completo && (
                            <p className="mt-2 text-[11px] leading-relaxed text-gray-600 whitespace-pre-wrap">
                              {r.texto_completo}
                            </p>
                          )}
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-600 hover:underline"
                            >
                              Ver fuente
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Listado de registros buscados en esta sesión */}
          {registros.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Registros consultados <span className="text-gray-400 font-normal">({registros.length})</span>
                </h2>
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </button>
              </div>
              <div className="space-y-2">
                {registros.map(r => (
                  <ResultadoCard
                    key={r.cuit}
                    registro={r}
                    onVerHistorial={(cuit) => setHistorialCuit(cuit)}
                  />
                ))}
              </div>
            </div>
          )}

          {registros.length === 0 && !lastResult && (
            <div className="text-center py-12 text-gray-400">
              <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Ingresá un CUIT para buscar en el Boletín Oficial</p>
              <p className="text-xs mt-1">Los resultados se guardan automáticamente en la base de datos</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Historial BO ── */}
      {tab === 'historial' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-4 2xl:col-span-3 bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">CUITs con historial</h3>
              <button
                onClick={loadHistorialLista}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                title="Actualizar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={historialFiltro}
                  onChange={(e) => setHistorialFiltro(e.target.value)}
                  placeholder="Filtrar por CUIT o razón social"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSoloActualizadosHoy(v => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${soloActualizadosHoy ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Solo actualizados hoy
                </button>
                <button
                  type="button"
                  onClick={() => setSoloReferenciaAlta(v => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${soloReferenciaAlta ? 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Solo referencia alta
                </button>
                <button
                  type="button"
                  onClick={() => setSoloCambiosDetectados(v => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${soloCambiosDetectados ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Solo con cambios detectados
                </button>
                <button
                  type="button"
                  onClick={() => setSoloSeccionSegunda(v => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${soloSeccionSegunda ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Solo sección segunda
                </button>
                <button
                  type="button"
                  onClick={() => setSoloSeccionCuarta(v => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${soloSeccionCuarta ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Solo sección cuarta
                </button>
              </div>
            </div>

            {historialListaLoading && (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            )}

            {!historialListaLoading && historialLista.length === 0 && (
              <p className="text-sm text-gray-400">No hay CUITs con historial aún.</p>
            )}

            {!historialListaLoading && historialLista.length > 0 && historialListaFiltrada.length === 0 && (
              <p className="text-sm text-gray-400">No hay coincidencias para ese filtro.</p>
            )}

            {!historialListaLoading && historialListaFiltrada.length > 0 && (
              <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1.5">
                {historialListaFiltrada.map((it) => {
                  const active = selectedHistorialCuit === it.cuit
                  return (
                    <button
                      key={it.cuit}
                      onClick={() => setSelectedHistorialCuit(it.cuit)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                        active ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{formatCuit(it.cuit)}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{it.razon_social || '—'}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
                        <span>{it.total_publicaciones || 0} publicaciones</span>
                        {it.seccion_principal && <span>Sección {it.seccion_principal}</span>}
                        {it.numero_boletin && <span># BO {it.numero_boletin}</span>}
                        {it.ultima_actualizacion && <span>{new Date(it.ultima_actualizacion).toLocaleDateString('es-AR')}</span>}
                        {it.actualizacion_detectada && <span className="text-indigo-600 font-medium">Cambio detectado</span>}
                        {it.referencia_alta && <span className="text-fuchsia-600 font-medium">Referencia alta</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="xl:col-span-8 2xl:col-span-9 bg-white rounded-2xl border border-gray-200 p-5 lg:p-6">
            {!selectedHistorialCuit && (
              <p className="text-sm text-gray-400">Seleccioná un CUIT para ver detalle histórico.</p>
            )}

            {selectedHistorialCuit && (
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Detalle histórico BO</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatCuit(selectedHistorialCuit)}</p>
                  </div>
                  <button
                    onClick={() => loadHistorialDetalle(selectedHistorialCuit)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    title="Actualizar detalle"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {historialDetalleLoading && (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                )}

                {!historialDetalleLoading && historialDetalle && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {historialDetalle.actualizacion_detectada && (
                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                          Información actualizada
                        </span>
                      )}
                      {historialDetalle.referencia_alta && (
                        <span className="px-2 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 text-xs font-semibold">
                          Referencia alta
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                        {historialDetalle.publicaciones_unicas || 0} publicaciones
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {(historialDetalle.publicaciones || []).map((p, idx) => {
                        const prev = (historialDetalle.publicaciones || [])[idx + 1]
                        const diff = buildDiff(p?.texto_publicacion, prev?.texto_publicacion)
                        return (
                        <div key={p.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">ID {p.id}</span>
                            {p.fecha_publicacion && <span>📅 {p.fecha_publicacion}</span>}
                            {p.numero_boletin && <span># BO {p.numero_boletin}</span>}
                            {p.seccion && <span>🧩 {p.seccion}</span>}
                            {p.first_seen_at && <span>Primera vez: {new Date(p.first_seen_at).toLocaleString('es-AR')}</span>}
                            {p.last_seen_at && <span>Última vez: {new Date(p.last_seen_at).toLocaleString('es-AR')}</span>}
                            <span>Detecciones: {p.veces_detectado || 1}</span>
                            {p.es_nuevo_ingreso && <span className="text-emerald-700 font-semibold">Nuevo ingreso</span>}
                          </div>
                          {p.texto_publicacion && (
                            <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{p.texto_publicacion}</p>
                          )}

                          {prev && diff.hasChanges && (
                            <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2">
                              <p className="text-[11px] font-semibold text-indigo-800 inline-flex items-center gap-1">
                                <GitCompare className="h-3.5 w-3.5" /> Diferencias vs versión anterior (ID {prev.id})
                              </p>

                              {diff.fieldChanges.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {diff.fieldChanges.map((c, i) => (
                                    <div key={`${c.field}-${i}`} className="text-[11px] text-indigo-900">
                                      <span className="font-semibold">{c.field}:</span>{' '}
                                      <span className="line-through text-rose-700">{c.previous}</span>{' '}
                                      <span>→</span>{' '}
                                      <span className="font-semibold text-emerald-700">{c.current}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {diff.fieldChanges.length === 0 && (
                                <div className="mt-1 space-y-1 text-[11px] text-indigo-900">
                                  <p><span className="font-semibold">Antes:</span> {diff.previousChunk || '—'}</p>
                                  <p><span className="font-semibold">Ahora:</span> {diff.currentChunk || '—'}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Búsqueda Masiva ── */}
      {tab === 'masivo' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Lista de CUITs <span className="text-gray-400">(uno por línea, o separados por coma/punto y coma — máx. 100)</span>
              </label>
              <textarea
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                rows={8}
                placeholder="20-12345678-9&#10;30-87654321-0&#10;27-11111111-3"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                {bulkInput.trim().split(/[\n,;]/).filter(l => l.trim()).length} CUITs ingresados
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkSearch}
                disabled={bulkSearching || !bulkInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {bulkSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {bulkSearching ? 'Procesando...' : 'Iniciar búsqueda masiva'}
              </button>
              <button
                onClick={() => { setBulkInput(''); setBulkResults(null) }}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
              >
                Limpiar
              </button>
            </div>
          </div>

          {bulkResults && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Resultados — {bulkResults.procesados} procesados
                </h3>
                <button
                  onClick={() => {
                    const found = bulkResults.resultados.filter(r => r.encontrado)
                    const notFound = bulkResults.resultados.filter(r => !r.encontrado && r.estado !== 'error')
                    const errors = bulkResults.resultados.filter(r => r.estado === 'error')
                    const csv = [
                      ['CUIT', 'Estado', 'Confiabilidad'],
                      ...bulkResults.resultados.map(r => [r.cuit, r.estado, r.confiabilidad ?? ''])
                    ].map(r => r.join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'bulk_bo_results.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </button>
              </div>

              <div className="flex gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {bulkResults.resultados.filter(r => r.encontrado).length} encontrados
                </span>
                <span className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  {bulkResults.resultados.filter(r => !r.encontrado && r.estado !== 'error').length} no encontrados
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <XCircle className="h-4 w-4" />
                  {bulkResults.resultados.filter(r => r.estado === 'error').length} errores
                </span>
              </div>

              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {bulkResults.resultados.map(r => (
                  <div key={r.cuit} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm">
                    {r.encontrado
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      : r.estado === 'error'
                        ? <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    }
                    <span className="font-mono text-xs flex-1">{formatCuit(r.cuit)}</span>
                    <EstadoBadge estado={r.estado} />
                    {r.confiabilidad > 0 && (
                      <span className="text-xs text-gray-400">{r.confiabilidad}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!bulkResults && (
            <div className="text-center py-12 text-gray-400">
              <Upload className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Pegá una lista de CUITs para buscarlos todos de una vez</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Alertas Críticas ── */}
      {tab === 'alertas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Empresas con publicaciones de quiebra, concurso o liquidación en el Boletín Oficial</p>
            <button onClick={loadAlertas} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" title="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingAlertas && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}

          {!loadingAlertas && alertasData.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No se detectaron alertas críticas en los registros del Boletín Oficial</p>
            </div>
          )}

          {!loadingAlertas && alertasData.length > 0 && (
            <div className="space-y-2">
              {alertasData.map(a => (
                <div key={a.cuit} className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{formatCuit(a.cuit)}</p>
                      {a.razon_social && <p className="text-xs text-gray-500 mt-0.5">{a.razon_social}</p>}
                      <AlertaBadges registro={a} />
                    </div>
                    <RiskBadge nivel={a.bo_risk_nivel} />
                  </div>
                  {a.fecha_alerta && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Publicación: {new Date(a.fecha_alerta).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Estadísticas ── */}
      {tab === 'stats' && (
        <div>
          <StatsPanel />
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-gray-400">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Los gráficos detallados estarán disponibles próximamente</p>
          </div>
        </div>
      )}

      {/* Modal de historial */}
      {historialCuit && (
        <HistorialModal
          cuit={historialCuit}
          onClose={() => setHistorialCuit(null)}
        />
      )}
    </div>
  )
}

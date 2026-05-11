import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, Loader2, Plus, X, BarChart3, AlertTriangle, CheckCircle2, Shield, Ban, FileText, TrendingUp, Building2, Clock, Trash2, Download, FileSpreadsheet, FileJson } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Colores y etiquetas
const MODULE_LABELS = {
  financiero: 'Financiero',
  pago: 'Pagos',
  legal: 'Legal',
  operativo: 'Comercial',
  reputacional: 'OSINT',
  mercado: 'Mercado',
  bcra: 'BCRA',
}

const RATING_COLORS = {
  AAA: 'text-green-700 bg-green-100',
  AA: 'text-green-600 bg-green-50',
  A: 'text-blue-700 bg-blue-100',
  BBB: 'text-blue-600 bg-blue-50',
  BB: 'text-amber-700 bg-amber-100',
  'B+': 'text-amber-600 bg-amber-50',
  B: 'text-orange-700 bg-orange-100',
  CCC: 'text-red-700 bg-red-100',
  NR: 'text-gray-500 bg-gray-100',
}

const SEMAFORO_COLORS = {
  verde: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-100', label: 'Bajo riesgo' },
  amarillo: { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-100', label: 'Precaución' },
  rojo: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100', label: 'Alto riesgo' },
}

const BAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500']
const TEXT_COLORS = ['text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600', 'text-rose-600']

// Componente Semáforo visual
function SemaforoIndicator({ semaforo, size = 'md' }) {
  const config = SEMAFORO_COLORS[semaforo] || SEMAFORO_COLORS.amarillo
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${sizeClasses} rounded-full ${config.bg} shadow-sm`} 
            title={config.label} />
      {size !== 'sm' && (
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      )}
    </div>
  )
}

// Badge de alerta
function AlertaBadge({ tipo, texto, severidad = 'alta' }) {
  const configs = {
    ofac: { icon: Shield, color: 'bg-red-100 text-red-700 border-red-200', label: 'OFAC' },
    cheques: { icon: Ban, color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Cheques' },
    bcra: { icon: Building2, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'BCRA' },
  }
  const config = configs[tipo] || configs.bcra
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.color}`}>
      <Icon className="h-3 w-3" />
      {texto || config.label}
    </span>
  )
}

// Radar comparativo
function CompareRadar({ empresas, size = 320 }) {
  const modules = Object.keys(MODULE_LABELS)
  const n = modules.length
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 50

  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (index, value) => {
    const angle = startAngle + index * angleStep
    const r = ((value || 0) / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const getLabelPoint = (index) => {
    const angle = startAngle + index * angleStep
    const r = maxR + 28
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const levels = [20, 40, 60, 80, 100]
  const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#f43f5e']

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Círculos de nivel */}
        {levels.map(level => {
          const pts = Array.from({ length: n }, (_, i) => getPoint(i, level))
          return (
            <polygon
              key={level}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke="#e5e7eb" strokeWidth="1"
            />
          )
        })}
        {/* Líneas radiales */}
        {modules.map((_, i) => {
          const end = getPoint(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
        })}
        {/* Polígonos de cada empresa */}
        {empresas.map((emp, ci) => {
          const pts = modules.map((m, i) => getPoint(i, emp[`score_${m}`]))
          const polygon = pts.map(p => `${p.x},${p.y}`).join(' ')
          const color = colors[ci % colors.length]
          return (
            <g key={ci}>
              <polygon points={polygon} fill={`${color}22`} stroke={color} strokeWidth="2" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
              ))}
            </g>
          )
        })}
        {/* Labels de módulos */}
        {modules.map((key, i) => {
          const lp = getLabelPoint(i)
          return (
            <text key={key} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
              className="text-[10px] fill-gray-600 font-medium">
              {MODULE_LABELS[key]}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// Pasos del proceso de comparación
const COMPARE_STEPS = [
  { time: 0, msg: 'Iniciando comparación...' },
  { time: 3, msg: 'Obteniendo datos de empresas...' },
  { time: 8, msg: 'Calculando scores...' },
  { time: 15, msg: 'Consultando BCRA...' },
  { time: 25, msg: 'Verificando OFAC...' },
  { time: 35, msg: 'Generando análisis comparativo...' },
  { time: 45, msg: 'Consolidando resultados...' },
]

// Componente principal
export default function ComparadorEmpresas({ onBack }) {
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [selectedEmpresas, setSelectedEmpresas] = useState([]) // { cuit, razon_social, score_total, rating }
  const [titulo, setTitulo] = useState('')
  const [loading, setLoading] = useState(false)
  const [compareElapsed, setCompareElapsed] = useState(0)
  const compareStartRef = useRef(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingJson, setLoadingJson] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)

  // Timer para el modal de comparación
  useEffect(() => {
    if (!loading) {
      setCompareElapsed(0)
      return
    }
    compareStartRef.current = Date.now()
    const interval = setInterval(() => {
      setCompareElapsed(Math.floor((Date.now() - compareStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Cargar historial al montar
  useEffect(() => {
    cargarHistorial()
  }, [])

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim().length >= 2) {
        buscarEmpresas(searchInput)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const buscarEmpresas = async (query) => {
    setLoadingSearch(true)
    try {
      const res = await axios.get(`/api/comparar/buscar?q=${encodeURIComponent(query)}&limit=10`)
      if (res.data.success) {
        // Filtrar empresas ya seleccionadas
        const cuitsSeleccionados = selectedEmpresas.map(e => e.cuit.replace(/[^0-9]/g, ''))
        const filtradas = (res.data.empresas || []).filter(
          e => !cuitsSeleccionados.includes(e.cuit.replace(/[^0-9]/g, ''))
        )
        setSearchResults(filtradas)
      }
    } catch (err) {
      console.error('Error buscando:', err)
    }
    setLoadingSearch(false)
  }

  const cargarHistorial = async () => {
    setLoadingHistorial(true)
    try {
      const res = await axios.get('/api/comparar/historial?limit=10')
      if (res.data.success) {
        setHistorial(res.data.comparaciones || [])
      }
    } catch (err) {
      console.error('Error cargando historial:', err)
    }
    setLoadingHistorial(false)
  }

  const agregarEmpresa = (empresa) => {
    if (selectedEmpresas.length >= 10) {
      toast.error('Máximo 10 empresas por comparación')
      return
    }
    
    // Formatear CUIT
    const cuit = empresa.cuit || ''
    const cuitClean = cuit.replace(/[^0-9]/g, '')
    let cuitFormateado = cuit
    if (cuitClean.length === 11 && !cuit.includes('-')) {
      cuitFormateado = `${cuitClean.slice(0,2)}-${cuitClean.slice(2,10)}-${cuitClean.slice(10)}`
    }
    
    setSelectedEmpresas(prev => [...prev, {
      cuit: cuitFormateado,
      razon_social: empresa.razon_social,
      score_total: empresa.score_total,
      rating: empresa.rating,
    }])
    setSearchInput('')
    setSearchResults([])
  }

  const agregarCuitManual = () => {
    const cuit = searchInput.trim().replace(/[^0-9]/g, '')
    if (!cuit || cuit.length < 8) {
      toast.error('Ingresa un CUIT válido')
      return
    }
    agregarEmpresa({ cuit, razon_social: null })
  }

  const quitarEmpresa = (cuit) => {
    setSelectedEmpresas(prev => prev.filter(e => e.cuit !== cuit))
  }

  const ejecutarComparacion = async () => {
    if (selectedEmpresas.length < 2) {
      toast.error('Agrega al menos 2 empresas para comparar')
      return
    }

    setLoading(true)
    setResultado(null)
    
    try {
      const res = await axios.post('/api/comparar', {
        cuits: selectedEmpresas.map(e => e.cuit),
        titulo: titulo || `Comparación ${new Date().toLocaleDateString()}`,
        incluir_bcra: true,
        incluir_ofac: true
      })
      
      if (res.data.success) {
        setResultado(res.data)
        toast.success(`Comparación completada: ${res.data.cantidad_empresas} empresas`)
        cargarHistorial() // Refrescar historial
      } else {
        toast.error(res.data.error || 'Error en la comparación')
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error(err.response?.data?.error || 'Error al comparar empresas')
    }
    
    setLoading(false)
  }

  const cargarComparacion = async (uuid) => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/comparar/${uuid}`)
      if (res.data.success) {
        setResultado(res.data)
        setSelectedEmpresas(res.data.empresas.map(e => ({
          cuit: e.cuit,
          razon_social: e.razon_social,
          score_total: e.score_total,
          rating: e.rating
        })))
        setTitulo(res.data.titulo || '')
        setShowHistorial(false)
      }
    } catch (err) {
      toast.error('Error cargando comparación')
    }
    setLoading(false)
  }

  const nuevaComparacion = () => {
    setResultado(null)
    setSelectedEmpresas([])
    setTitulo('')
    setSearchInput('')
    setSearchResults([])
  }

  const descargarPDF = async () => {
    if (!resultado?.session_uuid) return
    setLoadingPdf(true)
    try {
      const response = await axios.get(`/api/comparar/${resultado.session_uuid}/pdf`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `comparacion_${resultado.session_uuid}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    } catch (err) {
      console.error('Error PDF:', err)
      toast.error('Error descargando PDF')
    }
    setLoadingPdf(false)
  }

  const descargarExcel = async () => {
    if (!resultado?.session_uuid) return
    setLoadingExcel(true)
    try {
      const response = await axios.get(`/api/comparar/${resultado.session_uuid}/excel`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `comparacion_${resultado.session_uuid}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Excel descargado')
    } catch (err) {
      console.error('Error Excel:', err)
      toast.error('Error descargando Excel')
    }
    setLoadingExcel(false)
  }

  const descargarJSON = async () => {
    if (!resultado?.session_uuid) return
    setLoadingJson(true)
    try {
      const response = await axios.get(`/api/comparar/${resultado.session_uuid}/json`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `comparacion_${resultado.session_uuid}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('JSON descargado')
    } catch (err) {
      console.error('Error JSON:', err)
      toast.error('Error descargando JSON')
    }
    setLoadingJson(false)
  }

  const empresas = resultado?.empresas || []

  // Mensaje actual según tiempo transcurrido
  const currentCompareStep = COMPARE_STEPS.filter(s => s.time <= compareElapsed).pop() || COMPARE_STEPS[0]

  return (
    <div className="space-y-6">
      {/* Modal de comparación en progreso */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle 
                    cx="40" cy="40" r="36" fill="none" stroke="#3b82f6" strokeWidth="6"
                    strokeDasharray={`${Math.min(100, (compareElapsed / 60) * 100) * 2.26} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">{compareElapsed}s</span>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Comparando Empresas</h3>
            <p className="text-gray-600 mb-4 min-h-[24px] transition-all duration-300">
              {currentCompareStep.msg}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (compareElapsed / 60) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              Analizando {selectedEmpresas.length} empresas con BCRA y OFAC
            </p>
            <p className="text-xs text-gray-400 mt-2">
              No cierre esta ventana
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Comparador de Empresas</h2>
            <p className="text-sm text-gray-500">
              Compara hasta 10 empresas con datos de scoring, BCRA y OFAC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resultado && (
            <button 
              onClick={nuevaComparacion}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Nueva comparación
            </button>
          )}
          <button 
            onClick={() => setShowHistorial(!showHistorial)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showHistorial ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-1" />
            Historial
          </button>
        </div>
      </div>

      {/* Historial panel */}
      {showHistorial && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparaciones recientes</h3>
          {loadingHistorial ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay comparaciones guardadas</p>
          ) : (
            <div className="space-y-2">
              {historial.map(comp => (
                <button
                  key={comp.session_uuid || comp.id}
                  onClick={() => cargarComparacion(comp.session_uuid)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{comp.titulo || 'Sin título'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {comp.cantidad_empresas} empresas · {new Date(comp.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{comp.creditos_consumidos} créditos</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input de Empresas - Búsqueda y CUITs */}
      {!resultado && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título de la comparación (opcional)
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Evaluación proveedores Q2 2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Agregar empresas ({selectedEmpresas.length}/10)
          </h3>
          
          <div className="relative mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchResults.length === 0 && agregarCuitManual()}
                  placeholder="Buscar por nombre o CUIT..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {loadingSearch && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
                )}
              </div>
              <button
                onClick={agregarCuitManual}
                disabled={!searchInput.trim()}
                title="Agregar CUIT manualmente"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((emp, idx) => (
                  <button
                    key={emp.cuit || idx}
                    onClick={() => agregarEmpresa(emp)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{emp.razon_social}</p>
                        <p className="text-xs text-gray-500">{emp.cuit}</p>
                      </div>
                      {emp.rating && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          emp.rating === 'A' || emp.rating === 'A+' ? 'bg-green-100 text-green-700' :
                          emp.rating === 'B' ? 'bg-yellow-100 text-yellow-700' :
                          emp.rating === 'C' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {emp.rating}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de empresas seleccionadas */}
          {selectedEmpresas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 pt-3 border-t border-gray-100">
              {selectedEmpresas.map((emp, i) => (
                <span 
                  key={emp.cuit} 
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white ${BAR_COLORS[i % 5]}`}
                  title={emp.razon_social || emp.cuit}
                >
                  {emp.razon_social ? (
                    <span className="max-w-[150px] truncate">{emp.razon_social}</span>
                  ) : (
                    emp.cuit
                  )}
                  <button onClick={() => quitarEmpresa(emp.cuit)} className="hover:opacity-75 ml-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Botón comparar */}
          <button
            onClick={ejecutarComparacion}
            disabled={selectedEmpresas.length < 2 || loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Comparando...
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                Comparar {selectedEmpresas.length} empresas
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-2">
            Costo: {selectedEmpresas.length || 0} créditos · Incluye verificación BCRA y OFAC
          </p>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <>
          {/* Resumen */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{resultado.titulo || 'Comparación'}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {empresas.length} empresas · {resultado.creditos_consumidos} créditos · {new Date(resultado.comparado_at).toLocaleString()}
                </p>
              </div>
              {resultado.recomendacion?.empresa && (
                <div className="text-right">
                  <p className="text-xs text-blue-200">Recomendada</p>
                  <p className="font-bold">{resultado.recomendacion.empresa.razon_social?.substring(0, 25) || resultado.recomendacion.empresa.cuit}</p>
                </div>
              )}
            </div>
            
            {/* Botones de exportación */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-blue-400/30">
              <button
                onClick={descargarPDF}
                disabled={loadingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                PDF
              </button>
              <button
                onClick={descargarExcel}
                disabled={loadingExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Excel
              </button>
              <button
                onClick={descargarJSON}
                disabled={loadingJson}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                JSON
              </button>
            </div>
          </div>

          {/* Alertas globales */}
          {resultado.alertas_globales?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas detectadas ({resultado.alertas_globales.length})
              </h4>
              <div className="space-y-2">
                {resultado.alertas_globales.map((alerta, i) => (
                  <div key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="font-medium">{alerta.empresa}:</span>
                    <span>{alerta.mensaje}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gráfico Radar */}
          {empresas.filter(e => e.score_total).length >= 2 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Perfil Comparativo</h3>
              <CompareRadar empresas={empresas} />
              <div className="flex justify-center gap-4 mt-3 flex-wrap">
                {empresas.map((emp, i) => (
                  <div key={emp.cuit} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-3 h-3 rounded-full ${BAR_COLORS[i % 5]}`} />
                    <span className="text-gray-600">{emp.razon_social?.substring(0, 20) || emp.cuit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla comparativa */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold sticky left-0 bg-gray-50">Empresa</th>
                    {empresas.map((emp, i) => (
                      <th key={emp.cuit} className="text-center py-3 px-4 font-semibold min-w-[180px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`${TEXT_COLORS[i % 5]} text-xs`}>#{emp.posicion}</span>
                          <span className={TEXT_COLORS[i % 5]}>
                            {emp.razon_social?.substring(0, 20) || emp.cuit}
                          </span>
                          <span className="text-[10px] text-gray-400 font-normal">{emp.cuit}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Fila: Semáforo */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Semáforo</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <SemaforoIndicator semaforo={emp.semaforo} />
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Score Total */}
                  <tr className="border-b bg-blue-50 font-bold">
                    <td className="py-3 px-4 text-gray-900 sticky left-0 bg-blue-50">Score Total</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        <span className="text-lg">{emp.score_total?.toFixed(1) || '—'}</span>
                        {emp.rating && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${RATING_COLORS[emp.rating] || ''}`}>
                            {emp.rating}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Filas: Scores por módulo */}
                  {Object.entries(MODULE_LABELS).map(([key, label]) => {
                    const scoreKey = `score_${key}`
                    const values = empresas.map(e => e[scoreKey] || 0)
                    const maxVal = Math.max(...values)
                    
                    return (
                      <tr key={key} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">{label}</td>
                        {empresas.map((emp, ci) => {
                          const val = emp[scoreKey] || 0
                          const isBest = val === maxVal && values.filter(v => v === maxVal).length === 1 && val > 0
                          return (
                            <td key={emp.cuit} className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-gray-100 rounded-full h-2">
                                  <div className={`h-2 rounded-full ${BAR_COLORS[ci % 5]}`} style={{ width: `${val}%` }} />
                                </div>
                                <span className={`text-sm min-w-[30px] ${isBest ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                                  {val || '—'}
                                  {isBest && ' ★'}
                                </span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {/* Separador BCRA */}
                  <tr className="bg-gray-100">
                    <td colSpan={empresas.length + 1} className="py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Datos BCRA
                    </td>
                  </tr>

                  {/* Fila: BCRA Score */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Score BCRA</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        {emp.bcra_score ? (
                          <span className={`font-medium ${
                            emp.bcra_score >= 80 ? 'text-green-600' :
                            emp.bcra_score >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {emp.bcra_score}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: BCRA Semáforo */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Semáforo BCRA</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        {emp.bcra_semaforo ? (
                          <SemaforoIndicator semaforo={emp.bcra_semaforo} size="sm" />
                        ) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Cheques rechazados */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Cheques rechazados</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        {emp.bcra_cheques_rechazados > 0 ? (
                          <AlertaBadge tipo="cheques" texto={`${emp.bcra_cheques_rechazados}`} />
                        ) : (
                          <span className="text-green-600 text-xs flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Ninguno
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Separador OFAC */}
                  <tr className="bg-gray-100">
                    <td colSpan={empresas.length + 1} className="py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Verificación OFAC (Sanciones)
                    </td>
                  </tr>

                  {/* Fila: OFAC Match */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Lista OFAC</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        {emp.ofac_match ? (
                          <div className="flex flex-col items-center gap-1">
                            <AlertaBadge tipo="ofac" texto={`${emp.ofac_confidence?.toFixed(0)}%`} />
                            {emp.ofac_matched_name && (
                              <span className="text-[10px] text-gray-500">{emp.ofac_matched_name.substring(0, 25)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-green-600 text-xs flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Limpio
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Nivel de riesgo OFAC */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Riesgo OFAC</td>
                    {empresas.map(emp => {
                      const riskColors = {
                        clear: 'text-green-600 bg-green-50',
                        low: 'text-gray-600 bg-gray-50',
                        medium: 'text-amber-600 bg-amber-50',
                        high: 'text-orange-600 bg-orange-50',
                        critical: 'text-red-600 bg-red-50',
                      }
                      return (
                        <td key={emp.cuit} className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[emp.ofac_risk_level] || ''}`}>
                            {emp.ofac_risk_level || 'clear'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Separador Alertas */}
                  <tr className="bg-gray-100">
                    <td colSpan={empresas.length + 1} className="py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Alertas
                    </td>
                  </tr>

                  {/* Fila: Total alertas */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Total alertas</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        <span className={`font-medium ${emp.cantidad_alertas > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {emp.cantidad_alertas || 0}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Alertas críticas */}
                  <tr className="border-b">
                    <td className="py-3 px-4 text-gray-700 font-medium sticky left-0 bg-white">Alertas críticas</td>
                    {empresas.map(emp => (
                      <td key={emp.cuit} className="py-3 px-4 text-center">
                        {emp.alertas_criticas > 0 ? (
                          <span className="text-red-600 font-bold">{emp.alertas_criticas}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusión automática */}
          {resultado.conclusion && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Conclusión automática
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {resultado.conclusion.replace(/\*\*/g, '')}
              </div>
            </div>
          )}

          {/* Recomendación */}
          {resultado.recomendacion?.empresa && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Empresa recomendada
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-900">
                    {resultado.recomendacion.empresa.razon_social || resultado.recomendacion.empresa.cuit}
                  </p>
                  <p className="text-sm text-green-700 mt-1">{resultado.recomendacion.razon}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-800">
                    {resultado.recomendacion.empresa.score_total?.toFixed(1) || '—'}
                  </p>
                  <p className="text-xs text-green-600">Score</p>
                </div>
              </div>
            </div>
          )}

          {/* UUID para referencia */}
          <div className="text-center text-xs text-gray-400">
            ID: {resultado.session_uuid}
          </div>
        </>
      )}
    </div>
  )
}

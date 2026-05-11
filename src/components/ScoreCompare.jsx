import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Loader2, Plus, X, BarChart3, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const MODULE_LABELS = {
  financiero: 'Financiero',
  comportamiento_pago: 'Pagos',
  fortaleza_comercial: 'Comercial',
  cumplimiento_legal: 'Legal',
  riesgo_mercado: 'Mercado',
  osint: 'OSINT',
  bcra: 'BCRA',
}

const RATING_COLORS = {
  AAA: 'text-green-700 bg-green-100',
  AA: 'text-green-600 bg-green-50',
  A: 'text-blue-700 bg-blue-100',
  BBB: 'text-blue-600 bg-blue-50',
  BB: 'text-amber-700 bg-amber-100',
  B: 'text-orange-700 bg-orange-100',
  CCC: 'text-red-700 bg-red-100',
}

const BAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500']

function CompareRadar({ companies, size = 320 }) {
  const modules = Object.keys(MODULE_LABELS)
  const n = modules.length
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 50

  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (index, value) => {
    const angle = startAngle + index * angleStep
    const r = (value / 100) * maxR
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
        {modules.map((_, i) => {
          const end = getPoint(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
        })}
        {companies.map((comp, ci) => {
          const scores = comp.scoring?.scores || comp.scoring?.data?.scores || {}
          const pts = modules.map((m, i) => getPoint(i, scores[m] || 0))
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

function ScoreCompare({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [allEmpresas, setAllEmpresas] = useState([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [loadingScoring, setLoadingScoring] = useState({})

  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        const res = await axios.get('/api/empresas')
        if (res.data.success) {
          setAllEmpresas(res.data.empresas || [])
        }
      } catch (err) { /* ignore */ }
      setLoadingEmpresas(false)
    }
    loadEmpresas()
  }, [])

  // Filtrado client-side (mismo estilo que ScoringSelector)
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return }
    const term = searchTerm.toLowerCase().trim()
    const termClean = term.replace(/[-.\s]/g, '')
    const filtered = allEmpresas.filter(e => {
      if (selectedCompanies.find(c => c.cuit === e.cuit)) return false
      const cuit = (e.cuit || '').toLowerCase()
      const cuitClean = cuit.replace(/[-.\s]/g, '')
      const nombre = (e.razon_social || '').toLowerCase()
      return cuitClean.includes(termClean) || nombre.includes(term)
    })
    setSearchResults(filtered.slice(0, 10))
  }, [searchTerm, allEmpresas, selectedCompanies])

  const addCompany = async (empresa) => {
    if (selectedCompanies.length >= 5) {
      toast.error('Máximo 5 empresas para comparar')
      return
    }
    if (selectedCompanies.find(c => c.cuit === empresa.cuit)) {
      toast.error('Empresa ya seleccionada')
      return
    }

    const entry = { ...empresa, scoring: null }
    setSelectedCompanies(prev => [...prev, entry])
    setSearchResults([])
    setSearchTerm('')

    // Load scoring for this company
    setLoadingScoring(prev => ({ ...prev, [empresa.cuit]: true }))
    try {
      const res = await axios.get(`/api/scoring/${empresa.cuit}`)
      if (res.data.success && res.data.data) {
        setSelectedCompanies(prev =>
          prev.map(c => c.cuit === empresa.cuit ? { ...c, scoring: res.data.data } : c)
        )
      }
    } catch (err) { /* no scoring */ }
    setLoadingScoring(prev => ({ ...prev, [empresa.cuit]: false }))
  }

  const removeCompany = (cuit) => {
    setSelectedCompanies(prev => prev.filter(c => c.cuit !== cuit))
  }

  const getScoringData = (comp) => comp.scoring?.data || comp.scoring

  const companiesWithScoring = selectedCompanies.filter(c => {
    const sd = getScoringData(c)
    return sd && sd.score_total !== undefined
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Comparar Scores</h2>
          <p className="text-sm text-gray-500">Selecciona hasta 5 empresas para comparar sus scores lado a lado</p>
        </div>
      </div>

      {/* Search to add */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Agregar empresa ({selectedCompanies.length}/5)
        </h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ingresa CUIT/RNC/RUT o nombre de empresa..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {loadingEmpresas && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* Search results */}
        {!loadingEmpresas && searchResults.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {searchResults.map(emp => (
              <button
                key={emp.id || emp.cuit}
                onClick={() => addCompany(emp)}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 group-hover:text-blue-700">{emp.razon_social}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-gray-600">{emp.tipo_identificacion || 'CUIT'}:</span> {emp.cuit}
                      {emp.actividad_principal && <span className="ml-3 text-gray-400">· {emp.actividad_principal}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {emp.scoring ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        emp.scoring.score_total >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        emp.scoring.score_total >= 60 ? 'bg-blue-100 text-blue-700' :
                        emp.scoring.score_total >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {emp.scoring.score_total} · {emp.scoring.rating}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-400">
                        Sin score
                      </span>
                    )}
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loadingEmpresas && searchResults.length === 0 && searchTerm.trim() && (
          <p className="text-sm text-gray-400 text-center py-4">No se encontraron empresas con ese CUIT/RNC/RUT</p>
        )}

        {!loadingEmpresas && !searchTerm.trim() && selectedCompanies.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Ingresa un CUIT/RNC/RUT o nombre para buscar</p>
        )}

        {/* Selected chips */}
        {selectedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {selectedCompanies.map((comp, i) => {
              const sd = getScoringData(comp)
              const isLoading = loadingScoring[comp.cuit]
              return (
                <span key={comp.cuit} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white ${
                  ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'][i % 5]
                }`}>
                  {comp.razon_social?.substring(0, 20) || comp.cuit}
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {!isLoading && sd?.score_total !== undefined && (
                    <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px]">{sd.score_total}</span>
                  )}
                  {!isLoading && !sd?.score_total && (
                    <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px]">—</span>
                  )}
                  <button onClick={() => removeCompany(comp.cuit)} className="hover:opacity-75 ml-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Comparison */}
      {companiesWithScoring.length >= 2 && (
        <>
          {/* Radar overlay */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Perfil Comparativo</h3>
            <CompareRadar companies={companiesWithScoring} />
            <div className="flex justify-center gap-4 mt-3">
              {companiesWithScoring.map((comp, i) => (
                <div key={comp.cuit} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-3 h-3 rounded-full ${BAR_COLORS[i % 5]}`} />
                  <span className="text-gray-600">{comp.razon_social?.substring(0, 20) || comp.cuit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score comparison table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Módulo</th>
                  {companiesWithScoring.map((comp, i) => (
                    <th key={comp.cuit} className="text-center py-3 px-4 font-semibold">
                      <span className={`${['text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600', 'text-rose-600'][i % 5]}`}>
                        {comp.razon_social?.substring(0, 20) || comp.cuit}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Total score row */}
                <tr className="border-b bg-gray-50 font-bold">
                  <td className="py-3 px-4 text-gray-900">Score Total</td>
                  {companiesWithScoring.map(comp => {
                    const sd = getScoringData(comp)
                    return (
                      <td key={comp.cuit} className="py-3 px-4 text-center">
                        <span className="text-lg">{sd.score_total}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${RATING_COLORS[sd.rating] || ''}`}>
                          {sd.rating}
                        </span>
                      </td>
                    )
                  })}
                </tr>
                {/* Module rows */}
                {Object.entries(MODULE_LABELS).map(([key, label]) => {
                  const values = companiesWithScoring.map(c => (getScoringData(c)?.scores || {})[key] || 0)
                  const maxVal = Math.max(...values)
                  return (
                    <tr key={key} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700 font-medium">{label}</td>
                      {companiesWithScoring.map((comp, ci) => {
                        const val = (getScoringData(comp)?.scores || {})[key] || 0
                        const isBest = val === maxVal && values.filter(v => v === maxVal).length === 1
                        return (
                          <td key={comp.cuit} className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full ${BAR_COLORS[ci % 5]}`} style={{ width: `${val}%` }} />
                              </div>
                              <span className={`text-sm ${isBest ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                                {val}
                                {isBest && ' ★'}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Individual cards when less than 2 with scoring */}
      {selectedCompanies.length > 0 && companiesWithScoring.length < 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {companiesWithScoring.length === 0 && selectedCompanies.length === 1
              ? 'Agrega al menos otra empresa con scoring para comparar'
              : companiesWithScoring.length === 1
              ? 'Se necesita al menos 1 empresa más con scoring para comparar'
              : 'Se necesitan al menos 2 empresas con scoring calculado para comparar'
            }
          </p>
          {selectedCompanies.some(c => !getScoringData(c)?.score_total) && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠ Algunas empresas seleccionadas no tienen scoring calculado. Calcula su score primero desde "Calcular Score".
            </p>
          )}
        </div>
      )}

      {selectedCompanies.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">Busca y selecciona empresas</h3>
          <p className="text-sm text-gray-400 mt-1">
            Agrega entre 2 y 5 empresas para ver una comparación visual de sus scores
          </p>
        </div>
      )}
    </div>
  )
}

export default ScoreCompare

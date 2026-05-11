import { useState, useEffect, useRef } from 'react'
import { 
  BarChart3, TrendingUp, TrendingDown, Building2, Target, Award, AlertTriangle,
  Download, FileSpreadsheet, FileText, Loader2, RefreshCw, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Minus, Filter, Calendar
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const RATING_CONFIG = {
  AAA: { color: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Excelente' },
  AA:  { color: '#10b981', bg: 'bg-green-100', text: 'text-green-700', label: 'Muy bueno' },
  A:   { color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bueno' },
  BBB: { color: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Aceptable' },
  BB:  { color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700', label: 'Regular' },
  B:   { color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', label: 'Riesgoso' },
  CCC: { color: '#ef4444', bg: 'bg-red-100', text: 'text-red-700', label: 'Crítico' },
}

const RATING_ORDER = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']

// ═══════════════════════════════════════════════
// Dona Chart - Distribución por Rating
// ═══════════════════════════════════════════════
function DonutChart({ data }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
        Sin datos para graficar
      </div>
    )
  }

  const cx = 100, cy = 100, radius = 80, innerRadius = 50
  let cumulativeAngle = -90 // empezar arriba

  const slices = RATING_ORDER.map(rating => {
    const value = data[rating] || 0
    const pct = value / total
    const angle = pct * 360
    const startAngle = cumulativeAngle
    cumulativeAngle += angle
    return { rating, value, pct, startAngle, angle }
  }).filter(s => s.value > 0)

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const describeArc = (cx, cy, outerR, innerR, startAngle, endAngle) => {
    // Para arcos completos (>359°)
    if (endAngle - startAngle >= 359.99) {
      const outerStart = polarToCartesian(cx, cy, outerR, startAngle)
      const outerMid = polarToCartesian(cx, cy, outerR, startAngle + 180)
      const innerStart = polarToCartesian(cx, cy, innerR, startAngle)
      const innerMid = polarToCartesian(cx, cy, innerR, startAngle + 180)
      return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 0 1 ${outerMid.x} ${outerMid.y}`,
        `A ${outerR} ${outerR} 0 0 1 ${outerStart.x} ${outerStart.y}`,
        `M ${innerStart.x} ${innerStart.y}`,
        `A ${innerR} ${innerR} 0 0 0 ${innerMid.x} ${innerMid.y}`,
        `A ${innerR} ${innerR} 0 0 0 ${innerStart.x} ${innerStart.y}`,
        'Z'
      ].join(' ')
    }

    const outerStart = polarToCartesian(cx, cy, outerR, startAngle)
    const outerEnd = polarToCartesian(cx, cy, outerR, endAngle)
    const innerEnd = polarToCartesian(cx, cy, innerR, endAngle)
    const innerStart = polarToCartesian(cx, cy, innerR, startAngle)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ')
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {slices.map((s, i) => (
            <path
              key={s.rating}
              d={describeArc(cx, cy, radius, innerRadius, s.startAngle, s.startAngle + s.angle)}
              fill={RATING_CONFIG[s.rating].color}
              className="transition-opacity hover:opacity-80 cursor-pointer"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            >
              <title>{s.rating}: {s.value} ({(s.pct * 100).toFixed(0)}%)</title>
            </path>
          ))}
          {/* Centro */}
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-2xl font-bold fill-gray-800">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="text-xs fill-gray-500">empresas</text>
        </svg>
      </div>
      <div className="flex flex-col gap-1.5">
        {RATING_ORDER.map(rating => {
          const value = data[rating] || 0
          if (value === 0) return null
          const pct = ((value / total) * 100).toFixed(0)
          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: RATING_CONFIG[rating].color }} />
              <span className="font-bold w-8">{rating}</span>
              <span className="text-gray-600">{value}</span>
              <span className="text-gray-400">({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Barras Horizontales - Módulos o Rankings
// ═══════════════════════════════════════════════
function HorizontalBar({ label, value, maxValue = 100, color = '#3b82f6', suffix = '', showValue = true }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-40 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      {showValue && <span className="text-sm font-semibold text-gray-700 w-12 text-right">{value}{suffix}</span>}
    </div>
  )
}

// ═══════════════════════════════════════════════
// Radar de Módulos (SVG)
// ═══════════════════════════════════════════════
function RadarChart({ data }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return null

  const cx = 120, cy = 120, maxR = 90
  const n = entries.length
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index, value) => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const gridLevels = [20, 40, 60, 80, 100]

  const points = entries.map(([, val], i) => getPoint(i, val))
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width="240" height="240" viewBox="0 0 240 240">
      {/* Grid circles */}
      {gridLevels.map(level => {
        const r = (level / 100) * maxR
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = angleStep * i - Math.PI / 2
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
        }).join(' ')
        return <polygon key={level} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
      })}
      {/* Axis lines */}
      {entries.map(([, ], i) => {
        const end = getPoint(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="0.5" />
      })}
      {/* Data polygon */}
      <polygon points={polygonPoints} fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="2" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
      ))}
      {/* Labels */}
      {entries.map(([label, val], i) => {
        const labelPoint = getPoint(i, 120)
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] fill-gray-600 font-medium"
          >
            {label.length > 14 ? label.slice(0, 12) + '…' : label}
          </text>
        )
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════════
// Evolución Temporal (Line chart SVG)
// ═══════════════════════════════════════════════
function EvolutionChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
        Se necesitan al menos 2 puntos de datos para mostrar la evolución
      </div>
    )
  }

  const W = 600, H = 200, padL = 45, padR = 20, padT = 20, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const values = data.map(d => d.promedio)
  const minVal = Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 10)
  const maxVal = Math.min(100, Math.ceil(Math.max(...values) / 10) * 10 + 10)
  const range = maxVal - minVal || 1

  const getX = (i) => padL + (i / (data.length - 1)) * chartW
  const getY = (v) => padT + chartH - ((v - minVal) / range) * chartH

  const points = data.map((d, i) => `${getX(i)},${getY(d.promedio)}`)
  const polyline = points.join(' ')
  const areaPath = `M ${getX(0)},${padT + chartH} L ${polyline.replace(/,/g, ' L ').replace(/ L /, ',')} L ${getX(data.length - 1)},${padT + chartH} Z`

  // Grid lines (horizontal)
  const gridSteps = 5
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = minVal + (range / gridSteps) * i
    return { y: getY(val), label: Math.round(val) }
  })

  // X-axis labels (show max ~8)
  const labelStep = Math.max(1, Math.floor(data.length / 8))

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padL - 8} y={g.y + 4} textAnchor="end" className="text-[10px] fill-gray-400">{g.label}</text>
        </g>
      ))}
      {/* Area */}
      <path d={areaPath} fill="url(#areaGrad)" />
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.promedio)} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
          <title>{d.fecha}: {d.promedio} ({d.cantidad} cálculos)</title>
        </g>
      ))}
      {/* X labels */}
      {data.map((d, i) => {
        if (i % labelStep !== 0 && i !== data.length - 1) return null
        const dateStr = d.fecha ? new Date(d.fecha + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' }) : ''
        return (
          <text key={i} x={getX(i)} y={H - 8} textAnchor="middle" className="text-[9px] fill-gray-400">
            {dateStr}
          </text>
        )
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════
function KPICard({ icon: Icon, title, value, subtitle, color = 'blue', trend }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  }
  const iconColorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }

  return (
    <div className={`bg-white rounded-xl border ${colorMap[color]} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconColorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> :
             trend === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> :
             <Minus className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{title}</p>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════
export default function ScoringDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFullTable, setShowFullTable] = useState(false)
  const [showRatingScale, setShowRatingScale] = useState(false)
  const [tableSort, setTableSort] = useState({ field: 'score_total', dir: 'desc' })
  const [tableFilter, setTableFilter] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterScoreMin, setFilterScoreMin] = useState('')
  const [filterScoreMax, setFilterScoreMax] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/scoring/dashboard')
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (err) {
      toast.error('Error cargando dashboard de scoring')
    } finally {
      setLoading(false)
    }
  }

  // ── Export Excel (CSV) ──
  const exportExcel = () => {
    if (!data?.lista_completa?.length) {
      toast.error('No hay datos para exportar')
      return
    }
    const headers = [
      'Razón Social', 'Identificación', 'Tipo', 'Score Total', 'Rating',
      'Financiero', 'Comp. Pago', 'Fortaleza Com.', 'Cumplimiento', 'Riesgo Mercado', 'OSINT', 'BCRA',
      'Fecha', 'Calculado por'
    ]
    let csv = '\uFEFF' + headers.join(',') + '\n'
    data.lista_completa.forEach(e => {
      csv += [
        `"${(e.razon_social || '').replace(/"/g, '""')}"`,
        `"${e.cuit}"`,
        e.tipo_identificacion || 'CUIT',
        e.score_total,
        e.rating,
        e.score_financiero,
        e.score_comportamiento_pago,
        e.score_fortaleza_comercial,
        e.score_cumplimiento_legal,
        e.score_riesgo_mercado,
        e.score_osint,
        e.score_bcra || '',
        `"${e.created_at?.slice(0, 19).replace('T', ' ') || ''}"`,
        `"${e.calculado_por || ''}"`
      ].join(',') + '\n'
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scoring_dashboard_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Reporte CSV exportado correctamente')
  }

  // ── Export PDF (HTML to print) ──
  const exportPDF = () => {
    if (!data) return

    const dist = data.distribucion_ratings
    const mod = data.promedios_modulos

    const ratingRows = RATING_ORDER.map(r =>
      `<tr><td style="padding:6px 12px;font-weight:bold;color:${RATING_CONFIG[r].color}">${r}</td>
       <td style="padding:6px 12px;text-align:center">${dist[r] || 0}</td>
       <td style="padding:6px 12px">${RATING_CONFIG[r].label}</td></tr>`
    ).join('')

    const moduleRows = Object.entries(mod).map(([name, val]) =>
      `<tr><td style="padding:6px 12px">${name}</td>
       <td style="padding:6px 12px;text-align:center;font-weight:bold">${val}</td>
       <td style="padding:6px 12px">
         <div style="background:#e5e7eb;border-radius:4px;height:14px;width:200px">
           <div style="background:${val >= 70 ? '#059669' : val >= 50 ? '#3b82f6' : val >= 30 ? '#f59e0b' : '#ef4444'};height:100%;width:${val}%;border-radius:4px"></div>
         </div>
       </td></tr>`
    ).join('')

    const empresaRows = (data.lista_completa || []).map(e =>
      `<tr>
        <td style="padding:4px 8px;font-size:11px">${e.razon_social || '-'}</td>
        <td style="padding:4px 8px;font-size:11px">${e.cuit}</td>
        <td style="padding:4px 8px;text-align:center;font-weight:bold;color:${RATING_CONFIG[e.rating]?.color || '#666'}">${e.score_total}</td>
        <td style="padding:4px 8px;text-align:center;font-weight:bold;color:${RATING_CONFIG[e.rating]?.color || '#666'}">${e.rating}</td>
       </tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Dashboard Scoring Crediticio - Infogroup</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 30px; color: #1f2937; }
  h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 8px; }
  h2 { color: #374151; margin-top: 30px; }
  .kpis { display: flex; gap: 16px; margin: 20px 0; }
  .kpi { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
  .kpi .value { font-size: 28px; font-weight: bold; color: #1e40af; }
  .kpi .label { font-size: 12px; color: #64748b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { border-bottom: 1px solid #f1f5f9; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { margin: 15px; } }
</style></head><body>
<h1>📊 Dashboard Scoring Crediticio</h1>
<p style="color:#64748b">Generado: ${new Date().toLocaleString('es')} — Infogroup</p>
<div class="kpis">
  <div class="kpi"><div class="value">${data.total_evaluadas}</div><div class="label">Empresas Evaluadas</div></div>
  <div class="kpi"><div class="value">${data.total_empresas}</div><div class="label">Total en Sistema</div></div>
  <div class="kpi"><div class="value">${data.promedio_global}</div><div class="label">Score Promedio</div></div>
  <div class="kpi"><div class="value">${data.score_maximo}</div><div class="label">Score Máximo</div></div>
  <div class="kpi"><div class="value">${data.score_minimo}</div><div class="label">Score Mínimo</div></div>
</div>
<h2>Distribución por Rating</h2>
<table><thead><tr><th>Rating</th><th style="text-align:center">Cantidad</th><th>Descripción</th></tr></thead>
<tbody>${ratingRows}</tbody></table>
<h2>Promedios por Módulo</h2>
<table><thead><tr><th>Módulo</th><th style="text-align:center">Promedio</th><th>Gráfico</th></tr></thead>
<tbody>${moduleRows}</tbody></table>
<h2>Todas las Empresas Evaluadas</h2>
<table><thead><tr><th>Razón Social</th><th>Identificación</th><th style="text-align:center">Score</th><th style="text-align:center">Rating</th></tr></thead>
<tbody>${empresaRows}</tbody></table>
<div class="footer">Infogroup © 2026 — Dashboard de Scoring Crediticio</div>
</body></html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  // ── Sorting / Filtering ──
  const getSortedFiltered = () => {
    if (!data?.lista_completa) return []
    let list = [...data.lista_completa]
    if (tableFilter) {
      const f = tableFilter.toLowerCase()
      list = list.filter(e =>
        (e.razon_social || '').toLowerCase().includes(f) ||
        (e.cuit || '').toLowerCase().includes(f) ||
        (e.rating || '').toLowerCase().includes(f)
      )
    }
    if (filterRating) {
      list = list.filter(e => e.rating === filterRating)
    }
    if (filterScoreMin !== '') {
      const min = Number(filterScoreMin)
      if (!isNaN(min)) list = list.filter(e => e.score_total >= min)
    }
    if (filterScoreMax !== '') {
      const max = Number(filterScoreMax)
      if (!isNaN(max)) list = list.filter(e => e.score_total <= max)
    }
    list.sort((a, b) => {
      const aVal = a[tableSort.field] ?? ''
      const bVal = b[tableSort.field] ?? ''
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal))
      return tableSort.dir === 'desc' ? -cmp : cmp
    })
    return list
  }

  const toggleSort = (field) => {
    setTableSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
        <p className="text-gray-600">No se pudieron cargar las estadísticas</p>
        <button onClick={loadDashboard} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Reintentar
        </button>
      </div>
    )
  }

  const cobertura = data.total_empresas > 0
    ? ((data.total_evaluadas / data.total_empresas) * 100).toFixed(0)
    : 0

  const sortedList = getSortedFiltered()

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />
            Dashboard de Scoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">Resumen ejecutivo del análisis crediticio</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDashboard} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <KPICard
          icon={Building2}
          title="Empresas Evaluadas"
          value={data.total_evaluadas}
          subtitle={`de ${data.total_empresas} en el sistema`}
          color="blue"
        />
        <KPICard
          icon={Target}
          title="Score Promedio"
          value={data.promedio_global}
          subtitle={`Rango: ${data.score_minimo} - ${data.score_maximo}`}
          color={data.promedio_global >= 60 ? 'green' : 'amber'}
        />
        <KPICard
          icon={TrendingUp}
          title="Score Máximo"
          value={data.score_maximo}
          color="green"
          trend="up"
        />
        <KPICard
          icon={TrendingDown}
          title="Score Mínimo"
          value={data.score_minimo}
          color="red"
          trend="down"
        />
        <KPICard
          icon={Award}
          title="Cobertura"
          value={`${cobertura}%`}
          subtitle="empresas con scoring"
          color="purple"
        />
      </div>

      {/* Escala de Ratings - Referencia colapsable */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowRatingScale(!showRatingScale)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-500" />
            Escala de Ratings — Referencia de Puntuación
          </h3>
          {showRatingScale ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showRatingScale && (
          <div className="border-t border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-4">Cada empresa recibe un score de 0 a 100 puntos que se traduce en un rating crediticio según la siguiente escala:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { rating: 'AAA', min: 90, max: 100, desc: 'Riesgo mínimo. Máxima capacidad de pago.' },
                { rating: 'AA', min: 80, max: 89, desc: 'Riesgo muy bajo. Excelente solvencia.' },
                { rating: 'A', min: 70, max: 79, desc: 'Riesgo bajo. Buena solidez financiera.' },
                { rating: 'BBB', min: 60, max: 69, desc: 'Riesgo moderado. Capacidad aceptable.' },
                { rating: 'BB', min: 50, max: 59, desc: 'Riesgo medio-alto. Requiere seguimiento.' },
                { rating: 'B', min: 40, max: 49, desc: 'Riesgo alto. Debilidades significativas.' },
                { rating: 'CCC', min: 0, max: 39, desc: 'Riesgo crítico. Probabilidad de incumplimiento.' },
              ].map(item => {
                const cfg = RATING_CONFIG[item.rating]
                const count = data.distribucion_ratings[item.rating] || 0
                return (
                  <div key={item.rating} className={`rounded-xl border p-4 ${cfg.bg} border-opacity-50`} style={{ borderColor: cfg.color + '40' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xl sm:text-2xl font-black ${cfg.text}`}>{item.rating}</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/70 text-gray-600">
                        {item.min} — {item.max} pts
                      </span>
                    </div>
                    <p className={`text-xs font-semibold ${cfg.text} mb-1`}>{cfg.label}</p>
                    <p className="text-[11px] text-gray-600 leading-relaxed">{item.desc}</p>
                    {count > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <span className="text-xs text-gray-500">{count} empresa{count !== 1 ? 's' : ''} en este rango</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Donut - Distribución de Ratings */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-500" />
            Distribución por Rating
          </h3>
          <DonutChart data={data.distribucion_ratings} />
        </div>

        {/* Radar - Promedios por Módulo */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Promedios por Módulo
          </h3>
          <div className="flex flex-col items-center">
            <RadarChart data={data.promedios_modulos} />
            <div className="mt-4 w-full space-y-2">
              {Object.entries(data.promedios_modulos).map(([name, val]) => (
                <HorizontalBar
                  key={name}
                  label={name}
                  value={val}
                  color={val >= 70 ? '#059669' : val >= 50 ? '#3b82f6' : val >= 30 ? '#f59e0b' : '#ef4444'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rankings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Evolución Temporal */}
        {data.evolucion?.length >= 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 lg:col-span-2">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Evolución Temporal del Score Promedio
            </h3>
            <EvolutionChart data={data.evolucion} />
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              Promedio diario basado en todos los cálculos realizados — últimos 90 días
            </p>
          </div>
        )}
      </div>

      {/* Rankings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Top 10 Mejores */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Top 10 — Mejores Scores
          </h3>
          {data.top_mejores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {data.top_mejores.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.razon_social || e.cuit}</p>
                    <p className="text-[11px] text-gray-400">{e.tipo_identificacion || 'CUIT'}: {e.cuit}</p>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(e.score_total)}`}>{e.score_total}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${RATING_CONFIG[e.rating]?.bg} ${RATING_CONFIG[e.rating]?.text}`}>
                    {e.rating}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 10 Peores */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Top 10 — Scores más Bajos
          </h3>
          {data.top_peores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {data.top_peores.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 text-red-700">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.razon_social || e.cuit}</p>
                    <p className="text-[11px] text-gray-400">{e.tipo_identificacion || 'CUIT'}: {e.cuit}</p>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(e.score_total)}`}>{e.score_total}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${RATING_CONFIG[e.rating]?.bg} ${RATING_CONFIG[e.rating]?.text}`}>
                    {e.rating}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actividad Reciente */}
      {data.recientes?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-gray-500" />
            Actividad Reciente
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Empresa</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Identificación</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Score</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Rating</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Fecha</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {data.recientes.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{e.razon_social || '-'}</td>
                    <td className="py-2.5 px-3 text-gray-500 font-mono text-xs">{e.cuit}</td>
                    <td className={`py-2.5 px-3 text-center font-bold ${getScoreColor(e.score_total)}`}>
                      <span>{e.score_total}</span>
                      {e.prev_score != null && e.score_total !== e.prev_score && (
                        <span className={`ml-1.5 text-xs font-semibold ${e.score_total > e.prev_score ? 'text-emerald-600' : 'text-red-500'}`}>
                          {e.score_total > e.prev_score ? '▲' : '▼'}
                          {Math.abs(Number((e.score_total - e.prev_score).toFixed(2)))}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${RATING_CONFIG[e.rating]?.bg} ${RATING_CONFIG[e.rating]?.text}`}>
                        {e.rating}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs">
                      {e.created_at ? new Date(e.created_at).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{e.calculado_por || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla Completa expandible */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowFullTable(!showFullTable)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            Todas las Empresas Evaluadas ({data.lista_completa?.length || 0})
          </h3>
          {showFullTable ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showFullTable && (
          <div className="border-t border-gray-100 p-4">
            {/* Advanced Filters */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-gray-500 mb-1">Buscar</label>
                <input
                  type="text"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Nombre, identificación..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs text-gray-500 mb-1">Rating</label>
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Todos</option>
                  {RATING_ORDER.map(r => (
                    <option key={r} value={r}>{r} — {RATING_CONFIG[r].label}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Score mín</label>
                <input
                  type="number"
                  value={filterScoreMin}
                  onChange={(e) => setFilterScoreMin(e.target.value)}
                  placeholder="0"
                  min="0" max="100"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Score máx</label>
                <input
                  type="number"
                  value={filterScoreMax}
                  onChange={(e) => setFilterScoreMax(e.target.value)}
                  placeholder="100"
                  min="0" max="100"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {(tableFilter || filterRating || filterScoreMin || filterScoreMax) && (
                <button
                  onClick={() => { setTableFilter(''); setFilterRating(''); setFilterScoreMin(''); setFilterScoreMax('') }}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
              <span className="text-xs text-gray-400 self-center">
                {sortedList.length} resultado{sortedList.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    {[
                      { field: 'razon_social', label: 'Razón Social' },
                      { field: 'cuit', label: 'Identificación' },
                      { field: 'score_total', label: 'Score' },
                      { field: 'rating', label: 'Rating' },
                      { field: 'score_financiero', label: 'Fin.' },
                      { field: 'score_comportamiento_pago', label: 'Pago' },
                      { field: 'score_fortaleza_comercial', label: 'Com.' },
                      { field: 'score_cumplimiento_legal', label: 'Legal' },
                      { field: 'score_riesgo_mercado', label: 'Merc.' },
                      { field: 'score_osint', label: 'OSINT' },
                      { field: 'score_bcra', label: 'BCRA' },
                    ].map(col => (
                      <th
                        key={col.field}
                        className="text-left py-2 px-3 text-xs text-gray-500 font-medium cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
                        onClick={() => toggleSort(col.field)}
                      >
                        {col.label}
                        {tableSort.field === col.field && (
                          <span className="ml-1">{tableSort.dir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((e, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30">
                      <td className="py-2 px-3 font-medium text-gray-800 max-w-[200px] truncate" title={e.razon_social}>{e.razon_social || '-'}</td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-xs">{e.cuit}</td>
                      <td className={`py-2 px-3 font-bold ${getScoreColor(e.score_total)}`}>{e.score_total}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${RATING_CONFIG[e.rating]?.bg} ${RATING_CONFIG[e.rating]?.text}`}>
                          {e.rating}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_financiero}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_comportamiento_pago}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_fortaleza_comercial}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_cumplimiento_legal}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_riesgo_mercado}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_osint}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{e.score_bcra || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedList.length === 0 && (
                <p className="text-center py-6 text-gray-400 text-sm">
                  {tableFilter ? 'Sin resultados para el filtro aplicado' : 'No hay empresas evaluadas aún'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, Shield, Globe, BarChart3, Scale, Building2, Newspaper, Clock, ChevronDown, ChevronUp, FileDown, AlertTriangle, Landmark } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const MODULE_INFO = {
  financiero: { label: 'Financiero', icon: TrendingUp, color: 'blue', desc: 'Situación económica y capital' },
  comportamiento_pago: { label: 'Comportamiento de pago', icon: Scale, color: 'green', desc: 'Relaciones bancarias y riesgo' },
  fortaleza_comercial: { label: 'Fortaleza comercial', icon: Building2, color: 'purple', desc: 'Trayectoria y estructura' },
  cumplimiento_legal: { label: 'Cumplimiento legal', icon: Shield, color: 'amber', desc: 'Legal y compliance' },
  riesgo_mercado: { label: 'Riesgo de mercado', icon: BarChart3, color: 'red', desc: 'Sector y mercado' },
  osint: { label: 'OSINT', icon: Globe, color: 'teal', desc: 'Inteligencia fuentes abiertas' },
  bcra: { label: 'BCRA', icon: Landmark, color: 'indigo', desc: 'Central de deudores y cheques' },
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

const CURRENCY_LOCALE = {
  ARS: 'es-AR',
  UYU: 'es-UY',
  COP: 'es-CO',
  PEN: 'es-PE',
  CLP: 'es-CL',
  DOP: 'es-DO',
  CRC: 'es-CR',
  BRL: 'pt-BR',
  USD: 'en-US',
}

function formatCurrencyAmount(amount, currencyCode) {
  const code = String(currencyCode || 'ARS').toUpperCase()
  const locale = CURRENCY_LOCALE[code] || 'es-AR'
  const value = Number(amount || 0)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function ScoreGauge({ score, rating, size = 'large' }) {
  const radius = size === 'large' ? 80 : 40
  const strokeWidth = size === 'large' ? 12 : 8
  const circumference = 2 * Math.PI * radius
  const fillPercent = score / 100
  const strokeDashoffset = circumference * (1 - fillPercent * 0.75) // 270 degree arc
  const svgSize = (radius + strokeWidth) * 2

  const getColor = (s) => {
    if (s >= 80) return '#16a34a'
    if (s >= 60) return '#2563eb'
    if (s >= 40) return '#d97706'
    return '#dc2626'
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={svgSize} height={svgSize} className="transform -rotate-[135deg]">
        {/* Background arc */}
        <circle
          cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <circle
          cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius}
          fill="none" stroke={getColor(score)} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className={`absolute flex flex-col items-center ${size === 'large' ? 'mt-12' : 'mt-4'}`}>
        <span className={`font-bold ${size === 'large' ? 'text-4xl' : 'text-xl'}`} style={{ color: getColor(score) }}>
          {score}
        </span>
        {rating && (
          <span className={`px-2 py-0.5 rounded text-xs font-bold mt-1 ${RATING_COLORS[rating] || 'bg-gray-100 text-gray-700'}`}>
            {rating}
          </span>
        )}
      </div>
    </div>
  )
}

function ModuleCard({ moduleKey, score, signals, weight }) {
  const [expanded, setExpanded] = useState(false)
  const info = MODULE_INFO[moduleKey] || { label: moduleKey, icon: BarChart3, color: 'gray', desc: '' }
  const Icon = info.icon

  const getBarColor = (s) => {
    if (s >= 80) return 'bg-green-500'
    if (s >= 60) return 'bg-blue-500'
    if (s >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getTrend = (s) => {
    if (s >= 70) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (s >= 40) return <Minus className="h-4 w-4 text-amber-500" />
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-${info.color}-50`}>
            <Icon className={`h-5 w-5 text-${info.color}-600`} />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-900">{info.label}</h4>
            <p className="text-xs text-gray-500">{info.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getTrend(score)}
          <span className="text-lg font-bold text-gray-900">{score}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${getBarColor(score)} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Peso: {Math.round(weight * 100)}%</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          {expanded ? 'Ocultar' : 'Ver señales'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded && signals && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-2">
          {signals.positivas?.length > 0 && (
            <div>
              <span className="font-medium text-green-700">Positivas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {signals.positivas.map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}
          {signals.negativas?.length > 0 && (
            <div>
              <span className="font-medium text-red-700">Negativas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {signals.negativas.map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}
          {signals.antiguedad && (
            <p className="text-gray-600"><span className="font-medium">Antigüedad:</span> {signals.antiguedad}</p>
          )}
          {signals.bonus && (
            <p className="text-blue-600"><span className="font-medium">Bonus:</span> {signals.bonus}</p>
          )}
          {signals.nota && (
            <p className="text-gray-500 italic">{signals.nota}</p>
          )}
          {signals.url && (
            <p className="text-gray-600"><span className="font-medium">URL analizada:</span> {signals.url}</p>
          )}
          {signals.noticias_encontradas !== undefined && signals.noticias_encontradas > 0 && (
            <p className="text-gray-600"><span className="font-medium">Noticias:</span> {signals.noticias_encontradas} encontradas</p>
          )}
          {moduleKey === 'osint' && (
            <>
              {signals.linkedin_perfil_url && (
                <p className="text-gray-600 break-all">
                  <span className="font-medium">Perfil LinkedIn:</span>{' '}
                  <a href={signals.linkedin_perfil_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {signals.linkedin_perfil_url}
                  </a>
                </p>
              )}
              {signals.linkedin_tiene_perfil === false && (
                <p className="text-amber-700"><span className="font-medium">LinkedIn:</span> sin perfil corporativo confirmado en esta búsqueda</p>
              )}
              {signals.linkedin_empleados > 0 && (
                <p className="text-gray-600"><span className="font-medium">Perfiles relacionados:</span> {signals.linkedin_empleados}</p>
              )}
              {signals.linkedin_resultados?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700">Evidencia LinkedIn:</p>
                  <ul className="mt-1 space-y-1">
                    {signals.linkedin_resultados.slice(0, 3).map((r, idx) => (
                      <li key={idx} className="text-gray-600">
                        • <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.title || r.url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {signals.linkedin_score_desglose?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700">Cómo se calculó LinkedIn:</p>
                  <ul className="mt-1 space-y-1">
                    {signals.linkedin_score_desglose.map((item, idx) => (
                      <li key={idx} className="text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {signals.google_resultados_estimados > 0 && (
                <p className="text-gray-600"><span className="font-medium">Resultados Google:</span> {signals.google_resultados_estimados.toLocaleString('es-AR')}</p>
              )}
              {signals.google_knowledge_panel && (
                <p className="text-emerald-700"><span className="font-medium">Google:</span> Knowledge Panel detectado</p>
              )}
              {signals.google_snippets?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700">Top resultados Google:</p>
                  <ul className="mt-1 space-y-1">
                    {signals.google_snippets.slice(0, 3).map((snippet, idx) => (
                      <li key={idx} className="text-gray-600">• {snippet}</li>
                    ))}
                  </ul>
                </div>
              )}
              {signals.noticias?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700">Noticias detectadas:</p>
                  <ul className="mt-1 space-y-1">
                    {signals.noticias.slice(0, 3).map((n, idx) => (
                      <li key={idx} className="text-gray-600">
                        • {n.titulo}
                        {n.link && (
                          <a href={n.link} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 hover:underline">(ver)</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {signals.blacklist_coincidencias?.length > 0 && (
                <div>
                  <p className="font-medium text-red-700">Coincidencias sanciones:</p>
                  <ul className="mt-1 space-y-1">
                    {signals.blacklist_coincidencias.slice(0, 3).map((c, idx) => (
                      <li key={idx} className="text-red-600">• {c.fuente}: {c.detalle}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {signals.conteo_positivo === 0 && signals.conteo_negativo === 0 && !signals.nota && !signals.url && (
            <p className="text-gray-400 italic">Sin señales detectadas en los textos extraídos</p>
          )}
        </div>
      )}
    </div>
  )
}

function RadarChart({ scores, size = 280 }) {
  const modules = Object.entries(scores || {})
  const n = modules.length
  if (n === 0) return null

  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 40

  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (index, value) => {
    const angle = startAngle + index * angleStep
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const getLabelPoint = (index) => {
    const angle = startAngle + index * angleStep
    const r = maxR + 22
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  // Grid levels: 20, 40, 60, 80, 100
  const levels = [20, 40, 60, 80, 100]

  const dataPoints = modules.map(([, val], i) => getPoint(i, val))
  const polygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  const shortLabels = {
    financiero: 'Financiero',
    comportamiento_pago: 'Pagos',
    fortaleza_comercial: 'Comercial',
    cumplimiento_legal: 'Legal',
    riesgo_mercado: 'Mercado',
    osint: 'OSINT',
    bcra: 'BCRA',
  }

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid levels */}
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
        {/* Axes */}
        {modules.map((_, i) => {
          const end = getPoint(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
        })}
        {/* Data polygon */}
        <polygon points={polygon} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
        ))}
        {/* Labels */}
        {modules.map(([key, val], i) => {
          const lp = getLabelPoint(i)
          return (
            <text key={key} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
              className="text-[10px] fill-gray-600 font-medium">
              {shortLabels[key] || key} ({val})
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Mini chart de evolución para el historial
// ═══════════════════════════════════════════════
function HistoryMiniChart({ history }) {
  // history viene DESC, lo invertimos para dibujar de izq a der (oldest first)
  const data = [...history].reverse()
  if (data.length < 2) return null

  const W = 500, H = 80, padL = 30, padR = 10, padT = 10, padB = 20
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const scores = data.map(d => d.score_total)
  const minV = Math.max(0, Math.floor(Math.min(...scores) / 10) * 10 - 5)
  const maxV = Math.min(100, Math.ceil(Math.max(...scores) / 10) * 10 + 5)
  const range = maxV - minV || 1

  const getX = (i) => padL + (i / (data.length - 1)) * chartW
  const getY = (v) => padT + chartH - ((v - minV) / range) * chartH

  const pts = data.map((d, i) => `${getX(i)},${getY(d.score_total)}`)
  const polyline = pts.join(' ')

  const getColor = (s) => s >= 80 ? '#059669' : s >= 60 ? '#3b82f6' : s >= 40 ? '#d97706' : '#dc2626'

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* Y axis labels */}
      <text x={padL - 4} y={padT + 4} textAnchor="end" className="text-[9px] fill-gray-400">{maxV}</text>
      <text x={padL - 4} y={padT + chartH + 4} textAnchor="end" className="text-[9px] fill-gray-400">{minV}</text>
      {/* Grid line */}
      <line x1={padL} y1={padT + chartH / 2} x2={W - padR} y2={padT + chartH / 2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      {/* Points with score */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.score_total)} r="4" fill={getColor(d.score_total)} stroke="#fff" strokeWidth="2" />
          <text x={getX(i)} y={getY(d.score_total) - 8} textAnchor="middle" className="text-[9px] fill-gray-600 font-semibold">
            {d.score_total}
          </text>
          <title>{new Date(d.created_at).toLocaleDateString('es-AR')}: {d.score_total} ({d.rating})</title>
        </g>
      ))}
      {/* X labels for first and last */}
      <text x={getX(0)} y={H - 4} textAnchor="start" className="text-[8px] fill-gray-400">
        {new Date(data[0].created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
      </text>
      <text x={getX(data.length - 1)} y={H - 4} textAnchor="end" className="text-[8px] fill-gray-400">
        {new Date(data[data.length - 1].created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
      </text>
    </svg>
  )
}

// ═══════════════════════════════════════════════
// Entrada expandible del historial
// ═══════════════════════════════════════════════
function TrendBadge({ current, previous }) {
  if (previous === undefined || previous === null) return null
  const diff = Number((current - previous).toFixed(1))
  if (diff === 0) return <span className="text-[10px] text-gray-400 ml-1">—</span>
  if (diff > 0) return <span className="text-[10px] text-emerald-600 font-semibold ml-1">▲{diff > 0 ? '+' : ''}{diff}</span>
  return <span className="text-[10px] text-red-600 font-semibold ml-1">▼{diff}</span>
}

function HistoryEntry({ entry, prev }) {
  const [expanded, setExpanded] = useState(false)
  const h = entry

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-600'
    if (s >= 60) return 'text-blue-600'
    if (s >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  const getBarColor = (s) => {
    if (s >= 80) return 'bg-emerald-500'
    if (s >= 60) return 'bg-blue-500'
    if (s >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  // Señales del detalle guardado
  const detalle = h.detalle_senales || {}
  const pesos = h.pesos_usados || {}

  const modules = [
    { key: 'financiero', label: 'Financiero', score: h.score_financiero },
    { key: 'comportamiento_pago', label: 'Comp. Pago', score: h.score_comportamiento_pago },
    { key: 'fortaleza_comercial', label: 'Fort. Comercial', score: h.score_fortaleza_comercial },
    { key: 'cumplimiento_legal', label: 'Cumpl. Legal', score: h.score_cumplimiento_legal },
    { key: 'riesgo_mercado', label: 'Riesgo Mercado', score: h.score_riesgo_mercado },
    { key: 'osint', label: 'OSINT', score: h.score_osint },
    { key: 'bcra', label: 'BCRA', score: h.score_bcra },
  ]

  const prevScoreFor = (key) => {
    if (!prev) return undefined
    const map = {
      financiero: 'score_financiero',
      comportamiento_pago: 'score_comportamiento_pago',
      fortaleza_comercial: 'score_fortaleza_comercial',
      cumplimiento_legal: 'score_cumplimiento_legal',
      riesgo_mercado: 'score_riesgo_mercado',
      osint: 'score_osint',
      bcra: 'score_bcra',
    }
    return prev[map[key]]
  }

  // Overall trend
  const totalDiff = prev ? Number((h.score_total - prev.score_total).toFixed(1)) : null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Summary row - clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Date */}
        <div className="text-xs text-gray-500 w-36 flex-shrink-0">
          {new Date(h.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Score + Trend */}
        <div className="flex items-center gap-2 w-28 flex-shrink-0">
          <span className={`text-lg font-bold ${getScoreColor(h.score_total)}`}>{h.score_total}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${RATING_COLORS[h.rating] || ''}`}>{h.rating}</span>
          {totalDiff !== null && totalDiff !== 0 && (
            <span className={`text-xs font-bold ${totalDiff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalDiff > 0 ? '▲' : '▼'}{Math.abs(totalDiff)}
            </span>
          )}
        </div>

        {/* Module mini bars (desktop only) */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {modules.map(m => (
            <div key={m.key} className="flex-1" title={`${m.label}: ${m.score}`}>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${getBarColor(m.score)}`} style={{ width: `${m.score}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* User */}
        <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0 hidden sm:block">{h.calculado_por || '-'}</span>

        {/* Expand icon */}
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
          {/* Module scores with trends */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {modules.map(m => {
              const signals = detalle[m.key] || {}
              const weight = pesos[m.key]
              const prevScore = prevScoreFor(m.key)
              return (
                <div key={m.key} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">{m.label}</span>
                    <div className="flex items-center">
                      <span className={`text-sm font-bold ${getScoreColor(m.score)}`}>{m.score}</span>
                      <TrendBadge current={m.score} previous={prevScore} />
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full ${getBarColor(m.score)}`} style={{ width: `${m.score}%` }} />
                  </div>
                  {weight && <p className="text-[10px] text-gray-400">Peso: {Math.round(weight * 100)}%</p>}

                  {/* Signals */}
                  {(signals.positivas?.length > 0 || signals.negativas?.length > 0) && (
                    <div className="mt-2 space-y-1">
                      {signals.positivas?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {signals.positivas.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">{s}</span>
                          ))}
                        </div>
                      )}
                      {signals.negativas?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {signals.negativas.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {signals.nota && (
                    <p className="text-[10px] text-gray-400 mt-1 italic">{signals.nota}</p>
                  )}
                  {m.key === 'osint' && signals.url && (
                    <p className="text-[10px] text-gray-400 mt-1">URL: {signals.url}</p>
                  )}
                  {m.key === 'osint' && signals.google_presence !== undefined && (
                    <div className="mt-2 space-y-0.5 text-[10px] text-gray-500">
                      <p>Google: {signals.google_presence}/100 · LinkedIn: {signals.linkedin_score}/100</p>
                      <p>Blacklist: {signals.blacklist_score}/100 {signals.en_lista_negra ? '⚠ Alerta' : '✓'}</p>
                      {signals.noticias_encontradas > 0 && <p>Noticias: {signals.noticias_encontradas}</p>}
                    </div>
                  )}
                  {m.key === 'osint' && (signals.linkedin_perfil_url || signals.google_snippets?.length > 0 || signals.noticias?.length > 0 || signals.blacklist_coincidencias?.length > 0) && (
                    <div className="mt-2 space-y-1 text-[10px] text-gray-500 border-t border-gray-100 pt-2">
                      {signals.url && <p className="break-all">Sitio: {signals.url}</p>}
                      {signals.linkedin_perfil_url && (
                        <p className="break-all">
                          LinkedIn:{' '}
                          <a href={signals.linkedin_perfil_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {signals.linkedin_perfil_url}
                          </a>
                        </p>
                      )}
                      {signals.linkedin_tiene_perfil === false && <p>LinkedIn: sin perfil corporativo confirmado</p>}
                      {signals.linkedin_resultados?.slice(0, 2).map((r, idx) => (
                        <p key={idx} className="break-all">
                          LinkedIn: <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.title || r.url}</a>
                        </p>
                      ))}
                      {signals.linkedin_score_desglose?.slice(0, 2).map((item, idx) => (
                        <p key={`score-${idx}`}>LinkedIn score: {item}</p>
                      ))}
                      {signals.google_snippets?.slice(0, 2).map((snippet, idx) => (
                        <p key={idx}>Google: {snippet}</p>
                      ))}
                      {signals.noticias?.slice(0, 2).map((n, idx) => (
                        <p key={idx}>
                          Noticia: {n.titulo}
                          {n.link && (
                            <a href={n.link} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 hover:underline">(ver)</a>
                          )}
                        </p>
                      ))}
                      {signals.blacklist_coincidencias?.slice(0, 2).map((c, idx) => (
                        <p key={idx} className="text-red-600">Sanciones: {c.fuente}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Comparison with previous */}
          {prev && (
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Comparación vs evaluación anterior ({new Date(prev.created_at).toLocaleDateString('es-AR')})
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-bold">{prev.score_total}</span>
                  <span className="text-gray-400">→</span>
                  <span className={`font-bold ${getScoreColor(h.score_total)}`}>{h.score_total}</span>
                  <TrendBadge current={h.score_total} previous={prev.score_total} />
                </div>
                {modules.map(m => {
                  const prevVal = prevScoreFor(m.key)
                  if (prevVal === undefined) return null
                  const diff = Number((m.score - prevVal).toFixed(1))
                  if (diff === 0) return null
                  return (
                    <div key={m.key} className="flex items-center gap-1">
                      <span className="text-gray-500">{m.label}:</span>
                      <span className={`font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


const CALC_STEPS = [
  { time: 0, msgKey: 'scoring.steps.starting' },
  { time: 3, msgKey: 'scoring.steps.financial' },
  { time: 8, msgKey: 'scoring.steps.payment' },
  { time: 15, msgKey: 'scoring.steps.commercial' },
  { time: 22, msgKey: 'scoring.steps.legal' },
  { time: 30, msgKey: 'scoring.steps.market' },
  { time: 38, msgKey: 'scoring.steps.bcra' },
  { time: 45, msgKey: 'scoring.steps.osint' },
  { time: 55, msgKey: 'scoring.steps.consolidating' },
]

function ScoringView({ empresaId, cuit, onBack }) {
  const { t } = useTranslation()
  const [scoring, setScoring] = useState(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calcElapsed, setCalcElapsed] = useState(0)
  const [empresa, setEmpresa] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [incluirOsint, setIncluirOsint] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showDetailModules, setShowDetailModules] = useState(false)
  const printRef = useRef(null)
  const calcStartRef = useRef(null)

  // Timer para actualizar tiempo transcurrido durante cálculo
  useEffect(() => {
    if (!calculating) {
      setCalcElapsed(0)
      return
    }
    calcStartRef.current = Date.now()
    const interval = setInterval(() => {
      setCalcElapsed(Math.floor((Date.now() - calcStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [calculating])

  const exportPDF = () => {
    if (!printRef.current) return
    const sd = scoring?.data || scoring
    const printContent = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Scoring - ${empresa?.razon_social || cuit}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { color: #2563eb; margin: 0; }
        .header p { margin: 4px 0; color: #666; }
        .score-main { text-align: center; font-size: 48px; font-weight: bold; margin: 20px 0; }
        .rating { display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: bold; }
        .modules { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .module-card { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; }
        .module-name { font-weight: bold; font-size: 13px; }
        .module-score { font-size: 20px; font-weight: bold; float: right; }
        .bar { height: 6px; background: #e5e7eb; border-radius: 3px; margin-top: 8px; }
        .bar-fill { height: 6px; border-radius: 3px; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        svg { max-width: 100%; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <div class="header">
        <h1>Informe de Scoring Crediticio</h1>
        <p><strong>${empresa?.razon_social || sd?.empresa?.razon_social || ''}</strong></p>
        <p>${empresa?.tipo_identificacion || 'CUIT'}: ${cuit}</p>
        <p>Fecha: ${new Date().toLocaleString('es-AR')}</p>
      </div>
      ${printContent}
      <div class="footer">Generado por Infogroup — ${new Date().toLocaleDateString('es-AR')}</div>
      </body></html>`)
    win.document.close()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  useEffect(() => {
    if (cuit) {
      loadLatestScoring()
      loadEmpresaInfo()
    }
  }, [cuit])

  const loadEmpresaInfo = async () => {
    try {
      if (empresaId) {
        const res = await axios.get(`/api/empresas/${empresaId}`)
        if (res.data.success) {
          setEmpresa(res.data.empresa)
        }
      }
    } catch (err) { /* ignore */ }
  }

  const loadLatestScoring = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/scoring/${cuit}`)
      if (res.data.success && res.data.data) {
        setScoring(res.data.data)
      }
    } catch (err) {
      // No scoring yet, that's ok
    } finally {
      setLoading(false)
    }
  }

  const calculateScoring = async () => {
    setCalculating(true)
    try {
      const res = await axios.post(`/api/scoring/${cuit}/calculate`, {
        incluir_osint: incluirOsint,
        website_url: websiteUrl,
      })
      if (res.data.success) {
        setScoring(res.data.data)
        toast.success(`Score calculado: ${res.data.data.score_total} (${res.data.data.rating})`)
      } else {
        toast.error(res.data.error || 'Error calculando score')
      }
    } catch (err) {
      if (err.response?.status !== 403) toast.error(err.response?.data?.error || 'Error calculando score')
    } finally {
      setCalculating(false)
    }
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await axios.get(`/api/scoring/${cuit}/history`)
      if (res.data.success) {
        setHistory(res.data.data)
      }
    } catch (err) { /* ignore */ }
    setLoadingHistory(false)
  }

  const toggleHistory = () => {
    if (!showHistory && history.length === 0) {
      loadHistory()
    }
    setShowHistory(!showHistory)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Get scores data from either saved result or fresh calculation
  const scoreData = scoring?.data || scoring
  const hasScoring = scoreData && scoreData.score_total !== undefined

  // Generar insights ejecutivos para el cliente
  const insights = (() => {
    if (!scoreData) return []
    const msgs = []
    const s = scoreData.score_total
    if (s === undefined) return []

    if (s >= 70) msgs.push({ icon: '✅', text: 'Perfil de riesgo estable' })
    else if (s >= 40) msgs.push({ icon: '⚠️', text: 'Perfil de riesgo moderado — evaluar con precaución' })
    else msgs.push({ icon: '🔴', text: 'Perfil de riesgo elevado — se recomienda análisis profundo' })

    const negFin = scoreData.detalle?.financiero?.negativas?.length || 0
    const negPago = scoreData.detalle?.comportamiento_pago?.negativas?.length || 0
    if (negFin === 0 && negPago === 0) msgs.push({ icon: '✅', text: 'Sin antecedentes negativos relevantes detectados' })
    else msgs.push({ icon: '⚠️', text: `${negFin + negPago} señal(es) negativa(s) en análisis financiero` })

    const mercado = scoreData.scores?.riesgo_mercado
    if (mercado >= 70) msgs.push({ icon: '📊', text: 'Sector de actividad con riesgo bajo' })
    else if (mercado >= 40) msgs.push({ icon: '📊', text: 'Actividad con riesgo moderado' })
    else if (mercado !== undefined) msgs.push({ icon: '📊', text: 'Sector de actividad con riesgo alto' })

    if (scoreData.detalle?.osint?.en_lista_negra) msgs.push({ icon: '🚨', text: 'Detectada en listas de sanciones internacionales' })
    else if (scoreData.scores?.osint !== undefined) msgs.push({ icon: '🛡️', text: 'Sin coincidencias en listas de sanciones' })

    if (scoreData.detalle?.fortaleza_comercial?.antiguedad) {
      msgs.push({ icon: '🏢', text: `Antigüedad: ${scoreData.detalle.fortaleza_comercial.antiguedad}` })
    }

    return msgs.slice(0, 5)
  })()

  // Mensaje actual según tiempo transcurrido
  const currentCalcStep = CALC_STEPS.filter(s => s.time <= calcElapsed).pop() || CALC_STEPS[0]

  return (
    <div className="space-y-6">
      {/* Modal de cálculo en progreso - bloquea toda interacción */}
      {calculating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 animate-spin" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" strokeWidth="8" 
                    strokeDasharray="251" strokeDashoffset="188" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">{calcElapsed}s</span>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('scoring.modal.title')}</h3>
            <p className="text-gray-600 mb-4 min-h-[24px] transition-all duration-300">
              {t(currentCalcStep.msgKey)}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (calcElapsed / 60) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {incluirOsint ? t('scoring.modal.withOsint') : t('scoring.modal.withoutOsint')}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {t('scoring.modal.doNotClose')}
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
            <h2 className="text-xl font-bold text-gray-900">{t('scoring.title')}</h2>
            {(empresa?.razon_social || scoreData?.empresa?.razon_social) && (
              <p className="text-base font-semibold text-gray-700">
                {empresa?.razon_social || scoreData?.empresa?.razon_social}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {empresa?.tipo_identificacion || 'CUIT'}: {cuit}
            </p>
          </div>
        </div>
      </div>

      {/* Calculate section */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('scoring.calculateNewScore')}</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirOsint}
                onChange={(e) => setIncluirOsint(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              {t('scoring.includeOsint')}
            </label>
          </div>
          {incluirOsint && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">{t('scoring.websiteUrlOptional')}</label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="www.empresa.com"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
          <button
            onClick={calculateScoring}
            disabled={calculating}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {calculating ? t('scoring.calculating') : t('scoring.calculate')}
          </button>
          <button
            onClick={toggleHistory}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
          >
            <Clock className="h-4 w-4" />
            {t('scoring.history')}
          </button>
          {hasScoring && (
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
            >
              <FileDown className="h-4 w-4" />
              {t('scoring.exportPdf')}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {hasScoring && (
        <div ref={printRef} className="space-y-6">
          {/* HERO - Score Principal */}
          <div className="bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="relative flex-shrink-0">
                  <ScoreGauge score={scoreData.score_total} rating={scoreData.rating} />
                </div>
                <div className="flex-1 text-center lg:text-left space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Score de riesgo comercial</p>
                    <div className="flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                        scoreData.score_total >= 70 ? 'bg-green-100 text-green-800 border border-green-200' :
                        scoreData.score_total >= 40 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {scoreData.score_total >= 70 ? '● Riesgo Bajo' :
                          scoreData.score_total >= 40 ? '● Riesgo Medio' :
                         '● Riesgo Alto'}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${RATING_COLORS[scoreData.rating] || ''}`}>
                        Rating {scoreData.rating}
                      </span>
                    </div>
                  </div>

                  {/* Resumen Ejecutivo */}
                  {insights.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resumen ejecutivo</p>
                      {insights.map((ins, i) => (
                        <p key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="flex-shrink-0">{ins.icon}</span>
                          <span>{ins.text}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    {scoreData.created_at ? `Actualizado: ${new Date(scoreData.created_at).toLocaleString('es-AR')}` : 'Calculado ahora'}
                    {scoreData.calculado_por && ` · por ${scoreData.calculado_por}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monto sugerido de crédito */}
          {/* Monto sugerido de crédito */}
          {scoreData.credito && scoreData.credito.monto_sugerido && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Monto Sugerido de Crédito
                </h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  scoreData.credito.confianza === 'media' ? 'bg-blue-100 text-blue-700' :
                  scoreData.credito.confianza === 'baja' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Confianza: {scoreData.credito.confianza || 'N/A'}
                </span>
              </div>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-emerald-700">
                  {formatCurrencyAmount(scoreData.credito.monto_sugerido, scoreData.credito.moneda)}
                </p>
                {scoreData.credito.capital_base && (
                  <p className="text-xs text-gray-400 mt-1">
                    Capital base: {formatCurrencyAmount(scoreData.credito.capital_base, scoreData.credito.moneda)}
                  </p>
                )}
              </div>
              {scoreData.credito.factores && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {Object.entries(scoreData.credito.factores).map(([key, f]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] font-medium text-gray-500 uppercase">{key}</p>
                      <p className={`text-sm font-bold ${f.factor >= 1 ? 'text-green-600' : f.factor >= 0.8 ? 'text-amber-600' : 'text-red-600'}`}>
                        ×{f.factor?.toFixed(2)}
                      </p>
                      {f.descripcion && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{f.descripcion}</p>}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-3 text-center italic">
                Estimación orientativa basada en datos disponibles. No constituye una recomendación crediticia vinculante.
              </p>
            </div>
          )}

          {/* Sin capital — aviso */}
          {scoreData.credito && !scoreData.credito.monto_sugerido && scoreData.credito.nota && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                {scoreData.credito.nota}
              </p>
            </div>
          )}

          {/* Blacklist alert */}
          {scoreData.detalle?.osint?.en_lista_negra && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-800">⚠ Alerta: Empresa detectada en listas de sanciones</p>
                <p className="text-sm text-red-700">Se encontraron coincidencias en verificaciones de listas negras/sanciones internacionales. Revisar detalle en módulo OSINT.</p>
              </div>
            </div>
          )}

          {/* Breakdown del Score - Barras horizontales */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
              📊 Detalle del Score
            </h3>
            <div className="space-y-4">
              {Object.entries(scoreData.scores || {}).map(([key, score]) => {
                const info = MODULE_INFO[key] || { label: key, icon: BarChart3, color: 'gray' }
                const Icon = info.icon
                const weight = scoreData.pesos?.[key] || scoreData.pesos_usados?.[key] || 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 text-${info.color}-500`} />
                        <span className="text-sm font-medium text-gray-700">{info.label}</span>
                        <span className="text-xs text-gray-400">({Math.round(weight * 100)}%)</span>
                      </div>
                      <span className={`text-sm font-bold ${
                        score >= 70 ? 'text-green-600' :
                        score >= 40 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>{score}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all duration-700 ${
                        score >= 70 ? 'bg-green-500' :
                        score >= 40 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Module cards grid — expandible */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowDetailModules(!showDetailModules)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🔍 Análisis detallado por módulo
              </h3>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDetailModules ? 'rotate-180' : ''}`} />
            </button>
            {showDetailModules && (
              <div className="px-5 pb-5 space-y-5">
                {/* Radar Chart */}
                {scoreData.scores && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">Perfil de Riesgo</h4>
                    <RadarChart scores={scoreData.scores} />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(scoreData.scores || {}).map(([key, score]) => (
                    <ModuleCard
                      key={key}
                      moduleKey={key}
                      score={score}
                      signals={scoreData.detalle?.[key] || scoreData.detalle_senales?.[key] || {}}
                      weight={scoreData.pesos?.[key] || scoreData.pesos_usados?.[key] || 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Insights — Interpretación */}
          {scoreData.drivers && scoreData.drivers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                🧠 Interpretación del Score
              </h3>
              <div className="space-y-3">
                {scoreData.drivers.map((driver, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    driver.impacto === 'positivo' ? 'bg-green-50 border-green-200' :
                    driver.impacto === 'negativo' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      driver.impacto === 'positivo' ? 'bg-green-100' :
                      driver.impacto === 'negativo' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {driver.impacto === 'positivo' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : driver.impacto === 'negativo' ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${
                        driver.impacto === 'positivo' ? 'text-green-800' :
                        driver.impacto === 'negativo' ? 'text-red-800' :
                        'text-gray-700'
                      }`}>{driver.factor}</p>
                      <p className="text-xs text-gray-500">{driver.texto}</p>
                    </div>
                    <div className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                      driver.score >= 70 ? 'bg-green-100 text-green-700' :
                      driver.score >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(driver.score)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 text-right">
                Los drivers explican qué factores impactan positiva o negativamente el score final
              </p>
            </div>
          )}

          {/* OSINT Detail Panel */}
          {scoreData.detalle?.osint && scoreData.detalle.osint.google_presence !== undefined && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" /> Detalle OSINT Expandido
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="font-semibold text-blue-800 mb-1">🔍 Google</p>
                  <p className="text-blue-700">Presencia: {scoreData.detalle.osint.google_presence}/100</p>
                  {scoreData.detalle.osint.google_resultados_estimados > 0 && (
                    <p className="text-blue-700">Resultados: {scoreData.detalle.osint.google_resultados_estimados.toLocaleString('es-AR')}</p>
                  )}
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="font-semibold text-indigo-800 mb-1">💼 LinkedIn</p>
                  <p className="text-indigo-700">Score: {scoreData.detalle.osint.linkedin_score}/100</p>
                  {scoreData.detalle.osint.linkedin_perfil_url && (
                    <a href={scoreData.detalle.osint.linkedin_perfil_url} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline break-all">
                      {scoreData.detalle.osint.linkedin_perfil_url}
                    </a>
                  )}
                  {!scoreData.detalle.osint.linkedin_perfil_url && scoreData.detalle.osint.linkedin_tiene_perfil === false && (
                    <p className="text-indigo-700">Sin perfil corporativo confirmado</p>
                  )}
                  {scoreData.detalle.osint.linkedin_empleados > 0 && (
                    <p className="text-indigo-700">Perfiles relacionados: {scoreData.detalle.osint.linkedin_empleados}</p>
                  )}
                </div>
                <div className={`rounded-lg p-3 ${scoreData.detalle.osint.en_lista_negra ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`font-semibold mb-1 ${scoreData.detalle.osint.en_lista_negra ? 'text-red-800' : 'text-green-800'}`}>
                    🛡️ Sanciones
                  </p>
                  <p className={scoreData.detalle.osint.en_lista_negra ? 'text-red-700' : 'text-green-700'}>
                    {scoreData.detalle.osint.en_lista_negra ? '⚠ Coincidencias encontradas' : '✓ Sin coincidencias'}
                    {' '}({scoreData.detalle.osint.blacklist_score}/100)
                  </p>
                </div>
              </div>

              {(scoreData.detalle.osint.url || scoreData.detalle.osint.noticias?.length > 0 || scoreData.detalle.osint.google_snippets?.length > 0 || scoreData.detalle.osint.blacklist_coincidencias?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-gray-700">Fuentes y URLs</p>
                    {scoreData.detalle.osint.url && (
                      <p className="text-gray-600 break-all">
                        Sitio:{' '}
                        <a href={scoreData.detalle.osint.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {scoreData.detalle.osint.url}
                        </a>
                      </p>
                    )}
                    {scoreData.detalle.osint.linkedin_perfil_url && (
                      <p className="text-gray-600 break-all">
                        LinkedIn:{' '}
                        <a href={scoreData.detalle.osint.linkedin_perfil_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {scoreData.detalle.osint.linkedin_perfil_url}
                        </a>
                      </p>
                    )}
                    {scoreData.detalle.osint.blacklist_fuentes?.length > 0 && (
                      <div>
                        <p className="text-gray-600">Fuentes sanciones:</p>
                        <ul className="mt-1 space-y-1">
                          {scoreData.detalle.osint.blacklist_fuentes.map((f, idx) => (
                            <li key={idx} className="text-gray-500">• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-gray-700">Resultados detectados</p>
                    {scoreData.detalle.osint.linkedin_resultados?.length > 0 && (
                      <div>
                        <p className="text-gray-600">LinkedIn:</p>
                        <ul className="mt-1 space-y-1">
                          {scoreData.detalle.osint.linkedin_resultados.slice(0, 3).map((r, idx) => (
                            <li key={idx} className="text-gray-500">
                              • <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.title || r.url}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scoreData.detalle.osint.linkedin_score_desglose?.length > 0 && (
                      <div>
                        <p className="text-gray-600">Cálculo LinkedIn:</p>
                        <ul className="mt-1 space-y-1">
                          {scoreData.detalle.osint.linkedin_score_desglose.map((item, idx) => (
                            <li key={idx} className="text-gray-500">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scoreData.detalle.osint.google_snippets?.length > 0 && (
                      <div>
                        <p className="text-gray-600">Google:</p>
                        <ul className="mt-1 space-y-1">
                          {scoreData.detalle.osint.google_snippets.slice(0, 3).map((snippet, idx) => (
                            <li key={idx} className="text-gray-500">• {snippet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scoreData.detalle.osint.noticias?.length > 0 && (
                      <div>
                        <p className="text-gray-600">Noticias:</p>
                        <ul className="mt-1 space-y-1">
                          {scoreData.detalle.osint.noticias.slice(0, 3).map((n, idx) => (
                            <li key={idx} className="text-gray-500">
                              • {n.titulo}
                              {n.link && (
                                <a href={n.link} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 hover:underline">(ver)</a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scoreData.detalle.osint.blacklist_coincidencias?.length > 0 && (
                      <div>
                        <p className="text-red-700">Coincidencias sanciones:</p>
                        <ul className="mt-1 space-y-1">
                          {scoreData.detalle.osint.blacklist_coincidencias.slice(0, 3).map((c, idx) => (
                            <li key={idx} className="text-red-600">• {c.fuente}: {c.detalle}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!hasScoring && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">Sin scoring calculado</h3>
          <p className="text-sm text-gray-400 mt-1">
            Presiona "Calcular Score" para generar el primer análisis de esta empresa
          </p>
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Historial de Scores
          </h3>
          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin historial</p>
          ) : (
            <div className="space-y-4">
              {/* Mini evolution chart */}
              {history.length >= 2 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Evolución del Score</p>
                  <HistoryMiniChart history={history} />
                </div>
              )}

              {/* History entries */}
              <div className="space-y-2">
                {history.map((h, idx) => {
                  const prev = history[idx + 1] // anterior (lista viene DESC por fecha)
                  return (
                    <HistoryEntry key={h.id} entry={h} prev={prev} />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ScoringView

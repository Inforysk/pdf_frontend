import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Loader2,
  TrendingDown, TrendingUp, Minus, RefreshCw, ChevronDown, ChevronUp,
  Activity, Ban, Landmark, Building2, Phone, MapPin, FileWarning, Briefcase
} from 'lucide-react'

// Las etiquetas se traducen dinámicamente en el componente
const MODULO_CONFIG = {
  negativo: { key: 'negative', icon: Ban, color: 'red' },
  tributario: { key: 'tax', icon: Landmark, color: 'amber' },
  operativo: { key: 'operative', icon: Building2, color: 'blue' },
  industria: { key: 'industry', icon: Briefcase, color: 'indigo' },
}

const SEVERIDAD_CONFIG = {
  alta: { key: 'high', bg: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', icon: XCircle },
  media: { key: 'medium', bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: AlertTriangle },
  baja: { key: 'low', bg: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: FileWarning },
  ok: { key: 'ok', bg: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', icon: CheckCircle2 },
}

function getScoreColor(score) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBg(score) {
  if (score >= 70) return 'bg-green-50 border-green-200'
  if (score >= 40) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

export default function RealTimeCheck({ cuit, onComplete }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [ran, setRan] = useState(false)

  const runCheck = useCallback(async () => {
    if (!cuit) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`/api/chequeo-realtime/${encodeURIComponent(cuit)}`)
      if (res.data.success) {
        setData(res.data)
        onComplete?.(res.data)
      } else {
        setError(res.data.error || 'Error en chequeo')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setRan(true)
    }
  }, [cuit, onComplete])

  useEffect(() => {
    if (cuit && !ran) {
      const timer = setTimeout(runCheck, 800)
      return () => clearTimeout(timer)
    }
  }, [cuit, ran, runCheck])

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-blue-200 p-4 mt-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{t('realTimeCheck.validating')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('realTimeCheck.validatingDesc')}</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
        {/* Skeleton */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/60 rounded-lg animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-4 mt-4 flex items-center gap-3">
        <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-700 flex-1">{error}</p>
        <button onClick={runCheck} className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> {t('realTimeCheck.retry')}
        </button>
      </div>
    )
  }

  if (!data) return null

  if (data.sin_datos) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600">{t('realTimeCheck.noDataTitle')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('realTimeCheck.noDataDesc')}</p>
        </div>
      </div>
    )
  }

  const { eventos, resumen, semaforo, score, fuentes } = data
  const eventosRiesgo = eventos.filter(e => e.severidad !== 'ok')
  const eventosOk = eventos.filter(e => e.severidad === 'ok')

  const semaforoConfig = {
    verde: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle2, label: t('realTimeCheck.noNegativeFindings'), iconColor: 'text-green-500' },
    amarillo: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: `${resumen.total} ${t('realTimeCheck.events')}`, iconColor: 'text-amber-500' },
    rojo: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: XCircle, label: `${resumen.total} ${t('realTimeCheck.riskEvents')}`, iconColor: 'text-red-500' },
  }[semaforo]

  const SemaforoIcon = semaforoConfig.icon

  return (
    <div className={`rounded-xl border ${semaforoConfig.bg} mt-4 overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${semaforo === 'verde' ? 'bg-green-100' : semaforo === 'amarillo' ? 'bg-amber-100' : 'bg-red-100'}`}>
            <SemaforoIcon className={`h-5 w-5 ${semaforoConfig.iconColor}`} />
          </div>
          <div className="text-left min-w-0">
            <p className={`text-sm font-bold ${semaforoConfig.text}`}>{t('realTimeCheck.title')}</p>
            <p className="text-xs text-gray-500">{semaforoConfig.label}</p>
          </div>
        </div>

        {/* Score mini */}
        {score?.nuevo != null && (
          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded-lg border text-sm font-bold ${getScoreBg(score.nuevo)} ${getScoreColor(score.nuevo)}`}>
              {Math.round(score.nuevo)}
            </div>
            {score.variacion != null && score.variacion !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${score.variacion > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {score.variacion > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {score.variacion > 0 ? '+' : ''}{score.variacion}
              </span>
            )}
          </div>
        )}

        {/* Badges mini */}
        <div className="hidden sm:flex items-center gap-1.5">
          {resumen.alto > 0 && <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold border border-red-200">{resumen.alto} {t('realTimeCheck.severity.high').toLowerCase()}</span>}
          {resumen.medio > 0 && <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200">{resumen.medio} {t('realTimeCheck.severity.medium').toLowerCase()}</span>}
          {resumen.bajo > 0 && <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold border border-blue-200">{resumen.bajo} {t('realTimeCheck.severity.low').toLowerCase()}</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setRan(false); runCheck(); }}
            className="p-1.5 rounded-lg hover:bg-black/10 text-gray-500 transition-colors"
            title={t('realTimeCheck.refreshCheck')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Score comparison */}
          {score?.nuevo != null && (
            <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-4">
              <Activity className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                {score.anterior != null && (
                  <>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('realTimeCheck.previous')}</p>
                      <p className={`text-lg font-bold ${getScoreColor(score.anterior)}`}>{Math.round(score.anterior)}</p>
                      <p className="text-[10px] text-gray-500">{score.rating_anterior}</p>
                    </div>
                    <div className="text-gray-300">→</div>
                  </>
                )}
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('realTimeCheck.current')}</p>
                  <p className={`text-lg font-bold ${getScoreColor(score.nuevo)}`}>{Math.round(score.nuevo)}</p>
                  <p className="text-[10px] text-gray-500">{score.rating_nuevo}</p>
                </div>
                {score.variacion != null && score.variacion !== 0 && (
                  <div className={`ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    score.variacion > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {score.variacion > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {score.variacion > 0 ? '+' : ''}{score.variacion} pts
                  </div>
                )}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-gray-400">{t('realTimeCheck.sources')}: {fuentes?.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Eventos de riesgo */}
          {eventosRiesgo.length > 0 && (
            <div className="space-y-2">
              {eventosRiesgo.map((ev, i) => {
                const sev = SEVERIDAD_CONFIG[ev.severidad] || SEVERIDAD_CONFIG.baja
                const mod = MODULO_CONFIG[ev.modulo]
                const SevIcon = sev.icon
                return (
                  <div key={i} className={`bg-white rounded-lg border p-3 flex items-start gap-3 ${
                    ev.severidad === 'alta' ? 'border-red-200' : ev.severidad === 'media' ? 'border-amber-200' : 'border-gray-200'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      ev.severidad === 'alta' ? 'bg-red-100' : ev.severidad === 'media' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      <SevIcon className={`h-4 w-4 ${
                        ev.severidad === 'alta' ? 'text-red-600' : ev.severidad === 'media' ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${sev.bg}`}>
                          {t(`realTimeCheck.severity.${sev.key}`)}
                        </span>
                        {mod && <span className="text-[10px] text-gray-400 font-medium">{t(`realTimeCheck.module.${mod.key}`)}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{ev.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.descripcion}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t('realTimeCheck.source')}: {ev.fuente}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sin hallazgos negativos + items OK */}
          {eventosRiesgo.length === 0 && (
            <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-700">{t('realTimeCheck.noNegativeFindings')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('realTimeCheck.dataVerified')}</p>
            </div>
          )}

          {/* Items OK en una fila compacta */}
          {eventosOk.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {eventosOk.map((ev, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-green-200 text-xs font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {ev.titulo}
                </span>
              ))}
            </div>
          )}

          {/* Datos verificados timestamp */}
          <p className="text-[10px] text-gray-400 text-right">
            {t('realTimeCheck.dynamicCheck')}
          </p>
        </div>
      )}
    </div>
  )
}

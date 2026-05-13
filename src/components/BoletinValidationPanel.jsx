import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Newspaper,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  History,
  Sparkles,
} from 'lucide-react'

// Pasos de Boletín para el modal de progreso
const BOLETIN_STEPS = [
  { time: 0, msg: 'Iniciando búsqueda...' },
  { time: 3, msg: 'Consultando Boletín Oficial...' },
  { time: 8, msg: 'Analizando publicaciones...' },
  { time: 15, msg: 'Verificando historial...' },
  { time: 22, msg: 'Procesando resultados...' },
]

const safeText = (value) => (value || '').toString().trim()

const normalizeText = (value) => safeText(value).replace(/\s+/g, ' ')

const parseStructuredText = (text) => {
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

const buildDiff = (newText, oldText) => {
  const current = normalizeText(newText)
  const previous = normalizeText(oldText)
  if (!current || !previous || current === previous) {
    return { hasChanges: false, fieldChanges: [] }
  }

  const a = parseStructuredText(current)
  const b = parseStructuredText(previous)
  if (a && b) {
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]))
    const fieldChanges = keys
      .filter(k => normalizeText(a[k]) !== normalizeText(b[k]))
      .map(k => ({ field: k, current: a[k] || '—', previous: b[k] || '—' }))
    return { hasChanges: fieldChanges.length > 0, fieldChanges }
  }

  return {
    hasChanges: true,
    fieldChanges: [{ field: 'texto', current, previous }]
  }
}

const buildCombinedText = (resultados = []) => {
  return resultados
    .map((r, idx) => {
      const header = [
        `Resultado ${idx + 1}`,
        r.titulo ? `Título: ${r.titulo}` : null,
        r.fecha ? `Fecha: ${r.fecha}` : null,
        r.seccion ? `Sección: ${r.seccion}` : null,
        r.tipo ? `Tipo: ${r.tipo}` : null,
        r.numero_boletin ? `Boletín: ${r.numero_boletin}` : null,
        r.url ? `Fuente: ${r.url}` : null,
      ].filter(Boolean)
      const cuerpo = safeText(r.texto_completo)
      return `${header.join('\n')}\n\n${cuerpo}`.trim()
    })
    .filter(Boolean)
    .join('\n\n------------------------------\n\n')
}

async function copyToClipboard(text, successMsg = 'Texto copiado') {
  const payload = safeText(text)
  if (!payload) {
    toast('No hay texto para copiar', { icon: 'ℹ️' })
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
    } else {
      const ta = document.createElement('textarea')
      ta.value = payload
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    toast.success(successMsg)
  } catch {
    toast.error('No se pudo copiar el texto')
  }
}

export default function BoletinValidationPanel({ cuit, razonSocial, onApplyField }) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialLoading, setHistorialLoading] = useState(false)
  const [historialData, setHistorialData] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  // Timer para modal de progreso
  const [boletinElapsed, setBoletinElapsed] = useState(0)
  const boletinStartRef = useRef(null)

  const cuitClean = (cuit || '').replace(/\D/g, '')

  // Cargar datos existentes al montar el componente
  useEffect(() => {
    const loadExistingData = async () => {
      if (cuitClean.length < 9) {
        setInitialLoading(false)
        return
      }
      
      try {
        const res = await axios.get(`/api/v1/boletin-oficial/${encodeURIComponent(cuitClean)}`)
        if (res.data?.success && res.data.data?.encontrado) {
          setResultado(res.data.data)
        }
      } catch (err) {
        // 404 es normal - no hay datos guardados
        if (err.response?.status !== 404) {
          console.error('Error cargando datos de Boletín:', err)
        }
      } finally {
        setInitialLoading(false)
      }
    }
    
    loadExistingData()
  }, [cuitClean])

  // Timer para actualizar tiempo transcurrido durante búsqueda
  useEffect(() => {
    if (!loading) {
      setBoletinElapsed(0)
      return
    }
    boletinStartRef.current = Date.now()
    const interval = setInterval(() => {
      setBoletinElapsed(Math.floor((Date.now() - boletinStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Obtener paso actual del modal de progreso
  const currentBoletinStep = BOLETIN_STEPS.filter(s => s.time <= boletinElapsed).pop() || BOLETIN_STEPS[0]

  if (cuitClean.length < 9) return null
  
  // Mostrar skeleton mientras carga datos iniciales
  if (initialLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
          <span className="text-sm text-gray-500">Cargando datos de Boletín...</span>
        </div>
      </div>
    )
  }

  const handleValidarBoletin = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/api/v1/boletin-oficial/search', {
        cuit: cuitClean,
        razon_social: safeText(razonSocial) || undefined,
      })

      if (!res.data?.success) {
        toast.error(res.data?.error || 'Error validando Boletín Oficial')
        return
      }

      const data = res.data.data || {}
      setResultado(data)

      // Cargar historial para mostrar evolución y cambios detectados
      setHistorialLoading(true)
      try {
        const hist = await axios.get(`/api/v1/boletin-oficial/historial/${encodeURIComponent(cuitClean)}?limite=100`)
        setHistorialData(hist.data?.success ? (hist.data.data || null) : null)
      } catch {
        setHistorialData(null)
      } finally {
        setHistorialLoading(false)
      }

      if (data.encontrado) {
        const insertados = data?.historial_guardado?.insertados || 0
        if (insertados > 0 || data?.actualizacion_detectada) {
          toast.success('Boletín Oficial actualizado: se detectaron cambios y se guardó historial')
        } else {
          toast.success(`Boletín Oficial: ${data.resultados_totales || 0} publicación(es) encontrada(s)`)
        }
      } else {
        toast('No se encontraron publicaciones para ese CUIT', { icon: 'ℹ️' })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al validar Boletín Oficial')
    } finally {
      setLoading(false)
    }
  }

  const resultados = resultado?.resultados || []
  const hayResultados = !!resultado?.encontrado && resultados.length > 0
  const textoCombinado = hayResultados ? buildCombinedText(resultados) : ''
  const publicaciones = historialData?.publicaciones || []
  const actualizacionDetectada = !!(resultado?.actualizacion_detectada || historialData?.actualizacion_detectada)
  const referenciaAlta = !!(historialData?.referencia_alta || actualizacionDetectada)

  const buildSoloTexto = (resultados = []) => {
    return resultados
      .map((r) => safeText(r.texto_completo))
      .filter(Boolean)
      .join('\n\n')
  }

  const handleApplySinopsis = () => {
    if (!onApplyField || !hayResultados) return
    const textoLimpio = buildSoloTexto(resultados)
    if (!textoLimpio) {
      toast('No hay texto para aplicar', { icon: 'ℹ️' })
      return
    }
    onApplyField('sinopsis', textoLimpio)
    toast.success('Texto de Boletín aplicado a Sinopsis')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Modal de Boletín en progreso - bloquea toda interacción */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 animate-spin" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8" 
                    strokeDasharray="251" strokeDashoffset="188" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">{boletinElapsed}s</span>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Consultando Boletín Oficial</h3>
            <p className="text-gray-600 mb-4 min-h-[24px] transition-all duration-300">
              {currentBoletinStep.msg}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (boletinElapsed / 30) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              Buscando publicaciones oficiales
            </p>
            <p className="text-xs text-gray-400 mt-2">
              No cierre esta ventana
            </p>
          </div>
        </div>
      )}

      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Validación Boletín Oficial</h3>
            <p className="text-xs text-gray-400">Consulta automática por CUIT y razón social</p>
          </div>
          {hayResultados && (
            <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              Validado BO
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {resultado && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={handleValidarBoletin}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando...</>
            ) : resultado ? (
              <><RefreshCw className="h-3.5 w-3.5" /> Re-validar Boletín</>
            ) : (
              <><Search className="h-3.5 w-3.5" /> Validar Boletín</>
            )}
          </button>
        </div>
      </div>

      {resultado && expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {hayResultados ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {resultado.resultados_totales || resultados.length} publicación(es)
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Confianza: {resultado.confiabilidad ?? 0}%
                </span>
                {actualizacionDetectada && (
                  <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Información Actualizada
                  </span>
                )}
                {referenciaAlta && (
                  <span className="px-2 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 font-semibold">
                    Referencia Alta
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(textoCombinado, 'Texto de Boletín copiado')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar texto
                </button>
                <button
                  type="button"
                  onClick={() => setHistorialOpen(!historialOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs hover:bg-amber-50"
                >
                  <History className="h-3.5 w-3.5" /> {historialOpen ? 'Ocultar historial' : 'Ver historial'}
                </button>
                {onApplyField && (
                  <button
                    type="button"
                    onClick={handleApplySinopsis}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-xs hover:bg-indigo-50"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" /> Aplicar a Sinopsis
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {resultados.map((r, idx) => (
                  <div key={`${r.url || r.titulo || 'bo'}-${idx}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{r.titulo || 'Publicación'}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(r.texto_completo, 'Texto de publicación copiado')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-600 hover:bg-white"
                      >
                        <Copy className="h-3 w-3" /> Copiar
                      </button>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                      {r.fecha && <span>📅 {r.fecha}</span>}
                      {r.seccion && <span>🧩 {r.seccion}</span>}
                      {r.tipo && <span>📂 {r.tipo}</span>}
                      {r.numero_boletin && <span># BO {r.numero_boletin}</span>}
                      <span>🎯 {r.confianza ?? 0}%</span>
                    </div>

                    {safeText(r.texto_completo) && (
                      <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {r.texto_completo}
                      </p>
                    )}

                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Ver fuente
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {historialOpen && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-amber-800">Historial de actualizaciones</p>
                    {historialLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />}
                  </div>

                  {!historialLoading && publicaciones.length === 0 && (
                    <p className="text-xs text-amber-800">No hay historial disponible para este CUIT.</p>
                  )}

                  {!historialLoading && publicaciones.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {publicaciones.map((p, idx) => {
                        const prev = publicaciones[idx + 1]
                        const diff = buildDiff(p?.texto_publicacion, prev?.texto_publicacion)
                        return (
                        <div key={p.id} className="rounded border border-amber-200/60 bg-white p-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                            <span className="font-semibold text-gray-800">ID {p.id}</span>
                            {p.fecha_publicacion && <span>📅 {p.fecha_publicacion}</span>}
                            {p.numero_boletin && <span># BO {p.numero_boletin}</span>}
                            {p.first_seen_at && <span>Primera vez: {new Date(p.first_seen_at).toLocaleString('es-AR')}</span>}
                            {p.last_seen_at && <span>Última vez: {new Date(p.last_seen_at).toLocaleString('es-AR')}</span>}
                            <span>Detecciones: {p.veces_detectado || 1}</span>
                            {p.es_nuevo_ingreso && <span className="text-emerald-700 font-semibold">Nuevo ingreso</span>}
                          </div>
                          {safeText(p.texto_publicacion) && (
                            <p className="mt-1 text-[11px] text-gray-700 line-clamp-3">
                              {p.texto_publicacion}
                            </p>
                          )}

                          {prev && diff.hasChanges && (
                            <div className="mt-1 rounded border border-fuchsia-200 bg-fuchsia-50/60 p-2">
                              <p className="text-[11px] font-semibold text-fuchsia-800">
                                Diff vs ID {prev.id}
                              </p>
                              <div className="mt-1 space-y-1">
                                {diff.fieldChanges.slice(0, 3).map((c, i) => (
                                  <p key={`${c.field}-${i}`} className="text-[11px] text-fuchsia-900">
                                    <span className="font-semibold">{c.field}:</span>{' '}
                                    <span className="line-through text-rose-700">{c.previous}</span>{' '}
                                    <span>→</span>{' '}
                                    <span className="font-semibold text-emerald-700">{c.current}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">No se encontraron resultados en Boletín Oficial</p>
                <p className="text-xs mt-0.5">Prueba re-validar o completar mejor la razón social para mejorar el matching.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

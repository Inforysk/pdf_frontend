import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Globe, Shield, Search, Newspaper, Linkedin, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const ScoreBadge = ({ score, label, icon: Icon }) => {
  const color = score >= 70 ? 'text-green-700 bg-green-50 border-green-200'
    : score >= 40 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-700 bg-red-50 border-red-200'
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color}`}>
      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] uppercase opacity-70">{label}</p>
        <p className="text-sm font-bold">{score}/100</p>
      </div>
    </div>
  )
}

export default function OsintPanel({ cuit, razonSocial, email }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [source, setSource] = useState(null)

  const clean = (cuit || '').replace(/\D/g, '')

  // Auto-cargar OSINT del cache al montar
  useEffect(() => {
    let ignore = false
    const loadCached = async () => {
      if (clean.length < 9) return
      try {
        const res = await axios.post(`/api/osint/${cuit}`, {
          razon_social: razonSocial || '',
          email: email || null,
        })
        if (!ignore && res.data.success && res.data.source === 'cache') {
          setData(res.data.osint)
          setSource('cache')
          setExpanded(false)
        }
      } catch {}
    }
    loadCached()
    return () => { ignore = true }
  }, [cuit])

  if (clean.length < 9) return null

  const handleOsint = async (force = false) => {
    if (!razonSocial?.trim()) {
      toast.error('Se necesita razón social para ejecutar OSINT')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(`/api/osint/${cuit}`, {
        razon_social: razonSocial,
        email: email || null,
        force,
      })
      if (res.data.success) {
        setData(res.data.osint)
        setSource(res.data.source)
        setExpanded(true)
        if (res.data.source === 'cache') {
          toast.success('Datos OSINT cargados (cache)')
        } else {
          toast.success('Análisis OSINT completado')
        }
      } else {
        toast.error(res.data.error || 'Error OSINT')
      }
    } catch (err) {
      if (err.response?.status !== 403) toast.error(err.response?.data?.error || 'Error al ejecutar OSINT')
    } finally {
      setLoading(false)
    }
  }

  const osintValidado = data && data.disponible

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header — mismo estilo que ValidationPanel */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Análisis OSINT</h3>
            <p className="text-xs text-gray-400">Presencia web, noticias, listas negras</p>
          </div>
          {osintValidado && (
            <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" />
              Validado OSINT
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => handleOsint(!!data)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando...</>
            ) : data ? (
              <><RefreshCw className="h-3.5 w-3.5" /> Re-validar OSINT</>
            ) : (
              <><Search className="h-3.5 w-3.5" /> Ejecutar OSINT</>
            )}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {data && data.disponible && expanded && (
        <div className="border-t">
          {/* Scores resumidos */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
              <ScoreBadge score={data.web_presence_score} label="Presencia Web" icon={Globe} />
              <ScoreBadge score={data.domain_age_score} label="Dominio" icon={Globe} />
              <ScoreBadge score={data.news_sentiment_score} label="Noticias" icon={Newspaper} />
              <ScoreBadge score={data.google_presence_score} label="Google" icon={Search} />
              <ScoreBadge score={data.linkedin_score} label="LinkedIn" icon={Linkedin} />
              <ScoreBadge score={data.blacklist_score} label="Listas Negras" icon={Shield} />
            </div>
          </div>

          {/* Alertas importantes */}
          <div className="px-3 sm:px-4 md:px-6 pb-2 sm:pb-3 space-y-2">
            {data.en_lista_negra && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Empresa encontrada en listas negras / sanciones</span>
              </div>
            )}
            {data.negative_media_mentions > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{data.negative_media_mentions} mención(es) negativa(s) en medios</span>
              </div>
            )}
            {data.website_online && data.url_analizada && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Sitio web activo: </span>
                <a href={data.url_analizada} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  {data.url_analizada} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {data.ssl_valid === false && data.url_analizada && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Certificado SSL inválido o ausente</span>
              </div>
            )}
          </div>

          {/* Detalles expandidos */}
          <div className="border-t px-4 sm:px-6 py-4 space-y-4 text-sm bg-gray-50">
              {/* Dominio */}
              {data.domain_details && (
                <DetailSection title="Dominio" icon={Globe}>
                  <DetailRow label="Online" value={data.website_online ? 'Sí' : 'No'} />
                  <DetailRow label="SSL válido" value={data.ssl_valid ? 'Sí' : 'No'} />
                  {data.domain_details.ssl_issuer && <DetailRow label="Emisor SSL" value={data.domain_details.ssl_issuer} />}
                  {data.domain_details.ssl_expiry_days != null && <DetailRow label="SSL expira en" value={`${data.domain_details.ssl_expiry_days} días`} />}
                  {data.domain_age_years != null && <DetailRow label="Antigüedad" value={`${data.domain_age_years} años`} />}
                  {data.domain_details.domain_creation_date && <DetailRow label="Fecha creación" value={data.domain_details.domain_creation_date} />}
                  {data.domain_details.registrar && <DetailRow label="Registrar" value={data.domain_details.registrar} />}
                  {data.domain_details.response_time_ms != null && <DetailRow label="Tiempo respuesta" value={`${data.domain_details.response_time_ms} ms`} />}
                  <DetailRow label="Score" value={`${data.domain_age_score}/100`} />
                </DetailSection>
              )}

              {/* Web */}
              {data.web_details && (
                <DetailSection title="Presencia Web" icon={Globe}>
                  <DetailRow label="Score" value={`${data.web_presence_score}/100`} />
                  {data.web_details.title && <DetailRow label="Título" value={data.web_details.title} />}
                  <DetailRow label="Página de contacto" value={data.web_details.has_contact_page ? 'Sí' : 'No'} />
                  <DetailRow label="Página About" value={data.web_details.has_about_page ? 'Sí' : 'No'} />
                  <DetailRow label="Email corporativo" value={data.web_details.has_corporate_email ? 'Sí' : 'No'} />
                  {data.web_details.content_length != null && <DetailRow label="Contenido" value={`${data.web_details.content_length} caracteres`} />}
                </DetailSection>
              )}

              {/* Noticias */}
              {data.news_details && (
                <DetailSection title="Noticias" icon={Newspaper}>
                  <DetailRow label="Encontradas" value={data.noticias_encontradas} />
                  <DetailRow label="Sentimiento" value={`${data.news_sentiment_score}/100`} />
                  <DetailRow label="Menciones negativas" value={data.negative_media_mentions} />
                  {data.news_details.positive_mentions > 0 && <DetailRow label="Menciones positivas" value={data.news_details.positive_mentions} />}
                  {data.news_details.noticias && data.news_details.noticias.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-medium text-gray-600">Últimas noticias:</p>
                      {data.news_details.noticias.map((n, i) => (
                        <div key={i} className={`p-2 rounded border text-xs ${
                          n.sentimiento === 'negativo' ? 'bg-red-50 border-red-200' :
                          n.sentimiento === 'positivo' ? 'bg-green-50 border-green-200' :
                          'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              n.sentimiento === 'negativo' ? 'bg-red-100 text-red-700' :
                              n.sentimiento === 'positivo' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{n.sentimiento}</span>
                            <div className="min-w-0 flex-1">
                              {n.link ? (
                                <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline leading-tight inline-flex items-start gap-1">
                                  <span className="line-clamp-2">{n.titulo}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                </a>
                              ) : (
                                <span className="text-gray-700 line-clamp-2">{n.titulo}</span>
                              )}
                              {n.fecha && <p className="text-[10px] text-gray-400 mt-0.5">{n.fecha}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.news_details.error && (
                    <p className="text-xs text-yellow-600 mt-1">⚠ {data.news_details.error}</p>
                  )}
                </DetailSection>
              )}

              {/* Google */}
              {data.google_details && (
                <DetailSection title="Presencia en Buscadores" icon={Search}>
                  <DetailRow label="Score" value={`${data.google_presence_score}/100`} />
                  <DetailRow label="Resultados encontrados" value={data.google_details.resultados_estimados || 0} />
                  {data.google_details.menciones_negativas_google > 0 && <DetailRow label="Menciones negativas" value={data.google_details.menciones_negativas_google} />}
                  {data.google_details.menciones_positivas_google > 0 && <DetailRow label="Menciones positivas" value={data.google_details.menciones_positivas_google} />}
                  {data.google_details.resultados && data.google_details.resultados.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-medium text-gray-600">Resultados encontrados:</p>
                      {data.google_details.resultados.slice(0, 8).map((r, i) => (
                        <div key={i} className="text-xs p-2 bg-white rounded border border-gray-200">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-start gap-1">
                              <span className="line-clamp-1">{r.titulo || r.url}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            </a>
                          ) : (
                            <span className="text-gray-700">{r.titulo}</span>
                          )}
                          {r.snippet && <p className="text-gray-500 mt-0.5 line-clamp-2">{r.snippet}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Fallback: snippets sin URL (datos viejos de cache) */}
                  {(!data.google_details.resultados || data.google_details.resultados.length === 0) && data.google_details.snippets && data.google_details.snippets.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-gray-600">Resultados destacados:</p>
                      {data.google_details.snippets.map((s, i) => (
                        <p key={i} className="text-xs text-gray-600 pl-2 border-l-2 border-gray-300">{s}</p>
                      ))}
                    </div>
                  )}
                </DetailSection>
              )}

              {/* LinkedIn */}
              {data.linkedin_details && (
                <DetailSection title="LinkedIn" icon={Linkedin}>
                  <DetailRow label="Score" value={`${data.linkedin_score}/100`} />
                  <DetailRow label="Perfil corporativo" value={data.linkedin_details.tiene_perfil_linkedin ? 'Sí' : 'No'} />
                  {data.linkedin_details.perfil_url && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 min-w-[100px]">Perfil:</span>
                      <a href={data.linkedin_details.perfil_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        {data.linkedin_details.perfil_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {data.linkedin_details.descripcion && <DetailRow label="Descripción" value={data.linkedin_details.descripcion} />}
                  {data.linkedin_details.seguidores_estimado && <DetailRow label="Seguidores" value={data.linkedin_details.seguidores_estimado} />}
                  {data.linkedin_details.empleados_en_linkedin > 0 && <DetailRow label="Empleados en LinkedIn" value={data.linkedin_details.empleados_en_linkedin} />}
                  {data.linkedin_details.resultados && data.linkedin_details.resultados.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-gray-600">Perfiles encontrados:</p>
                      {data.linkedin_details.resultados.slice(0, 5).map((r, i) => (
                        <div key={i} className="text-xs p-1.5 bg-white rounded border border-gray-200">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              {r.title || r.url} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-gray-700">{r.title}</span>
                          )}
                          {r.snippet && <p className="text-gray-500 mt-0.5">{r.snippet}</p>}
                          {r.es_company && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded ml-1">Empresa</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {data.linkedin_details.score_desglose && data.linkedin_details.score_desglose.length > 0 && (
                    <div className="mt-2 text-[10px] text-gray-400">
                      {data.linkedin_details.score_desglose.map((d, i) => <span key={i} className="mr-2">• {d}</span>)}
                    </div>
                  )}
                </DetailSection>
              )}

              {/* Blacklists */}
              {data.blacklist_details && (
                <DetailSection title="Listas Negras / Sanciones" icon={Shield} defaultOpen={data.en_lista_negra}>
                  <DetailRow label="Score" value={`${data.blacklist_score}/100`} />
                  <DetailRow label="En lista negra" value={data.en_lista_negra ? '⚠️ SÍ' : '✅ No'} />
                  <DetailRow label="Listas verificadas" value={data.blacklist_details.listas_verificadas || 0} />
                  {data.blacklist_details.fuentes_consultadas && data.blacklist_details.fuentes_consultadas.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">Fuentes: {data.blacklist_details.fuentes_consultadas.join(', ')}</p>
                    </div>
                  )}
                  {data.blacklist_details.coincidencias && data.blacklist_details.coincidencias.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-medium text-red-600">Coincidencias encontradas:</p>
                      {data.blacklist_details.coincidencias.map((c, i) => (
                        <div key={i} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-red-700">{c.fuente}</span>
                            {c.keyword && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{c.keyword}</span>}
                          </div>
                          {c.url && c.titulo ? (
                            <div className="mt-1">
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline inline-flex items-start gap-1 font-medium">
                                <span className="line-clamp-1">{c.titulo}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              </a>
                              {c.snippet && <p className="text-red-600 mt-0.5 line-clamp-2">{c.snippet}</p>}
                            </div>
                          ) : (
                            <div className="mt-1">
                              {c.snippet && <p className="text-red-600 line-clamp-3">{c.snippet}</p>}
                              {!c.snippet && c.detalle && <p className="text-red-600">{c.detalle}</p>}
                              <a
                                href={`https://duckduckgo.com/?q=${encodeURIComponent((c.keyword || '') + ' ' + (data.blacklist_details._company_name || ''))}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-red-700 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                              >
                                Verificar en buscador <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {data.blacklist_details.advertencias && data.blacklist_details.advertencias.length > 0 && (
                    <div className="mt-2">
                      {data.blacklist_details.advertencias.map((a, i) => (
                        <p key={i} className="text-xs text-yellow-600">⚠ {a}</p>
                      ))}
                    </div>
                  )}
                </DetailSection>
              )}

              {/* Errores de módulos */}
              {Object.entries(data).filter(([k, v]) => k.endsWith('_error') && v).length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-medium text-yellow-700 mb-1">Módulos con errores:</p>
                  {Object.entries(data).filter(([k, v]) => k.endsWith('_error') && v).map(([k, v]) => (
                    <p key={k} className="text-xs text-yellow-600">• {k.replace('_error', '')}: {v}</p>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}

      {/* Sin datos */}
      {data && !data.disponible && expanded && (
        <div className="border-t px-4 sm:px-6 py-4 text-center">
          <p className="text-sm text-gray-500">No se encontraron datos OSINT disponibles</p>
        </div>
      )}
    </div>
  )
}

function DetailSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-lg border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-500" />}
          <h4 className="font-medium text-gray-800 text-xs uppercase">{title}</h4>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1 border-t pt-2">
          {children}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-gray-400 min-w-[100px]">{label}:</span>
      <span className="text-gray-700 font-medium">{String(value)}</span>
    </div>
  )
}

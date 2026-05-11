import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Shield, CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react'

const CONFIANZA_COLORS = {
  confirmado: 'text-green-700 bg-green-50 border-green-200',
  conflicto: 'text-red-700 bg-red-50 border-red-200',
  nuevo: 'text-blue-700 bg-blue-50 border-blue-200',
}

const formatFechaHora = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('es-AR')
}

const getValidationMeta = (tipoId) => {
  const normalized = (tipoId || '').toUpperCase()

  if (normalized === 'RUT') {
    return {
      title: 'Validacion DGI / RUT',
      subtitle: 'Fuentes tributarias e integraciones disponibles - Uruguay',
      buttonIdle: 'Validar RUT',
      buttonRefresh: 'Re-validar',
      successMessage: 'Validacion Uruguay completada',
      noAplicaMessage: 'La validacion Uruguay no aplica para este identificador',
      missingIdMessage: 'No hay RUT para validar',
      sourceFallback: 'DGI / InvoiCy',
      taxIdLabel: 'RUT',
      statusLabel: 'Estado DGI',
    }
  }

  return {
    title: 'Validacion AFIP/ARCA',
    subtitle: 'Padron publico de contribuyentes - Argentina',
    buttonIdle: 'Validar AFIP',
    buttonRefresh: 'Re-validar AFIP',
    successMessage: 'Validacion AFIP completada',
    noAplicaMessage: 'La validacion AFIP/ARCA no aplica para este identificador',
    missingIdMessage: 'No hay CUIT para validar',
    sourceFallback: 'AFIP',
    taxIdLabel: 'CUIT',
    statusLabel: 'Estado AFIP',
  }
}

function ValidationPanel({ cuit, tipoId, onApplyField }) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showImpuestos, setShowImpuestos] = useState(false)
  const [showEntidades, setShowEntidades] = useState(false)
  const [showActividades, setShowActividades] = useState(false)

  const normalizedTipoId = (tipoId || '').toUpperCase()
  const soportado = normalizedTipoId === 'CUIT' || normalizedTipoId === 'RUT'
  const meta = getValidationMeta(normalizedTipoId)

  useEffect(() => {
    let ignore = false

    const loadLatestValidation = async () => {
      if (!soportado || !cuit) {
        setResultado(null)
        setExpanded(false)
        return
      }

      if (normalizedTipoId !== 'CUIT') {
        return
      }

      try {
        const resp = await axios.get(`/api/validar/${cuit}/latest`)
        if (ignore || !resp.data?.success || !resp.data?.data?.resultado) return

        const latest = resp.data.data
        if (latest?.pais !== 'AR') return

        setResultado(latest.resultado)
        setExpanded(false)
      } catch {
        if (!ignore) {
          setResultado(null)
          setExpanded(false)
        }
      }
    }

    loadLatestValidation()

    return () => {
      ignore = true
    }
  }, [cuit, normalizedTipoId, soportado])

  const handleValidar = async () => {
    if (!cuit) {
      toast.error(meta.missingIdMessage)
      return
    }
    setLoading(true)
    try {
      const resp = await axios.post(`/api/validar/${cuit}`)
      if (resp.data.success) {
        const data = resp.data.data
        setResultado(data)
        setExpanded(true)
        if (data?.datos?.disponible) {
          toast.success(meta.successMessage)
        } else if (data?.datos?.no_aplica) {
          toast(meta.noAplicaMessage)
        } else {
          toast.error(data?.datos?.error || 'No se pudo validar')
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al validar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const datos = resultado?.datos
  const comp = resultado?.comparacion
  const bcraDesdeCache = datos?.bcra_origen === 'cache'
  const bcraCacheFecha = formatFechaHora(datos?.bcra_cache_timestamp)
  const taxIdValue = datos?.cuit_formateado || datos?.rut_formateado
  const fechaAlta = datos?.fecha_alta || datos?.fecha_inicio_actividades
  const estadoGeneral = datos?.estado || datos?.estado_actividad_codigo
  const afipValidado = normalizedTipoId === 'CUIT' && datos?.disponible

  if (!soportado) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Shield className="h-4 w-4" />
          <span>Validacion externa no disponible para {tipoId || 'este tipo de ID'}. Disponible para: Argentina (CUIT) y Uruguay (RUT de 9 o 12 digitos)</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{meta.title}</h3>
            <p className="text-xs text-gray-400">{meta.subtitle}</p>
          </div>
          {afipValidado && (
            <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" />
              Validado AFIP
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
            onClick={handleValidar}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando...</>
            ) : resultado ? (
              <><RefreshCw className="h-3.5 w-3.5" /> {meta.buttonRefresh}</>
            ) : (
              <><Shield className="h-3.5 w-3.5" /> {meta.buttonIdle}</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {resultado && expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Estado general */}
          {datos?.disponible ? (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {datos.estado_activo !== undefined && (
                datos.estado_activo ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> Contribuyente Activo
                  </span>
                ) : datos.estado_activo === false ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                    <XCircle className="h-3.5 w-3.5" /> Contribuyente Inactivo
                  </span>
                ) : null
              )}
              {datos.estado_activo === undefined && estadoGeneral && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {meta.statusLabel}: {estadoGeneral}
                </span>
              )}
              {normalizedTipoId === 'RUT' && datos?.rut_valido && datos?.rut_formato === 'corto' && (
                <span className="px-2 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium border border-sky-200">
                  RUT Uruguay corto validado
                </span>
              )}
              {!datos.estado && datos.bcra && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" /> Datos BCRA disponibles
                </span>
              )}
              {datos.tipo_contribuyente && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {datos.tipo_contribuyente}
                </span>
              )}
              {datos.tipo_persona && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {datos.tipo_persona}
                </span>
              )}
            </div>
          ) : datos?.no_aplica ? (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {datos?.error || meta.noAplicaMessage}
            </div>
          ) : datos?.configuracion_requerida ? (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {datos?.mensaje || datos?.error || 'Falta configuracion para consultar esta fuente externa'}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              {datos?.error || 'No se pudo obtener datos externos'}
            </div>
          )}

          {/* Datos obtenidos de la fuente externa */}
          {datos?.disponible && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {datos.razon_social && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Razon Social</p>
                  <p className="text-sm text-gray-800 font-medium">{datos.razon_social}</p>
                </div>
              )}
              {taxIdValue && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">{meta.taxIdLabel}</p>
                  <p className="text-sm text-gray-800 font-medium">{taxIdValue}</p>
                </div>
              )}
              {datos.nombre_fantasia && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Nombre Fantasia</p>
                  <p className="text-sm text-gray-800">{datos.nombre_fantasia}</p>
                </div>
              )}
              {datos.actividad_principal && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Actividad Principal</p>
                  <p className="text-sm text-gray-800">{datos.actividad_principal}</p>
                </div>
              )}
              {datos.ingresos_brutos && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Ingresos Brutos (IIBB)</p>
                  <p className="text-sm text-gray-800">{datos.ingresos_brutos}</p>
                </div>
              )}
              {datos.iibb?.jurisdicciones?.length > 0 && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">IIBB Jurisdiccion</p>
                  <p className="text-sm text-gray-800">{datos.iibb.jurisdicciones.join(', ')}</p>
                </div>
              )}
              {datos.iibb?.regimen && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">IIBB Regimen</p>
                  <p className="text-sm text-gray-800">{datos.iibb.regimen}</p>
                </div>
              )}
              {datos.iibb?.fase2_recomendada && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2.5 md:col-span-2">
                  <p className="text-[10px] font-medium text-amber-700 uppercase">IIBB Fase 2</p>
                  <p className="text-sm text-amber-800">
                    {datos.iibb.fase2_motivo || 'Se recomienda consulta de padron provincial/CM para obtener IIBB exacto.'}
                  </p>
                  {Array.isArray(datos.iibb.fase2_urls) && datos.iibb.fase2_urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {datos.iibb.fase2_urls.map((item, idx) => (
                        <a
                          key={`${item.url}-${idx}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {item.label || 'Consultar'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {datos.domicilio_fiscal && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Domicilio Fiscal</p>
                  <p className="text-sm text-gray-800">{datos.domicilio_fiscal}</p>
                </div>
              )}
              {fechaAlta && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Fecha Alta / Inicio Actividades</p>
                  <p className="text-sm text-gray-800">{fechaAlta}</p>
                </div>
              )}
              {datos.fecha_contrato_social && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Fecha Contrato Social</p>
                  <p className="text-sm text-gray-800">{datos.fecha_contrato_social}</p>
                </div>
              )}
            </div>
          )}

          {datos?.actividades?.length > 0 && (
            <div>
              <button
                onClick={() => setShowActividades(!showActividades)}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {showActividades ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Ver actividades ({datos.actividades.length})
              </button>
              {showActividades && (
                <div className="mt-2 max-h-40 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b">
                        <th className="text-left py-1 font-medium">Codigo</th>
                        <th className="text-left py-1 font-medium">Descripcion</th>
                        <th className="text-left py-1 font-medium">Inicio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.actividades.map((actividad, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1 text-gray-700">{actividad.codigo || '-'}</td>
                          <td className="py-1 text-gray-700">{actividad.descripcion || '-'}</td>
                          <td className="py-1 text-gray-500">{actividad.fecha_inicio || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BCRA — Situación Crediticia */}
          {datos?.bcra && (
            <div className={`rounded-lg p-3 border ${
              datos.bcra.peor_situacion <= 1 ? 'bg-green-50 border-green-200' :
              datos.bcra.peor_situacion <= 2 ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                BCRA — Central de Deudores
              </p>
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                {bcraDesdeCache ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    BCRA desde cache
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    BCRA en vivo
                  </span>
                )}
                {bcraDesdeCache && bcraCacheFecha && (
                  <span className="text-[10px] text-amber-900">
                    Cache: {bcraCacheFecha}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Situación</p>
                  <p className={`font-bold ${
                    datos.bcra.peor_situacion <= 1 ? 'text-green-700' :
                    datos.bcra.peor_situacion <= 2 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {datos.bcra.peor_situacion} — {datos.bcra.peor_situacion_desc}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Deuda Total</p>
                  <p className="font-bold text-gray-800">
                    ${Number(datos.bcra.monto_total_deuda || 0).toLocaleString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Entidades</p>
                  <p className="font-bold text-gray-800">{datos.bcra.cant_entidades || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Período</p>
                  <p className="font-bold text-gray-800">{datos.bcra.periodo || '-'}</p>
                </div>
              </div>
              {datos.bcra.cheques_rechazados && (
                <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Registra cheques rechazados
                </p>
              )}

              {/* Detalle por entidad */}
              {datos.bcra.entidades?.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowEntidades(!showEntidades)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {showEntidades ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Ver detalle por entidad ({datos.bcra.entidades.length})
                  </button>
                  {showEntidades && (
                    <div className="mt-2 max-h-52 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead>
                          <tr className="text-gray-400 border-b">
                            <th className="text-left py-1 font-medium">Entidad</th>
                            <th className="text-right py-1 font-medium">Monto</th>
                            <th className="text-center py-1 font-medium">Situación</th>
                            <th className="text-center py-1 font-medium">Atraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datos.bcra.entidades.map((ent, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-1.5 text-gray-700 pr-2">{ent.entidad}</td>
                              <td className="py-1.5 text-right font-medium text-gray-800 whitespace-nowrap">
                                ${Number(ent.monto || 0).toLocaleString('es-AR')}
                              </td>
                              <td className="py-1.5 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  ent.situacion <= 1 ? 'bg-green-100 text-green-700' :
                                  ent.situacion <= 2 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {ent.situacion} — {ent.situacion_desc}
                                </span>
                              </td>
                              <td className="py-1.5 text-center text-gray-600">
                                {ent.dias_atraso > 0 ? `${ent.dias_atraso}d` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fuentes consultadas */}
          {datos?.fuentes_consultadas?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {datos.fuentes_consultadas.map((f, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Impuestos */}
          {datos?.impuestos?.length > 0 && (
            <div>
              <button
                onClick={() => setShowImpuestos(!showImpuestos)}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {showImpuestos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {datos.impuestos.length} impuestos inscriptos
              </button>
              {showImpuestos && (
                <div className="mt-2 max-h-40 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b">
                        <th className="text-left py-1 font-medium">Impuesto</th>
                        <th className="text-left py-1 font-medium">Estado</th>
                        <th className="text-left py-1 font-medium">Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.impuestos.map((imp, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1 text-gray-700">{imp.impuesto}</td>
                          <td className="py-1">
                            <span className={imp.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-400'}>
                              {imp.estado}
                            </span>
                          </td>
                          <td className="py-1 text-gray-500">{imp.desde || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Comparación con datos del PDF */}
          {comp && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Comparación con datos del sistema
              </h4>

              {/* Puntaje */}
              {comp.total_campos > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        comp.puntaje_validacion >= 80 ? 'bg-green-500' :
                        comp.puntaje_validacion >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${comp.puntaje_validacion}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {comp.puntaje_validacion}% coincidencia
                  </span>
                </div>
              )}

              {/* Confirmados */}
              {comp.confirmados?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Datos confirmados ({comp.confirmados.length})
                  </p>
                  <div className="space-y-1">
                    {comp.confirmados.map((c, i) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded border ${CONFIANZA_COLORS.confirmado}`}>
                        <span className="font-medium">{c.campo}:</span> {c.valor}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflictos */}
              {comp.conflictos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Discrepancias ({comp.conflictos.length})
                  </p>
                  <div className="space-y-1">
                    {comp.conflictos.map((c, i) => (
                      <div key={i} className={`text-xs px-2 py-1.5 rounded border ${CONFIANZA_COLORS.conflicto}`}>
                        <span className="font-medium">{c.campo}:</span>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          <span className="text-red-500">PDF: {c.valor_pdf}</span>
                          <span className="text-red-800">AFIP: {c.valor_afip}</span>
                        </div>
                        {c.campo_db && onApplyField && (
                          <button
                            onClick={() => onApplyField(c.campo_db, c.valor_afip)}
                            className="mt-1 text-[10px] text-red-600 hover:text-red-800 underline"
                          >
                            Usar valor AFIP
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Datos nuevos */}
              {comp.nuevos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Datos nuevos disponibles ({comp.nuevos.length})
                  </p>
                  <div className="space-y-1">
                    {comp.nuevos.map((c, i) => (
                      <div key={i} className={`text-xs px-2 py-1.5 rounded border ${CONFIANZA_COLORS.nuevo} flex items-center justify-between`}>
                        <div>
                          <span className="font-medium">{c.campo}:</span> {c.valor_afip}
                        </div>
                        {c.campo_db && onApplyField && (
                          <button
                            onClick={() => onApplyField(c.campo_db, c.valor_afip)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline ml-2 whitespace-nowrap"
                          >
                            Aplicar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-50">
            <span>Fuente: {datos?.fuente || meta.sourceFallback}</span>
            {resultado?.timestamp && (
              <span>Consultado: {new Date(resultado.timestamp).toLocaleString('es-AR')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ValidationPanel

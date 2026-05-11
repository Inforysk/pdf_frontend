import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Shield, CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react'

// Pasos de validación para el modal de progreso
const VALIDATION_STEPS = [
  { time: 0, msg: 'Iniciando validación...' },
  { time: 2, msg: 'Consultando AFIP/ARCA...' },
  { time: 5, msg: 'Verificando estado del contribuyente...' },
  { time: 8, msg: 'Obteniendo datos fiscales...' },
  { time: 12, msg: 'Consultando BCRA...' },
  { time: 18, msg: 'Procesando información...' },
]

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

// Formatear datos BCRA para el campo "Relaciones Bancarias y Riesgo Crediticio"
const formatBcraParaRelacionesBancarias = (bcraData, cheques) => {
  if (!bcraData) return ''
  
  const lines = []
  const fecha = new Date().toLocaleDateString('es-AR')
  
  lines.push(`<strong>CENTRAL DE DEUDORES BCRA</strong> (Consultado: ${fecha})`)
  lines.push('')
  
  // Resumen general
  lines.push(`<strong>Situación General:</strong> ${bcraData.peor_situacion || 1} - ${bcraData.peor_situacion_desc || 'Normal'}`)
  lines.push(`<strong>Deuda Total:</strong> $${Number(bcraData.monto_total_deuda || 0).toLocaleString('es-AR')}`)
  lines.push(`<strong>Entidades Informantes:</strong> ${bcraData.cant_entidades || 0}`)
  lines.push(`<strong>Período:</strong> ${bcraData.periodo || '-'}`)
  lines.push('')
  
  // Detalle por entidad
  if (bcraData.entidades?.length > 0) {
    lines.push('<strong>Detalle por Entidad:</strong>')
    bcraData.entidades.forEach(ent => {
      const atraso = ent.dias_atraso > 0 ? ` (${ent.dias_atraso} días atraso)` : ''
      lines.push(`• ${ent.entidad}: $${Number(ent.monto || 0).toLocaleString('es-AR')} - Sit. ${ent.situacion} (${ent.situacion_desc})${atraso}`)
    })
    lines.push('')
  }
  
  // Cheques rechazados
  if (cheques?.tiene_cheques_rechazados) {
    lines.push('<strong>⚠️ CHEQUES RECHAZADOS:</strong>')
    lines.push(`Cantidad: ${cheques.total_rechazados || 0}`)
    lines.push(`Monto Total: $${Number(cheques.monto_total || 0).toLocaleString('es-AR')}`)
    if (cheques.pendientes_pago > 0) {
      lines.push(`Pendientes de pago: ${cheques.pendientes_pago}`)
    }
    if (cheques.en_proceso_judicial > 0) {
      lines.push(`En proceso judicial: ${cheques.en_proceso_judicial}`)
    }
    lines.push('')
  }
  
  return lines.join('<br/>')
}

function ValidationPanel({ cuit, tipoId, onApplyField }) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showImpuestos, setShowImpuestos] = useState(false)
  const [showEntidades, setShowEntidades] = useState(false)
  const [showActividades, setShowActividades] = useState(false)
  const [showCheques, setShowCheques] = useState(false)
  const [loadingBcra, setLoadingBcra] = useState(false)
  // Timer para modal de progreso
  const [validationElapsed, setValidationElapsed] = useState(0)
  const validationStartRef = useRef(null)
  // Modal ARBA para consulta IIBB
  const [showArbaModal, setShowArbaModal] = useState(false)
  const [arbaUrl, setArbaUrl] = useState('')
  const [iibbManual, setIibbManual] = useState('')
  const [arbaStep, setArbaStep] = useState('waiting') // 'waiting' | 'input' | 'history'
  const [arbaData, setArbaData] = useState({
    razonSocial: '',
    contribuyenteEstado: '',
    contribuyenteCategoria: '',
    agenteEstado: '',
    agenteCategoria: '',
  })
  const [arbaHistorial, setArbaHistorial] = useState(null)
  const [arbaHistorialCompleto, setArbaHistorialCompleto] = useState([])
  const [showArbaHistorial, setShowArbaHistorial] = useState(false)
  const [arbaPopup, setArbaPopup] = useState(null)

  // Detectar cuando se cierra la ventana popup de ARBA
  useEffect(() => {
    if (!arbaPopup || arbaStep !== 'waiting') return
    
    const checkPopup = setInterval(() => {
      if (arbaPopup.closed) {
        setArbaStep('input')
        setArbaPopup(null)
        clearInterval(checkPopup)
      }
    }, 500)
    
    return () => clearInterval(checkPopup)
  }, [arbaPopup, arbaStep])

  // Timer para actualizar tiempo transcurrido durante validación
  useEffect(() => {
    if (!loading) {
      setValidationElapsed(0)
      return
    }
    validationStartRef.current = Date.now()
    const interval = setInterval(() => {
      setValidationElapsed(Math.floor((Date.now() - validationStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Obtener paso actual del modal de progreso
  const currentValidationStep = VALIDATION_STEPS.filter(s => s.time <= validationElapsed).pop() || VALIDATION_STEPS[0]

  // Cargar historial ARBA desde la API
  useEffect(() => {
    const cargarHistorialArba = async () => {
      if (!cuit) {
        setArbaHistorial(null)
        setArbaHistorialCompleto([])
        return
      }
      try {
        const resp = await axios.get(`/api/consultas-provinciales/${cuit}?provincia=ARBA`)
        if (resp.data?.success && resp.data?.latest?.ARBA) {
          const latest = resp.data.latest.ARBA
          setArbaHistorial({
            razonSocial: latest.razon_social,
            contribuyenteEstado: latest.contribuyente_estado,
            contribuyenteCategoria: latest.contribuyente_categoria,
            agenteEstado: latest.agente_estado,
            agenteCategoria: latest.agente_categoria,
            fecha: latest.created_at,
            consultadoPor: latest.consultado_por,
          })
          setArbaHistorialCompleto(resp.data.data || [])
        } else {
          setArbaHistorial(null)
          setArbaHistorialCompleto([])
        }
      } catch {
        setArbaHistorial(null)
        setArbaHistorialCompleto([])
      }
    }
    cargarHistorialArba()
  }, [cuit])

  // Guardar datos ARBA en la base de datos
  const guardarArbaData = async (data) => {
    try {
      const resp = await axios.post(`/api/consultas-provinciales/${cuit}`, {
        provincia: 'ARBA',
        razonSocial: data.razonSocial,
        contribuyenteEstado: data.contribuyenteEstado,
        contribuyenteCategoria: data.contribuyenteCategoria,
        agenteEstado: data.agenteEstado,
        agenteCategoria: data.agenteCategoria,
      })
      if (resp.data?.success) {
        const historialActualizado = {
          ...data,
          fecha: resp.data.created_at || new Date().toISOString(),
        }
        setArbaHistorial(historialActualizado)
        // Recargar historial completo
        const histResp = await axios.get(`/api/consultas-provinciales/${cuit}?provincia=ARBA`)
        if (histResp.data?.success) {
          setArbaHistorialCompleto(histResp.data.data || [])
        }
        return true
      }
    } catch (err) {
      console.error('Error guardando ARBA:', err)
      toast.error('Error al guardar datos ARBA')
    }
    return false
  }

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

  // Consultar BCRA en vivo (forzar nueva consulta)
  const handleConsultarBCRA = async () => {
    if (!cuit) return
    setLoadingBcra(true)
    try {
      const resp = await axios.post(`/api/validar/${cuit}?force_bcra=1`)
      if (resp.data.success) {
        const data = resp.data.data
        setResultado(data)
        if (data?.datos?.bcra) {
          toast.success('BCRA actualizado')
        } else {
          toast.error('No se pudo obtener datos de BCRA')
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al consultar BCRA'
      toast.error(msg)
    } finally {
      setLoadingBcra(false)
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
      {/* Modal de validación en progreso - bloquea toda interacción */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 animate-spin" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="8" 
                    strokeDasharray="251" strokeDashoffset="188" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">{validationElapsed}s</span>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Validando {meta.taxIdLabel}</h3>
            <p className="text-gray-600 mb-4 min-h-[24px] transition-all duration-300">
              {currentValidationStep.msg}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (validationElapsed / 25) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              Consultando fuentes oficiales
            </p>
            <p className="text-xs text-gray-400 mt-2">
              No cierre esta ventana
            </p>
          </div>
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800">{datos.iibb.jurisdicciones.join(', ')}</p>
                    {Array.isArray(datos.iibb.fase2_urls) && datos.iibb.fase2_urls.length > 0 && (
                      <div className="flex gap-1">
                        {datos.iibb.fase2_urls.map((item, idx) => {
                          const isArba = item.label?.includes('ARBA')
                          if (isArba) {
                            return (
                              <button
                                key={`${item.url}-${idx}`}
                                onClick={() => {
                                  setArbaUrl(item.url)
                                  setIibbManual('')
                                  setArbaStep('waiting')
                                  setArbaData({
                                    razonSocial: '',
                                    contribuyenteEstado: '',
                                    contribuyenteCategoria: '',
                                    agenteEstado: '',
                                    agenteCategoria: '',
                                  })
                                  setShowArbaModal(true)
                                  const popup = window.open(item.url, 'arba_consulta', 'width=900,height=700,scrollbars=yes,resizable=yes')
                                  setArbaPopup(popup)
                                }}
                                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100"
                                title="Consultar ARBA"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {item.label}
                              </button>
                            )
                          }
                          return (
                            <a
                              key={`${item.url}-${idx}`}
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100"
                              title={`Consultar ${item.label}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {item.label}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {datos.iibb?.regimen && (
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">IIBB Regimen</p>
                  <p className="text-sm text-gray-800">{datos.iibb.regimen}</p>
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
                    BCRA desde historial{bcraCacheFecha ? `, ${bcraCacheFecha}` : ''}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    BCRA en vivo
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
                <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> Registra cheques rechazados
                  </p>
                  {datos.bcra_cheques && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                        <div>
                          <p className="text-red-400">Cantidad</p>
                          <p className="font-bold text-red-700">{datos.bcra_cheques.total_rechazados || 0}</p>
                        </div>
                        <div>
                          <p className="text-red-400">Monto Total</p>
                          <p className="font-bold text-red-700">${Number(datos.bcra_cheques.monto_total || 0).toLocaleString('es-AR')}</p>
                        </div>
                        <div>
                          <p className="text-red-400">Pendientes</p>
                          <p className="font-bold text-red-700">{datos.bcra_cheques.pendientes_pago || 0}</p>
                        </div>
                        <div>
                          <p className="text-red-400">Judiciales</p>
                          <p className="font-bold text-red-700">{datos.bcra_cheques.en_proceso_judicial || 0}</p>
                        </div>
                      </div>
                      {datos.bcra_cheques.detalle?.length > 0 && (
                        <div>
                          <button
                            onClick={() => setShowCheques(!showCheques)}
                            className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            {showCheques ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            Ver detalle de cheques ({datos.bcra_cheques.detalle.length})
                          </button>
                          {showCheques && (
                            <div className="mt-2 max-h-40 overflow-y-auto overflow-x-auto">
                              <table className="w-full text-xs min-w-[350px]">
                                <thead>
                                  <tr className="text-red-400 border-b border-red-200">
                                    <th className="text-left py-1 font-medium">Causal</th>
                                    <th className="text-right py-1 font-medium">Monto</th>
                                    <th className="text-center py-1 font-medium">Fecha</th>
                                    <th className="text-center py-1 font-medium">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {datos.bcra_cheques.detalle.map((ch, i) => (
                                    <tr key={i} className="border-b border-red-100">
                                      <td className="py-1 text-gray-700">{ch.causal}</td>
                                      <td className="py-1 text-right font-medium text-red-700">
                                        ${Number(ch.monto || 0).toLocaleString('es-AR')}
                                      </td>
                                      <td className="py-1 text-center text-gray-600">{ch.fecha_rechazo || '-'}</td>
                                      <td className="py-1 text-center">
                                        {ch.fecha_pago ? (
                                          <span className="text-green-600 text-[10px]">Pagado</span>
                                        ) : ch.proceso_judicial ? (
                                          <span className="text-red-600 text-[10px]">Judicial</span>
                                        ) : (
                                          <span className="text-amber-600 text-[10px]">Pendiente</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
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

              {/* Botones de acción */}
              <div className="mt-3 pt-2 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                {onApplyField && (
                  <button
                    onClick={() => onApplyField('relaciones_bancarias_riesgo', formatBcraParaRelacionesBancarias(datos.bcra, datos.bcra_cheques), true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aplicar a Relaciones Bancarias
                  </button>
                )}
                <button
                  onClick={handleConsultarBCRA}
                  disabled={loadingBcra}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {loadingBcra ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {bcraDesdeCache ? 'Consultar BCRA' : 'Actualizar BCRA'}
                </button>
              </div>
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

          {/* Agentes de Retención/Percepción */}
          {datos?.es_agente_retencion && datos?.agentes_retencion?.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-semibold text-indigo-800 uppercase">
                  Agente de Retención / Percepción
                </span>
              </div>
              <p className="text-[10px] text-indigo-600 mb-2">
                Esta empresa está obligada a retener/percibir impuestos en sus operaciones
              </p>
              <div className="space-y-1">
                {datos.agentes_retencion.map((ag, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1">
                    <span className="text-gray-700">
                      <strong>{ag.tipo}</strong>
                      <span className="text-gray-400 ml-1">({ag.rol})</span>
                    </span>
                    {ag.desde && (
                      <span className="text-gray-400 text-[10px]">desde {ag.desde}</span>
                    )}
                  </div>
                ))}
              </div>
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

      {/* Modal ARBA para consulta */}
      {showArbaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-amber-50 sticky top-0">
              <div>
                <h3 className="font-semibold text-amber-800">ARBA - Pcia. Buenos Aires</h3>
                <p className="text-xs text-amber-600">
                  {arbaStep === 'waiting' && 'Resolvé el CAPTCHA en la ventana de ARBA'}
                  {arbaStep === 'input' && 'Ingresá los datos de la consulta'}
                  {arbaStep === 'history' && 'Datos guardados de consulta anterior'}
                </p>
              </div>
              <button
                onClick={() => setShowArbaModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-4 space-y-4">
              
              {/* PASO 1: Esperando CAPTCHA */}
              {arbaStep === 'waiting' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="animate-pulse mb-3">
                      <div className="mx-auto w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                        <ExternalLink className="h-6 w-6 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-sm text-blue-800 font-medium">
                      Consultando ARBA...
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      1. Resolvé el CAPTCHA en la ventana<br/>
                      2. Hacé clic en "Aceptar"<br/>
                      3. <strong>Cerrá la ventana de ARBA</strong> para continuar
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Al cerrar la ventana aparecerán las opciones automáticamente
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      const popup = window.open(arbaUrl, 'arba_consulta', 'width=900,height=700,scrollbars=yes,resizable=yes')
                      setArbaPopup(popup)
                    }}
                    className="w-full px-4 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reabrir ventana ARBA
                  </button>
                  
                  <button
                    onClick={() => setArbaStep('input')}
                    className="w-full px-4 py-3 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    ✓ Ya tengo los datos de ARBA
                  </button>
                </>
              )}
              
              {/* PASO 2: Selección rápida */}
              {arbaStep === 'input' && (
                <>
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-700 font-medium">
                      ¿Qué resultado muestra ARBA?
                    </p>
                    <p className="text-xs text-gray-500">
                      Seleccioná según lo que ves en la consulta
                    </p>
                  </div>
                  
                  {/* Opciones rápidas de contribuyente */}
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        const data = {
                          contribuyenteEstado: 'Sin Deuda',
                          contribuyenteCategoria: 'Categoría 0',
                          agenteEstado: 'Sin Incumplimiento',
                          agenteCategoria: 'Categoría 0',
                        }
                        setArbaData(data)
                        const ok = await guardarArbaData(data)
                        if (ok) {
                          toast.success('✓ Sin deuda guardado')
                          setArbaStep('history')
                        }
                      }}
                      className="w-full p-4 text-left rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-800">SIN DEUDA</p>
                          <p className="text-xs text-green-600">Contribuyente sin deuda - Categoría 0</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={async () => {
                        const data = {
                          contribuyenteEstado: 'Con Deuda',
                          contribuyenteCategoria: 'Categoría 1',
                          agenteEstado: '',
                          agenteCategoria: '',
                        }
                        setArbaData(data)
                        const ok = await guardarArbaData(data)
                        if (ok) {
                          toast.success('⚠ Con deuda guardado')
                          setArbaStep('history')
                        }
                      }}
                      className="w-full p-4 text-left rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                          <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-800">CON DEUDA</p>
                          <p className="text-xs text-amber-600">Contribuyente con deuda pendiente</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={async () => {
                        const data = {
                          contribuyenteEstado: 'No Inscripto',
                          contribuyenteCategoria: 'N/A',
                          agenteEstado: '',
                          agenteCategoria: '',
                        }
                        setArbaData(data)
                        const ok = await guardarArbaData(data)
                        if (ok) {
                          toast.success('No inscripto guardado')
                          setArbaStep('history')
                        }
                      }}
                      className="w-full p-4 text-left rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                          <XCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">NO INSCRIPTO</p>
                          <p className="text-xs text-gray-500">No figura como contribuyente ARBA</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  <div className="border-t pt-3 mt-3">
                    <button
                      onClick={() => setArbaStep('waiting')}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      ← Volver a consultar
                    </button>
                  </div>
                </>
              )}
              
              {/* PASO 3: Ver historial / Aplicar */}
              {arbaStep === 'history' && arbaHistorial && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Última consulta</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {new Date(arbaHistorial.fecha).toLocaleString('es-AR')}
                      {arbaHistorial.consultadoPor && ` • por ${arbaHistorial.consultadoPor}`}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Razón Social:</span>
                        <span className="font-medium">{arbaHistorial.razonSocial || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contribuyente:</span>
                        <span className="font-medium">{arbaHistorial.contribuyenteEstado} - {arbaHistorial.contribuyenteCategoria}</span>
                      </div>
                      {arbaHistorial.agenteEstado && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Agente:</span>
                          <span className="font-medium">{arbaHistorial.agenteEstado} - {arbaHistorial.agenteCategoria}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Historial completo */}
                  {arbaHistorialCompleto.length > 1 && (
                    <div className="border-t pt-3">
                      <button
                        onClick={() => setShowArbaHistorial(!showArbaHistorial)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        {showArbaHistorial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Ver historial completo ({arbaHistorialCompleto.length} consultas)
                      </button>
                      {showArbaHistorial && (
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                          {arbaHistorialCompleto.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className={`text-xs p-2 rounded border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                            >
                              <div className="flex justify-between text-gray-500 mb-1">
                                <span>{new Date(item.created_at).toLocaleString('es-AR')}</span>
                                <span>{item.consultado_por}</span>
                              </div>
                              <div className="text-gray-700">
                                Contribuyente: {item.contribuyente_estado} - {item.contribuyente_categoria}
                              </div>
                              {item.agente_estado && item.agente_estado !== 'No Aplica' && (
                                <div className="text-gray-700">
                                  Agente: {item.agente_estado} - {item.agente_categoria}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const fecha = new Date().toLocaleDateString('es-AR')
                        let texto = `<strong>ESTADO ARBA</strong> (Consultado: ${fecha})<br/>`
                        texto += `Contribuyente: ${arbaHistorial.contribuyenteEstado} - ${arbaHistorial.contribuyenteCategoria}`
                        if (arbaHistorial.agenteEstado && arbaHistorial.agenteEstado !== 'No Aplica') {
                          texto += `<br/>Agente: ${arbaHistorial.agenteEstado} - ${arbaHistorial.agenteCategoria}`
                        }
                        if (onApplyField) {
                          onApplyField('relaciones_bancarias_riesgo', texto, true)
                          toast.success('Estado ARBA agregado a Relaciones Bancarias')
                        }
                      }}
                      className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar a Relaciones Bancarias
                    </button>
                    
                    <button
                      onClick={() => {
                        setArbaStep('waiting')
                        const popup = window.open(arbaUrl, 'arba_consulta', 'width=900,height=700,scrollbars=yes,resizable=yes')
                        setArbaPopup(popup)
                      }}
                      className="w-full px-4 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100"
                    >
                      Consultar de nuevo en ARBA
                    </button>
                  </div>
                  
                  <div className="border-t pt-3">
                    <button
                      onClick={() => setShowArbaModal(false)}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
              
              {/* Botón cerrar para steps sin él */}
              {(arbaStep === 'waiting' || arbaStep === 'input') && (
                <div className="border-t pt-3">
                  <button
                    onClick={() => setShowArbaModal(false)}
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ValidationPanel

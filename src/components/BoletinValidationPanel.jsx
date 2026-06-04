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
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Sparkles,
  X,
} from 'lucide-react'
import ProgressModal from './ui/ProgressModal'

// Pasos de Boletín para el modal de progreso
const BOLETIN_STEPS = [
  { time: 0, msg: 'Iniciando búsqueda...' },
  { time: 3, msg: 'Consultando Boletín Oficial...' },
  { time: 8, msg: 'Analizando publicaciones...' },
  { time: 15, msg: 'Verificando historial...' },
  { time: 22, msg: 'Procesando resultados...' },
]

// Pasos para historial completo (más largo)
const HISTORIAL_COMPLETO_STEPS = [
  { time: 0, msg: 'Iniciando búsqueda completa...' },
  { time: 5, msg: 'Cargando todas las publicaciones...' },
  { time: 15, msg: 'Descargando detalles de cada publicación...' },
  { time: 30, msg: 'Analizando contenido completo...' },
  { time: 45, msg: 'Procesando historial extenso...' },
  { time: 60, msg: 'Finalizando búsqueda completa...' },
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

const normalizePublication = (p, source = 'resultado', idx = 0) => ({
  key: `${source}-${idx}-${p?.id || ''}-${p?.url_fuente || p?.url || ''}-${p?.fecha || p?.fecha_publicacion || ''}`,
  source,
  id: p?.id,
  titulo: safeText(p?.titulo) || 'Publicación',
  fecha: p?.fecha || p?.fecha_publicacion || null,
  seccion: p?.seccion || null,
  tipo: p?.tipo || p?.tipo_publicacion || null,
  numero_boletin: p?.numero_boletin || null,
  url: p?.url || p?.url_fuente || null,
  confianza: p?.confianza ?? p?.confiabilidad ?? null,
  texto: safeText(p?.texto_completo || p?.texto_publicacion),
  first_seen_at: p?.first_seen_at || null,
  last_seen_at: p?.last_seen_at || null,
  veces_detectado: p?.veces_detectado || null,
  es_nuevo_ingreso: !!p?.es_nuevo_ingreso,
})

const buildPublicationSummary = (item) => {
  if (!item) return ''
  const lines = [
    item.titulo ? `Título: ${item.titulo}` : null,
    item.fecha ? `Fecha: ${item.fecha}` : null,
    item.seccion ? `Sección: ${item.seccion}` : null,
    item.tipo ? `Tipo: ${item.tipo}` : null,
    item.numero_boletin ? `Boletín: ${item.numero_boletin}` : null,
    item.url ? `Fuente: ${item.url}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

const buildSocietariaObservacionesHtml = (content = '') => {
  const clean = safeText(content)
  if (!clean) return ''
  // Solo devolver el texto limpio, sin headers
  return clean
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
  const [historialLoading, setHistorialLoading] = useState(false)
  const [historialData, setHistorialData] = useState(null)
  const [selectionModalOpen, setSelectionModalOpen] = useState(false)
  const [selectedPublicationKey, setSelectedPublicationKey] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [filtroSeccion, setFiltroSeccion] = useState('todas') // Filtro de sección
  const [soloConBO, setSoloConBO] = useState(false) // Filtro solo con número de boletín
  const [paginaActual, setPaginaActual] = useState(1) // Paginación
  // Estados para historial completo
  const [historialCompletoLoading, setHistorialCompletoLoading] = useState(false)
  const [historialCompletoCargado, setHistorialCompletoCargado] = useState(false)
  const [confirmarHistorialCompleto, setConfirmarHistorialCompleto] = useState(false) // Modal confirmación
  const [yaValidado, setYaValidado] = useState(false) // Track si ya se validó alguna vez
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
          setYaValidado(true) // Ya tiene datos guardados
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
    if (!loading && !historialCompletoLoading) {
      setBoletinElapsed(0)
      return
    }
    boletinStartRef.current = Date.now()
    const interval = setInterval(() => {
      setBoletinElapsed(Math.floor((Date.now() - boletinStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, historialCompletoLoading])

  // Mantener selección válida del modal sin romper el orden de hooks.
  useEffect(() => {
    const resultadosLocal = resultado?.resultados || []
    
    // Filtrar resultados que tienen contenido mínimo
    const tieneContenidoMinimo = (r) => {
      const titulo = (r.titulo || '').trim()
      const texto = (r.texto_completo || '').trim()
      return titulo.length > 10 || texto.length > 50
    }
    
    const tabla = resultadosLocal
      .filter(r => tieneContenidoMinimo(r))
      .map((r, i) => normalizePublication(r, 'resultado', i))
    
    const uniqueMap = new Map()
    tabla.forEach((p) => {
      const textoNorm = normalizeText(p.texto || '').split(/\s+/).slice(0, 50).join(' ')
      const stableRef = p.url || (p.id != null ? `id-${p.id}` : '')
      const dedupeKey = stableRef || `${p.fecha || ''}-${textoNorm.slice(0, 200)}`
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, p)
      }
    })
    const uniques = Array.from(uniqueMap.values())

    if (!uniques.length) {
      if (selectedPublicationKey !== null) {
        setSelectedPublicationKey(null)
      }
      return
    }

    if (!selectedPublicationKey || !uniques.some((p) => p.key === selectedPublicationKey)) {
      setSelectedPublicationKey(uniques[0].key)
    }
  }, [resultado, selectedPublicationKey])

  // Reset página cuando cambian los filtros (debe estar antes de returns condicionales)
  useEffect(() => {
    setPaginaActual(1)
  }, [filtroSeccion, soloConBO, resultado])

  // Cada vez que se abre el modal, mostrar todas las publicaciones por defecto.
  useEffect(() => {
    if (!selectionModalOpen) return
    setFiltroSeccion('todas')
    setSoloConBO(false)
    setPaginaActual(1)
  }, [selectionModalOpen])

  // Obtener paso actual del modal de progreso
  const stepsToUse = historialCompletoLoading ? HISTORIAL_COMPLETO_STEPS : BOLETIN_STEPS
  const currentBoletinStep = stepsToUse.filter(s => s.time <= boletinElapsed).pop() || stepsToUse[0]
  const modalTitle = historialCompletoLoading ? 'Cargando Historial Completo' : 'Consultando Boletín Oficial'
  const modalSubtitle = historialCompletoLoading ? 'Este proceso es más extenso...' : 'Buscando publicaciones oficiales'
  const modalMaxSeconds = historialCompletoLoading ? 90 : 30

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
    setHistorialCompletoCargado(false) // Reset al hacer nueva búsqueda
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
      setYaValidado(true) // Marcar que ya se validó
      setExpanded(true) // Siempre expandir para mostrar resultados o mensaje de "no encontrado"
      setFiltroSeccion('todas')
      setSoloConBO(false)
      setPaginaActual(1)

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
        setSelectionModalOpen(true)
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
      console.error('Error validando Boletín:', err)
      toast.error(err.response?.data?.error || 'Error al validar Boletín Oficial')
      // Setear resultado vacío para que al menos muestre el botón Re-validar
      setResultado({ encontrado: false, resultados: [], error: err.message })
      setExpanded(true)
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar historial completo (más publicaciones, pero más lento)
  const handleCargarHistorialCompleto = async () => {
    setHistorialCompletoLoading(true)
    try {
      const res = await axios.post('/api/v1/boletin-oficial/search', {
        cuit: cuitClean,
        razon_social: safeText(razonSocial) || undefined,
        historial_completo: true,  // Flag para cargar más publicaciones
      })

      if (!res.data?.success) {
        toast.error(res.data?.error || 'Error cargando historial completo')
        return
      }

      const data = res.data.data || {}
      setFiltroSeccion('todas')
      setSoloConBO(false)
      setPaginaActual(1)
      
      // Combinar resultados nuevos con los existentes
      const resultadosExistentes = resultado?.resultados || []
      const resultadosNuevos = data.resultados || []
      
      // Deduplicar combinando por URL/fecha
      const urlsExistentes = new Set(resultadosExistentes.map(r => r.url || r.url_fuente || ''))
      const nuevosUnicos = resultadosNuevos.filter(r => {
        const url = r.url || r.url_fuente || ''
        return url && !urlsExistentes.has(url)
      })
      
      const resultadosCombinados = [...resultadosExistentes, ...nuevosUnicos]
      
      setResultado({
        ...resultado,
        ...data,
        resultados: resultadosCombinados,
        resultados_totales: resultadosCombinados.length,
      })
      
      setHistorialCompletoCargado(true)
      
      const nuevosAgregados = nuevosUnicos.length
      if (nuevosAgregados > 0) {
        toast.success(`Historial completo: se agregaron ${nuevosAgregados} publicación(es) más`)
      } else {
        toast('Historial completo cargado, no hay publicaciones adicionales', { icon: 'ℹ️' })
      }
      
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar historial completo')
    } finally {
      setHistorialCompletoLoading(false)
    }
  }

  const resultados = resultado?.resultados || []
  const hayResultados = !!resultado?.encontrado && resultados.length > 0
  const textoCombinado = hayResultados ? buildCombinedText(resultados) : ''
  
  // Filtrar resultados que tienen contenido mínimo (al menos título o texto)
  const tieneContenidoMinimo = (r) => {
    const titulo = (r.titulo || '').trim()
    const texto = (r.texto_completo || '').trim()
    // Mostrar si tiene título significativo o algo de texto
    return titulo.length > 10 || texto.length > 50
  }
  
  // Mostrar todos los resultados que tengan contenido mínimo
  const publicacionesTabla = resultados
    .filter(r => tieneContenidoMinimo(r))
    .map((r, i) => normalizePublication(r, 'resultado', i))
  
  // Deduplicar por primeras palabras del texto (más preciso)
  const uniquePublicationMap = new Map()
  publicacionesTabla.forEach((p) => {
    // Priorizar referencia estable (URL/ID) para no colapsar avisos distintos.
    const textoNorm = normalizeText(p.texto || '').split(/\s+/).slice(0, 50).join(' ')
    const stableRef = p.url || (p.id != null ? `id-${p.id}` : '')
    const dedupeKey = stableRef || `${p.fecha || ''}-${textoNorm.slice(0, 200)}`
    if (!uniquePublicationMap.has(dedupeKey)) {
      uniquePublicationMap.set(dedupeKey, p)
    } else {
      // Si ya existe, preferir el que tiene BO
      const existente = uniquePublicationMap.get(dedupeKey)
      if (!existente.numero_boletin && p.numero_boletin) {
        uniquePublicationMap.set(dedupeKey, p)
      }
    }
  })
  
  // Ordenar por fecha descendente (más reciente primero)
  const publicacionesUnicas = Array.from(uniquePublicationMap.values()).sort((a, b) => {
    const fechaA = a.fecha || ''
    const fechaB = b.fecha || ''
    return fechaB.localeCompare(fechaA)
  })
  
  // Obtener secciones disponibles para filtro
  const seccionesDisponibles = [...new Set(publicacionesUnicas.map(p => p.seccion).filter(Boolean))]
  
  // Contar publicaciones con BO
  const cantidadConBO = publicacionesUnicas.filter(p => p.numero_boletin).length
  
  // Aplicar filtros de sección y BO
  let publicacionesFiltradas = publicacionesUnicas
  if (filtroSeccion !== 'todas') {
    publicacionesFiltradas = publicacionesFiltradas.filter(p => p.seccion === filtroSeccion)
  }
  if (soloConBO) {
    publicacionesFiltradas = publicacionesFiltradas.filter(p => p.numero_boletin)
  }
  
  // Paginación
  const ITEMS_POR_PAGINA = 20
  const totalPaginas = Math.ceil(publicacionesFiltradas.length / ITEMS_POR_PAGINA)
  const paginaSegura = Math.min(paginaActual, Math.max(1, totalPaginas))
  const publicacionesPaginadas = publicacionesFiltradas.slice(
    (paginaSegura - 1) * ITEMS_POR_PAGINA,
    paginaSegura * ITEMS_POR_PAGINA
  )
  
  const selectedPublication =
    publicacionesUnicas.find((p) => p.key === selectedPublicationKey) ||
    publicacionesFiltradas[0] ||
    publicacionesUnicas[0] ||
    null
  const actualizacionDetectada = !!(resultado?.actualizacion_detectada || historialData?.actualizacion_detectada)
  const referenciaAlta = !!(historialData?.referencia_alta || actualizacionDetectada)

  const handleApplySelectedPublication = (targetField = 'sinopsis', mode = 'texto') => {
    if (!onApplyField || !selectedPublication) return

    const summary = buildPublicationSummary(selectedPublication)
    const texto = selectedPublication.texto
    let payload = ''

    if (mode === 'ficha') {
      payload = summary
    } else if (mode === 'ficha_texto') {
      payload = [summary, texto].filter(Boolean).join('\n\n')
    } else {
      payload = texto
    }

    if (!safeText(payload)) {
      toast('No hay contenido para aplicar', { icon: 'ℹ️' })
      return
    }

    if (targetField === 'estructura_societaria') {
      payload = buildSocietariaObservacionesHtml(payload)
      if (!safeText(payload)) {
        toast('No hay contenido para aplicar en Estructura societaria', { icon: 'ℹ️' })
        return
      }
    }

    // Siempre agregar, no reemplazar
    onApplyField(targetField, payload, { append: true })
    toast.success(
      targetField === 'estructura_societaria'
        ? 'Texto agregado a Estructura societaria'
        : 'Texto agregado a Sinopsis'
    )
    setSelectionModalOpen(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <ProgressModal
        isOpen={loading || historialCompletoLoading}
        title={modalTitle}
        message={currentBoletinStep.msg}
        elapsed={boletinElapsed}
        progressMaxSeconds={modalMaxSeconds}
        accent="emerald"
        subtitle={modalSubtitle}
        footer="No cierre esta ventana"
      />

      {/* Modal de confirmación para historial completo */}
      {confirmarHistorialCompleto && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 bg-amber-50">
              <h4 className="text-base font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Búsqueda de Historial Completo
              </h4>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700">
                Esta búsqueda es más exhaustiva y <strong>puede demorar entre 30 segundos y 2 minutos</strong> dependiendo de la cantidad de publicaciones.
              </p>
              <p className="text-sm text-gray-600">
                Se cargarán más detalles de cada publicación para encontrar información que no apareció en la búsqueda rápida.
              </p>
              <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                💡 Tip: Si ya tenés suficiente información, podés omitir este paso.
              </p>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmarHistorialCompleto(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmarHistorialCompleto(false)
                  handleCargarHistorialCompleto()
                }}
                className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors font-medium"
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3">
          <div className="w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">Publicaciones de Boletín Oficial</h4>
                <p className="text-xs text-gray-500">Elegí la publicación y la acción que querés tomar</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectionModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0 flex-1">
              <div className="border-r border-gray-200 min-h-0 overflow-auto">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-gray-700">
                      {publicacionesFiltradas.length} publicación(es)
                      {filtroSeccion !== 'todas' && ` en ${filtroSeccion}`}
                      {soloConBO && ' con BO'}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Filtro solo con BO */}
                      <button
                        type="button"
                        onClick={() => setSoloConBO(!soloConBO)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          soloConBO 
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                        title={`${cantidadConBO} publicaciones con número de boletín`}
                      >
                        con BO ({cantidadConBO})
                      </button>
                      <span className="text-gray-300 mx-1">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroSeccion('todas')
                          setSoloConBO(false) // Limpiar también el filtro de BO
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          filtroSeccion === 'todas' && !soloConBO
                            ? 'bg-gray-700 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Todas
                      </button>
                      {seccionesDisponibles.sort().map(seccion => (
                          <button
                            key={seccion}
                            type="button"
                            onClick={() => setFiltroSeccion(seccion)}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              filtroSeccion === seccion 
                                ? seccion === 'primera' ? 'bg-blue-600 text-white'
                                : seccion === 'segunda' ? 'bg-green-600 text-white'
                                : seccion === 'tercera' ? 'bg-purple-600 text-white'
                                : seccion === 'cuarta' ? 'bg-orange-600 text-white'
                                : 'bg-gray-700 text-white'
                                : seccion === 'primera' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : seccion === 'segunda' ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : seccion === 'tercera' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : seccion === 'cuarta' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {seccion.charAt(0).toUpperCase() + seccion.slice(1)}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold">Título</th>
                      <th className="px-3 py-2 font-semibold">Sección</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publicacionesPaginadas.map((p) => (
                      <tr
                        key={p.key}
                        onClick={() => setSelectedPublicationKey(p.key)}
                        className={`cursor-pointer border-t border-gray-100 ${selectedPublication?.key === p.key ? 'bg-indigo-50/70' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-3 py-2 align-top whitespace-nowrap text-gray-700">{p.fecha || '—'}</td>
                        <td className="px-3 py-2 align-top text-gray-800">
                          <p className="font-medium line-clamp-2">{p.titulo}</p>
                          {p.numero_boletin && <p className="text-[11px] text-gray-500 mt-0.5">BO {p.numero_boletin}</p>}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {p.seccion ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              p.seccion === 'primera' ? 'bg-blue-100 text-blue-700' :
                              p.seccion === 'segunda' ? 'bg-green-100 text-green-700' :
                              p.seccion === 'tercera' ? 'bg-purple-100 text-purple-700' :
                              p.seccion === 'cuarta' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {p.seccion}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500 whitespace-nowrap">
                      {(paginaSegura - 1) * ITEMS_POR_PAGINA + 1}-{Math.min(paginaSegura * ITEMS_POR_PAGINA, publicacionesFiltradas.length)} de {publicacionesFiltradas.length}
                    </p>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setPaginaActual(1)}
                        disabled={paginaSegura === 1}
                        className="px-1.5 py-0.5 rounded text-[11px] hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Primera página"
                      >
                        «
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                        disabled={paginaSegura === 1}
                        className="px-1.5 py-0.5 rounded text-[11px] hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Página anterior"
                      >
                        ‹
                      </button>
                      <span className="text-[11px] text-gray-700 px-2 font-medium">
                        {paginaSegura}/{totalPaginas}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaSegura === totalPaginas}
                        className="px-1.5 py-0.5 rounded text-[11px] hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Página siguiente"
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaginaActual(totalPaginas)}
                        disabled={paginaSegura === totalPaginas}
                        className="px-1.5 py-0.5 rounded text-[11px] hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Última página"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="min-h-0 overflow-auto flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700">Detalle seleccionado</p>
                </div>

                {selectedPublication ? (
                <div className="p-4 space-y-3 flex-1">
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-gray-900">{selectedPublication.titulo}</h5>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
                      {selectedPublication.fecha && <span>Fecha: {selectedPublication.fecha}</span>}
                      {selectedPublication.seccion && <span>Sección: {selectedPublication.seccion}</span>}
                      {selectedPublication.tipo && <span>Tipo: {selectedPublication.tipo}</span>}
                      {selectedPublication.numero_boletin && <span>BO: {selectedPublication.numero_boletin}</span>}
                      {selectedPublication.confianza != null && <span>Confianza: {selectedPublication.confianza}%</span>}
                    </div>
                    {selectedPublication.first_seen_at && (
                      <p className="text-[11px] text-gray-500">
                        Primera detección: {new Date(selectedPublication.first_seen_at).toLocaleString('es-AR')}
                      </p>
                    )}
                    {selectedPublication.last_seen_at && (
                      <p className="text-[11px] text-gray-500">
                        Última detección: {new Date(selectedPublication.last_seen_at).toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] font-semibold text-gray-700 mb-1">Texto completo</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[32vh] overflow-auto pr-1">
                      {selectedPublication.texto || 'Sin texto disponible en esta publicación.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedPublication.texto, 'Texto seleccionado copiado')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar texto
                    </button>
                    {selectedPublication.url && (
                      <a
                        href={selectedPublication.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs hover:bg-blue-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Ver fuente
                      </a>
                    )}
                  </div>

                  {onApplyField && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                      <p className="text-xs font-semibold text-indigo-800 mb-2">¿Qué información querés tomar y dónde aplicarla?</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => handleApplySelectedPublication('sinopsis', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[11px] hover:bg-indigo-700">
                          <ClipboardPaste className="h-3 w-3" /> Sinopsis
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('objeto_social', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] hover:bg-blue-700">
                          <ClipboardPaste className="h-3 w-3" /> Objeto Social
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('estructura_societaria', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] hover:bg-emerald-700">
                          <ClipboardPaste className="h-3 w-3" /> Estructura Soc.
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('composicion_capital', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 text-white text-[11px] hover:bg-teal-700">
                          <ClipboardPaste className="h-3 w-3" /> Composición Capital
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('datos_directivos', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-600 text-white text-[11px] hover:bg-cyan-700">
                          <ClipboardPaste className="h-3 w-3" /> Datos Directivos
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('historia', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600 text-white text-[11px] hover:bg-purple-700">
                          <ClipboardPaste className="h-3 w-3" /> Historia
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('situacion_economica_financiera', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600 text-white text-[11px] hover:bg-violet-700">
                          <ClipboardPaste className="h-3 w-3" /> Sit. Económica
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('bienes_uso', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-fuchsia-600 text-white text-[11px] hover:bg-fuchsia-700">
                          <ClipboardPaste className="h-3 w-3" /> Bienes de Uso
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('evolucion_resultados', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-600 text-white text-[11px] hover:bg-pink-700">
                          <ClipboardPaste className="h-3 w-3" /> Evolución y Result.
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('sociedades_vinculadas', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] hover:bg-rose-700">
                          <ClipboardPaste className="h-3 w-3" /> Soc. Vinculadas
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('cumplimiento_concepto', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-600 text-white text-[11px] hover:bg-orange-700">
                          <ClipboardPaste className="h-3 w-3" /> Cumplimiento
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('sucursales', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600 text-white text-[11px] hover:bg-amber-700">
                          <ClipboardPaste className="h-3 w-3" /> Sucursales
                        </button>
                        <button type="button" onClick={() => handleApplySelectedPublication('relaciones_bancarias_riesgo', 'texto')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-lime-600 text-white text-[11px] hover:bg-lime-700">
                          <ClipboardPaste className="h-3 w-3" /> Rel. Bancarias
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="p-4 flex items-center justify-center text-gray-500 text-sm">
                    <p>Seleccioná una publicación de la lista para ver el detalle.</p>
                  </div>
                )}
              </div>
            </div>
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
            ) : (resultado || yaValidado) ? (
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
                  onClick={() => setSelectionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-50"
                >
                  <Search className="h-3.5 w-3.5" /> Revisar y elegir información
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(textoCombinado, 'Texto de Boletín copiado')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar texto
                </button>
                {/* Botón para cargar historial completo */}
                {!historialCompletoCargado && (
                  <button
                    type="button"
                    onClick={() => setConfirmarHistorialCompleto(true)}
                    disabled={historialCompletoLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs hover:bg-amber-50 disabled:opacity-50"
                    title="Busca más publicaciones antiguas. Este proceso es más lento pero más completo."
                  >
                    {historialCompletoLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...</>
                    ) : (
                      <><RefreshCw className="h-3.5 w-3.5" /> Cargar historial completo</>
                    )}
                  </button>
                )}
                {historialCompletoCargado && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs border border-green-200">
                    <CheckCircle className="h-3.5 w-3.5" /> Historial completo cargado
                  </span>
                )}
              </div>

              {publicacionesUnicas.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">Historial y resultados en tabla</p>
                  </div>
                  <div className="overflow-auto max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-gray-600">
                          <th className="px-3 py-2 font-semibold">Fecha</th>
                          <th className="px-3 py-2 font-semibold">Título</th>
                          <th className="px-3 py-2 font-semibold">Sección</th>
                          <th className="px-3 py-2 font-semibold">Tipo</th>
                          <th className="px-3 py-2 font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {publicacionesUnicas.map((p) => (
                          <tr key={`tbl-${p.key}`} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700">{p.fecha || '—'}</td>
                            <td className="px-3 py-2 text-gray-800 max-w-[28ch]">
                              <p className="line-clamp-2 font-medium">{p.titulo}</p>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{p.seccion || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{p.tipo || '—'}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setFiltroSeccion('todas')
                                  setSoloConBO(false)
                                  setSelectedPublicationKey(p.key)
                                  setSelectionModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">No se encontraron resultados en Boletín Oficial</p>
                  <p className="text-xs mt-0.5">Prueba re-validar o completar mejor la razón social para mejorar el matching.</p>
                </div>
              </div>
              
              {/* Opción de buscar historial completo cuando no hay resultados */}
              {!historialCompletoCargado && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-blue-800 mb-2">
                    <strong>¿Buscamos más a fondo?</strong> Podemos hacer una búsqueda más exhaustiva que puede encontrar publicaciones adicionales, pero tardará más tiempo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmarHistorialCompleto(true)}
                    disabled={historialCompletoLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {historialCompletoLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</>
                    ) : (
                      <><Search className="h-3.5 w-3.5" /> Buscar historial completo</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

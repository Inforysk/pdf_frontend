import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, CheckCircle, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Building2, DollarSign, Award, Link2 } from 'lucide-react'
import ProgressModal from './ui/ProgressModal'

// Pasos de consulta BYMA para el modal de progreso
const BYMA_STEPS = [
  { time: 0, msg: 'Iniciando consulta BYMA...' },
  { time: 2, msg: 'Verificando si cotiza en bolsa...' },
  { time: 4, msg: 'Obteniendo datos de mercado...' },
  { time: 6, msg: 'Consultando índices...' },
  { time: 8, msg: 'Procesando información...' },
]

const formatNumber = (num, decimals = 2) => {
  if (!num && num !== 0) return '-'
  return Number(num).toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

const formatCurrency = (num, currency = 'ARS') => {
  if (!num && num !== 0) return '-'
  const prefix = currency === 'USD' ? 'USD ' : '$'
  return prefix + formatNumber(num, 0)
}

const formatBillions = (num) => {
  if (!num && num !== 0) return '-'
  const billions = num / 1000000000
  if (billions >= 1) return `USD ${formatNumber(billions, 2)}B`
  const millions = num / 1000000
  return `USD ${formatNumber(millions, 0)}M`
}

function BYMAValidator({ cuit, tipoId, pais, onApplyField }) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedBlocks, setExpandedBlocks] = useState({})
  const [bymaElapsed, setBymaElapsed] = useState(0)
  const bymaStartRef = useRef(null)
  
  // Estado para verificar si la empresa cotiza (determina si se muestra el panel)
  const [cotizaEnBolsa, setCotizaEnBolsa] = useState(null) // null = verificando, true/false = resultado
  const [infoEmpresaBolsa, setInfoEmpresaBolsa] = useState(null)

  const normalizedTipoId = (tipoId || '').toUpperCase()
  const normalizedPais = (pais || '').toUpperCase()
  
  // Solo verificar para empresas argentinas con CUIT
  const esArgentina = normalizedPais === 'AR' || normalizedPais === 'ARGENTINA'
  const soportado = normalizedTipoId === 'CUIT' && esArgentina

  // Verificar si la empresa cotiza al montar (antes de mostrar el panel)
  useEffect(() => {
    let ignore = false
    
    const checkCotiza = async () => {
      if (!soportado || !cuit) {
        setCotizaEnBolsa(false)
        return
      }
      
      try {
        const resp = await axios.get(`/api/byma/check/${cuit}`)
        if (ignore) return
        
        if (resp.data?.success && resp.data?.cotiza) {
          setCotizaEnBolsa(true)
          setInfoEmpresaBolsa({
            ticker: resp.data.ticker,
            nombre: resp.data.nombre,
            sector: resp.data.sector
          })
        } else {
          setCotizaEnBolsa(false)
        }
      } catch {
        if (!ignore) setCotizaEnBolsa(false)
      }
    }
    
    checkCotiza()
    return () => { ignore = true }
  }, [cuit, soportado])

  // Timer para actualizar tiempo transcurrido durante consulta
  useEffect(() => {
    if (!loading) {
      setBymaElapsed(0)
      return
    }
    bymaStartRef.current = Date.now()
    const interval = setInterval(() => {
      setBymaElapsed(Math.floor((Date.now() - bymaStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading])

  const currentStep = BYMA_STEPS.filter(s => s.time <= bymaElapsed).pop() || BYMA_STEPS[0]

  // Cargar última validación BYMA al montar
  useEffect(() => {
    let ignore = false

    const loadLatestByma = async () => {
      if (!soportado || !cuit) {
        setResultado(null)
        setExpanded(false)
        return
      }

      try {
        const resp = await axios.get(`/api/validar-byma/${cuit}/latest`)
        if (ignore || !resp.data?.success || !resp.data?.data) return

        const latest = resp.data.data
        setResultado({
          datos: latest.datos_externos,
          timestamp: latest.created_at
        })
        setExpanded(false)
      } catch {
        if (!ignore) {
          setResultado(null)
          setExpanded(false)
        }
      }
    }

    loadLatestByma()

    return () => {
      ignore = true
    }
  }, [cuit, soportado])

  const handleConsultar = async () => {
    if (!cuit) {
      toast.error('No hay CUIT para consultar')
      return
    }
    setLoading(true)
    try {
      const resp = await axios.get(`/api/validar-byma/${cuit}`)
      if (resp.data.success) {
        const data = resp.data.data
        setResultado({
          datos: data.datos,
          comparacion: data.comparacion,
          timestamp: new Date().toISOString()
        })
        setExpanded(true)
        if (data.datos?.disponible) {
          toast.success('Empresa encontrada en BYMA')
        } else {
          toast('La empresa no cotiza en bolsa', { icon: 'ℹ️' })
        }
        
        // Guardar automáticamente la validación
        try {
          await axios.post(`/api/validar-byma/${cuit}`, { datos: data.datos })
        } catch {
          // Ignorar error de guardado silenciosamente
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al consultar BYMA'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const toggleBlock = (blockKey) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockKey]: !prev[blockKey]
    }))
  }

  // No mostrar si no es soportado o si la empresa no cotiza en bolsa
  if (!soportado || cotizaEnBolsa === false) return null
  
  // Mostrar loading mientras verificamos si cotiza
  if (cotizaEnBolsa === null) return null

  const datos = resultado?.datos || {}
  const bloques = datos.bloques || {}
  const empresaCotiza = datos.disponible

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <ProgressModal
        isOpen={loading}
        title="Consultando BYMA"
        message={currentStep.msg}
        elapsed={bymaElapsed}
        progressMaxSeconds={12}
        accent="purple"
        subtitle={infoEmpresaBolsa ? `${infoEmpresaBolsa.ticker} • ${infoEmpresaBolsa.sector}` : 'Mercado de valores argentino'}
        footer="No cierre esta ventana"
      />

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Validación BYMA</h3>
            <p className="text-xs text-gray-400">Bolsas y Mercados Argentinos</p>
          </div>
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
            onClick={handleConsultar}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando...</>
            ) : resultado ? (
              <><RefreshCw className="h-3.5 w-3.5" /> Re-validar BYMA</>
            ) : (
              <><TrendingUp className="h-3.5 w-3.5" /> Validar BYMA</>
            )}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && expanded && (
        <div className="p-4">
          {/* Estado principal */}
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${empresaCotiza ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            {empresaCotiza ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className={`font-medium ${empresaCotiza ? 'text-green-800' : 'text-gray-600'}`}>
                {empresaCotiza ? 'Cotiza en Bolsa' : 'No cotiza en Bolsa'}
              </p>
              <p className="text-sm text-gray-500">{datos.mensaje}</p>
            </div>
            {empresaCotiza && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-auto p-1 text-gray-400 hover:text-gray-600"
              >
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Bloques de información */}
          {expanded && empresaCotiza && (
            <div className="space-y-3">
              {/* Bloque: Info General */}
              {bloques.info_general && (
                <BloqueInfo
                  titulo={bloques.info_general.titulo}
                  icon={<Building2 className="w-4 h-4" />}
                  expanded={expandedBlocks.info_general !== false}
                  onToggle={() => toggleBlock('info_general')}
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Ticker:</span>
                      <span className="ml-2 font-mono font-bold text-blue-600">
                        {bloques.info_general.datos.ticker}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sector:</span>
                      <span className="ml-2">{bloques.info_general.datos.sector}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Mercado:</span>
                      <span className="ml-2">{bloques.info_general.datos.mercado}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{bloques.info_general.descripcion}</p>
                </BloqueInfo>
              )}

              {/* Bloque: Cotización */}
              {bloques.cotizacion && (
                <BloqueInfo
                  titulo={bloques.cotizacion.titulo}
                  icon={<DollarSign className="w-4 h-4" />}
                  expanded={expandedBlocks.cotizacion !== false}
                  onToggle={() => toggleBlock('cotizacion')}
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Precio:</span>
                      <span className="ml-2 font-bold">
                        {formatCurrency(bloques.cotizacion.datos.precio_ars)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Variación:</span>
                      <span className={`ml-2 font-bold ${bloques.cotizacion.datos.variacion_porcentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {bloques.cotizacion.datos.variacion_porcentual >= 0 ? '+' : ''}
                        {formatNumber(bloques.cotizacion.datos.variacion_porcentual)}%
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-gray-400">
                      Fecha: {bloques.cotizacion.datos.fecha_precio}
                    </div>
                  </div>
                </BloqueInfo>
              )}

              {/* Bloque: Capitalización */}
              {bloques.capitalizacion && (
                <BloqueInfo
                  titulo={bloques.capitalizacion.titulo}
                  icon={<TrendingUp className="w-4 h-4" />}
                  expanded={expandedBlocks.capitalizacion !== false}
                  onToggle={() => toggleBlock('capitalizacion')}
                >
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatBillions(bloques.capitalizacion.datos.valor_usd)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        bloques.capitalizacion.datos.clasificacion === 'LARGE CAP' ? 'bg-green-100 text-green-700' :
                        bloques.capitalizacion.datos.clasificacion === 'MID CAP' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {bloques.capitalizacion.datos.clasificacion}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{bloques.capitalizacion.descripcion}</p>
                  </div>
                </BloqueInfo>
              )}

              {/* Bloque: Índices */}
              {bloques.indices && (
                <BloqueInfo
                  titulo={bloques.indices.titulo}
                  icon={<Award className="w-4 h-4" />}
                  expanded={expandedBlocks.indices !== false}
                  onToggle={() => toggleBlock('indices')}
                >
                  <div className="space-y-1">
                    {bloques.indices.datos.lista?.map((indice, idx) => (
                      <div key={idx} className={`flex items-center gap-2 text-sm p-1.5 rounded ${indice.participa ? 'bg-green-50' : 'bg-gray-50'}`}>
                        {indice.participa ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300" />
                        )}
                        <span className={indice.participa ? 'font-medium text-green-800' : 'text-gray-500'}>
                          {indice.nombre}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{bloques.indices.descripcion}</p>
                </BloqueInfo>
              )}

              {/* Bloque: Transparencia */}
              {bloques.transparencia && (
                <BloqueInfo
                  titulo={bloques.transparencia.titulo}
                  icon={<CheckCircle className="w-4 h-4" />}
                  expanded={expandedBlocks.transparencia !== false}
                  onToggle={() => toggleBlock('transparencia')}
                >
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {Object.entries(bloques.transparencia.datos).map(([key, value]) => {
                      if (typeof value !== 'boolean') return null
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                      return (
                        <div key={key} className="flex items-center gap-1">
                          {value ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-gray-300" />
                          )}
                          <span className={value ? 'text-green-700' : 'text-gray-400'}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{bloques.transparencia.descripcion}</p>
                </BloqueInfo>
              )}

              {/* Bloque: Enlaces */}
              {bloques.enlaces && (
                <BloqueInfo
                  titulo={bloques.enlaces.titulo}
                  icon={<Link2 className="w-4 h-4" />}
                  expanded={expandedBlocks.enlaces !== false}
                  onToggle={() => toggleBlock('enlaces')}
                >
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={bloques.enlaces.datos.bymadata}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      BYMADATA
                    </a>
                    <a
                      href={bloques.enlaces.datos.cnv}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CNV
                    </a>
                    <a
                      href={bloques.enlaces.datos.byma_empresas}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Empresas Listadas
                    </a>
                  </div>
                </BloqueInfo>
              )}
            </div>
          )}

          {/* Si no cotiza, mostrar descripción */}
          {!empresaCotiza && bloques.info_general && (
            <p className="text-sm text-gray-500 mt-2">
              {bloques.info_general.descripcion}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Componente auxiliar para bloques colapsables
function BloqueInfo({ titulo, icon, expanded, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-blue-600">{icon}</span>
        <span className="font-medium text-sm text-gray-900 flex-1">{titulo}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="p-3 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

export default BYMAValidator

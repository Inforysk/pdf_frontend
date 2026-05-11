import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  ArrowRight,
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  Download,
  Building,
  Calendar,
  Timer,
  MapPin,
  Banknote,
  Briefcase
} from 'lucide-react'
import toast from 'react-hot-toast'

function HistorialView({ empresaId, cuit, onBack, onViewVersion }) {
  const [loading, setLoading] = useState(true)
  const [historial, setHistorial] = useState(null)
  const [expandedVersion, setExpandedVersion] = useState(null)
  const [cambiosVersion, setCambiosVersion] = useState({})
  const [openPdfDropdown, setOpenPdfDropdown] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenPdfDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (cuit) {
      loadHistorialByCuit(cuit)
    } else if (empresaId) {
      loadHistorialById(empresaId)
    }
  }, [empresaId, cuit])

  const loadHistorialById = async (id) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/empresas/${id}/historial`)
      if (response.data.success) {
        setHistorial(response.data)
      }
    } catch (err) {
      toast.error('Error al cargar historial')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadHistorialByCuit = async (cuit) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/empresas/cuit/${cuit}/historial`)
      if (response.data.success) {
        setHistorial(response.data)
      }
    } catch (err) {
      toast.error('Error al cargar historial')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCambiosVersion = async (versionId) => {
    if (cambiosVersion[versionId]) return // Ya cargados
    
    try {
      const response = await axios.get(`/api/empresas/${versionId}/cambios`)
      if (response.data.success) {
        setCambiosVersion(prev => ({
          ...prev,
          [versionId]: response.data.cambios
        }))
      }
    } catch (err) {
      console.error('Error cargando cambios:', err)
    }
  }

  const toggleVersion = (versionId) => {
    if (expandedVersion === versionId) {
      setExpandedVersion(null)
    } else {
      setExpandedVersion(versionId)
      loadCambiosVersion(versionId)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stripHtml = (html) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
  }

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'agregado': return 'bg-green-100 text-green-700'
      case 'eliminado': return 'bg-red-100 text-red-700'
      case 'modificado': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleDownloadVersionPDF = async (version, lang = 'es') => {
    try {
      setOpenPdfDropdown(null)
      const langLabel = lang === 'en' ? 'inglés' : lang === 'de' ? 'alemán' : 'español'
      toast.loading(`Generando PDF (${langLabel}) de la versión ${version.version}...`, { id: 'pdf-version-download' })

      const response = await axios.get(`/api/empresas/${version.id}/pdf?lang=${lang}`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const safeName = (version.razon_social || historial?.razon_social || 'empresa')
        .replace(/[\\/:*?"<>|]/g, '_')
      const langSuffix = lang === 'en' ? '_EN' : lang === 'de' ? '_DE' : ''
      link.download = `Informe_${safeName}_v${version.version}${langSuffix}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('PDF descargado correctamente', { id: 'pdf-version-download' })
    } catch (err) {
      console.error('Error descargando PDF de versión:', err)
      toast.error('Error al generar el PDF de esta versión', { id: 'pdf-version-download' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-3" />
        <span className="text-gray-600">Cargando historial...</span>
      </div>
    )
  }

  if (!historial) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No se pudo cargar el historial</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Historial de Versiones
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                {historial.razon_social} | {historial.tipo_identificacion || 'CUIT'}: {historial.cuit}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {historial.total_versiones} versión{historial.total_versiones !== 1 ? 'es' : ''}
            </span>
            {onBack && (
              <button
                onClick={onBack}
                className="btn-secondary flex items-center text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                Volver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline de versiones */}
      <div className="space-y-4">
        {historial.versiones?.map((version, index) => (
          <div 
            key={version.id}
            className={`bg-white rounded-lg shadow-sm border overflow-visible transition-all ${
              version.activo ? 'ring-2 ring-green-500' : ''
            }`}
          >
            {/* Header de versión */}
            <div 
              className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                version.activo ? 'bg-green-50' : ''
              }`}
              onClick={() => toggleVersion(version.id)}
            >
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
                  {/* Indicador de timeline */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      version.activo 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      v{version.version}
                    </div>
                    {index < historial.versiones.length - 1 && (
                      <div className="absolute top-10 left-1/2 w-0.5 h-8 bg-gray-300 -translate-x-1/2" />
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">
                        Versión {version.version}
                      </span>
                      {version.activo && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          VIGENTE
                        </span>
                      )}
                      {!version.activo && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          Histórica
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(version.created_at)}
                      </span>
                      {version.razon_social && (
                        <span className="text-gray-400">
                          {version.razon_social}
                        </span>
                      )}
                    </div>

                    {/* Datos clave de la versión */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                      {version.forma_legal && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          <Briefcase className="h-3 w-3" />
                          {stripHtml(version.forma_legal)}
                        </span>
                      )}
                      {version.duracion_anios && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          <Timer className="h-3 w-3" />
                          {version.duracion_anios}
                        </span>
                      )}
                      {version.cierre_ejercicio && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          <Calendar className="h-3 w-3" />
                          {version.cierre_ejercicio}
                        </span>
                      )}
                      {version.capital_social && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          <Banknote className="h-3 w-3" />
                          {stripHtml(version.capital_social)}
                        </span>
                      )}
                      {version.domicilio && (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full max-w-xs truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {stripHtml(version.domicilio)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative" ref={openPdfDropdown === version.id ? dropdownRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenPdfDropdown(openPdfDropdown === version.id ? null : version.id)
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                      title="Descargar PDF de esta versión"
                    >
                      <Download className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {openPdfDropdown === version.id && (
                      <div
                        className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-50 overflow-hidden min-w-[170px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDownloadVersionPDF(version, 'es')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm"
                        >
                          <span className="text-base">ES</span>
                          Español
                        </button>
                        <button
                          onClick={() => handleDownloadVersionPDF(version, 'en')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-t"
                        >
                          <span className="text-base">EN</span>
                          English
                        </button>
                        <button
                          onClick={() => handleDownloadVersionPDF(version, 'de')}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-t"
                        >
                          <span className="text-base">DE</span>
                          Deutsch
                        </button>
                      </div>
                    )}
                  </div>
                  {onViewVersion && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewVersion(version.id, version.version)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver datos de esta versión"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {expandedVersion === version.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Detalle de cambios */}
            {expandedVersion === version.id && (
              <div className="border-t bg-gray-50 p-3 sm:p-4">
                {cambiosVersion[version.id]?.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Cambios en esta versión
                    </h4>
                    <div className="space-y-2">
                      {cambiosVersion[version.id].map((cambio, idx) => (
                        <div 
                          key={idx}
                          className="bg-white rounded-lg p-3 border"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {cambio.campo}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getTipoColor(cambio.tipo_cambio)}`}>
                                  {cambio.tipo_cambio}
                                </span>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row items-start gap-2 text-sm">
                                {cambio.valor_anterior && (
                                  <div className="flex-1 bg-red-50 rounded p-2">
                                    <span className="text-xs text-red-600 font-medium block mb-1">Anterior:</span>
                                    <span className="text-gray-700 text-xs line-clamp-3">
                                      {stripHtml(cambio.valor_anterior)}
                                    </span>
                                  </div>
                                )}
                                {cambio.valor_anterior && cambio.valor_nuevo && (
                                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-4 hidden sm:block" />
                                )}
                                {cambio.valor_nuevo && (
                                  <div className="flex-1 bg-green-50 rounded p-2">
                                    <span className="text-xs text-green-600 font-medium block mb-1">Nuevo:</span>
                                    <span className="text-gray-700 text-xs line-clamp-3">
                                      {stripHtml(cambio.valor_nuevo)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 mt-2">
                            {formatDate(cambio.fecha_cambio)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : version.version === 1 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    Versión inicial - Sin cambios previos
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando cambios...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumen de cambios globales */}
      {historial.cambios && historial.cambios.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            Línea de tiempo de cambios
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historial.cambios.map((cambio, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${getTipoColor(cambio.tipo_cambio).replace('bg-', 'bg-').replace('text-', '')}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{cambio.campo}</span>
                    <span className="text-xs text-gray-400">
                      v{cambio.version_anterior} → v{cambio.version_nueva}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(cambio.fecha_cambio)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default HistorialView

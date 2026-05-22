import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Building2, Calendar, RefreshCw, Eye, Loader2, Edit2, Download, History, ChevronLeft, ChevronRight, X, ChevronDown, BarChart3, CheckCircle2, Star, Shield, Search, Globe, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

function EmpresasList({ onSelectEmpresa, onSelectFromModal, initialDetailId, onClearInitialDetail }) {
      const cleanDisplayRazonSocial = (value) => {
        const text = String(value || '').trim()
        if (!text) return ''
        return text
          .replace(/\s+(?:R\.?\s*N\.?\s*C\.?|R\.?\s*U\.?\s*C\.?|C\.?\s*U\.?\s*I\.?\s*T\.?|C(?:[EÉ]D(?:ULA)?)?\.?\s*JUR[IÍ]DICA|C\.?\s*J\.?)(?:\s*(?:NRO\.?|NO\.?|Nº|N°|N))?\.?\s*$/i, '')
          .trim()
      }

    const inferDisplayedTaxType = (empresa) => {
      const tipo = (empresa?.tipo_identificacion || '').toUpperCase()
      const digits = (empresa?.cuit || '').replace(/\D/g, '')

      if (tipo !== 'CUIT') return tipo
      if (digits.length === 12) return 'RUT'
      if (digits.length === 11) return 'CUIT'
      if (digits.length === 9 || digits.length === 10) return 'NIT'
      return 'ID'
    }

  const { hasPermission, isAdmin, user } = useAuth()
  const canSeeBalanceGeneralBadge = ['admin', 'analista'].includes((user?.rol || '').toLowerCase())
  const canSeeScoring = isAdmin && hasPermission('ver_scoring')
  const canSeeAfipData = hasPermission('ver_afip')
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEmpresa, setSelectedEmpresa] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [openPdfDropdown, setOpenPdfDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPais, setFilterPais] = useState('')
  const dropdownRef = useRef(null)
  const ITEMS_PER_PAGE = 5

  const fetchEmpresas = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/empresas')
      if (response.data.success) {
        setEmpresas(response.data.empresas)
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al cargar empresas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  // Reabrir modal si hay initialDetailId (al volver de editar/historial)
  useEffect(() => {
    if (initialDetailId && empresas.length > 0 && !selectedEmpresa) {
      const empresa = empresas.find(e => e.id === initialDetailId)
      if (empresa) {
        viewDetail(empresa)
      }
    }
  }, [initialDetailId, empresas])

  // Cerrar dropdown de PDF al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenPdfDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const goToPage = (page) => {
    if (page >= 1 && page <= filteredTotalPages) {
      setCurrentPage(page)
    }
  }

  const viewDetail = async (empresa) => {
    setLoadingDetail(true)
    try {
      const response = await axios.get(`/api/empresas/${empresa.id}`)
      if (response.data.success) {
        setSelectedEmpresa(response.data.empresa)
      }
    } catch (err) {
      toast.error('Error al cargar detalle')
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeModal = () => {
    setSelectedEmpresa(null)
    // Limpiar el initialDetailId cuando el usuario cierra manualmente
    if (onClearInitialDetail) {
      onClearInitialDetail()
    }
  }

  const handleEdit = (empresa) => {
    setSelectedEmpresa(null)
    // Usar onSelectFromModal para que al volver se reabra el modal
    if (onSelectFromModal) {
      onSelectFromModal(empresa.id, 'edit', empresa.cuit)
    } else if (onSelectEmpresa) {
      onSelectEmpresa(empresa.id, 'edit', empresa.cuit)
    }
  }

  const handleHistorial = (empresa) => {
    setSelectedEmpresa(null)
    // Usar onSelectFromModal para que al volver se reabra el modal
    if (onSelectFromModal) {
      onSelectFromModal(empresa.id, 'historial', empresa.cuit)
    } else if (onSelectEmpresa) {
      onSelectEmpresa(empresa.id, 'historial', empresa.cuit)
    }
  }

  const handleDownloadPDF = async (empresa, lang = 'es') => {
    try {
      setOpenPdfDropdown(false)
      const langLabel = lang === 'en' ? 'inglés' : lang === 'de' ? 'alemán' : 'español'
      toast.loading(`Generando PDF en ${langLabel}...`, { id: 'pdf-download' })
      
      const response = await axios.get(`/api/empresas/${empresa.id}/pdf?lang=${lang}`, {
        responseType: 'blob'
      })
      
      // Crear URL y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Nombre del archivo desde headers o usar nombre por defecto
      const contentDisposition = response.headers['content-disposition']
      let filename = `Informe_${empresa.razon_social || 'empresa'}.pdf`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF descargado correctamente', { id: 'pdf-download' })
    } catch (err) {
      console.error('Error descargando PDF:', err)
      if (err.response?.status !== 403) toast.error('Error al generar el PDF', { id: 'pdf-download' })
      else toast.dismiss('pdf-download')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-AR')
  }

  const formatCuit = (cuit) => {
    if (!cuit) return ''
    const clean = cuit.replace(/\D/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`
    }
    return cuit
  }

  const TIPO_TO_CURRENCY = {
    CUIT: 'ARS', RUC: 'PEN', RUT: 'UYU', NIT: 'COP', RFC: 'MXN',
    CNPJ: 'BRL', HRB: 'EUR', EIN: 'USD', RNC: 'DOP', DPI: 'GTQ',
    'CEDULA JURIDICA': 'CRC',
  }

  const formatCurrency = (amount, empresa) => {
    if (!amount) return '-'
    const tipo = inferDisplayedTaxType(empresa || {})
    const cur = TIPO_TO_CURRENCY[tipo] || 'USD'
    const locale = cur === 'EUR' ? 'de-DE' : 'es-AR'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur
    }).format(amount)
  }

  const resolvePais = (empresa) => {
    const tipo = inferDisplayedTaxType(empresa)
    const digits = (empresa?.cuit || '').replace(/\D/g, '')

    const contentText = [
      empresa?.pais,
      empresa?.domicilio,
      empresa?.domicilio_legal,
      empresa?.domicilio_operativo,
      empresa?.direccion,
      empresa?.ciudad,
      empresa?.provincia,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (contentText.includes('uruguay') || contentText.includes('montevideo') || contentText.includes('republica oriental')) return 'Uruguay'
    if (contentText.includes('peru') || contentText.includes('lima') || contentText.includes('republica del peru')) return 'Peru'

    if (tipo === 'CUIT' && digits.length === 12) return 'Uruguay'
    const tipoToPais = {
      CUIT: 'Argentina',
      RUT: 'Uruguay',
      RNC: 'Rep. Dominicana',
      NIT: 'Colombia',
      RUC: 'Peru',
      RTN: 'Honduras',
      RFC: 'Mexico',
      'CEDULA JURIDICA': 'Costa Rica',
      VAT: 'Union Europea',
      'TAXPAYER ID': 'Internacional',
      ID: 'Internacional',
    }
    return tipoToPais[tipo] || null
  }

  const resolveTaxIdLabel = (empresa) => {
    if (resolvePais(empresa) === 'Uruguay') return 'RUT'
    return inferDisplayedTaxType(empresa) || 'ID'
  }

  const isUruguayRutValidated = (empresa) => {
    if (resolvePais(empresa) !== 'Uruguay') return false

    const digits = (empresa?.cuit || '').replace(/\D/g, '')
    if (digits.length === 9) return /^\d{9}$/.test(digits)
    if (digits.length !== 12 || !/^\d{12}$/.test(digits)) return false

    const controlDigit = Number.parseInt(digits.slice(11), 10)
    const rest = digits.slice(0, 11)
    let total = 0
    let factor = 2
    for (let index = 10; index >= 0; index -= 1) {
      total += factor * Number.parseInt(rest[index], 10)
      factor = factor === 9 ? 2 : factor + 1
    }
    let validatorDigit = 11 - (total % 11)
    if (validatorDigit === 11) validatorDigit = 0
    else if (validatorDigit === 10) validatorDigit = 1
    return validatorDigit === controlDigit
  }

  const isArgentinaCuitValidated = (empresa) => {
    if (inferDisplayedTaxType(empresa) !== 'CUIT') return false
    if (resolvePais(empresa) !== 'Argentina') return false

    const digits = (empresa?.cuit || '').replace(/\D/g, '')
    if (!/^\d{11}$/.test(digits)) return false

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const total = multipliers.reduce((sum, multiplier, index) => {
      return sum + Number.parseInt(digits[index], 10) * multiplier
    }, 0)

    const remainder = 11 - (total % 11)
    const expectedDigit = remainder === 11 ? 0 : (remainder === 10 ? 9 : remainder)
    if (Number.parseInt(digits[10], 10) === expectedDigit) return true

    const allowedPrefixes = new Set(['20', '23', '24', '27', '30', '33', '34'])
    return allowedPrefixes.has(digits.slice(0, 2))
  }

  const getArgentinaAfipValidation = (empresa) => {
    if (resolvePais(empresa) !== 'Argentina') return null
    const validation = empresa?.afip_validation
    if (!validation?.has_validation) return null
    return validation
  }

  // Filtrar empresas
  const filteredEmpresas = empresas.filter((emp) => {
    const term = searchTerm.toLowerCase().trim()
    if (term) {
      const razon = (emp.razon_social || '').toLowerCase()
      const cuit = (emp.cuit || '').toLowerCase()
      if (!razon.includes(term) && !cuit.includes(term)) return false
    }
    if (filterPais) {
      const pais = resolvePais(emp)
      if (pais !== filterPais) return false
    }
    return true
  })

  // Obtener lista de países únicos
  const paisesDisponibles = [...new Set(empresas.map(e => resolvePais(e)).filter(Boolean))].sort()

  // Recalcular paginación con filtros
  const filteredTotalPages = Math.ceil(filteredEmpresas.length / ITEMS_PER_PAGE)
  const filteredStartIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const filteredEndIndex = filteredStartIndex + ITEMS_PER_PAGE
  const filteredCurrentEmpresas = filteredEmpresas.slice(filteredStartIndex, filteredEndIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Cargando empresas...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Registros Guardados</h2>
          <p className="text-sm text-gray-600">{empresas.length} empresas en la base de datos</p>
        </div>
        <button
          onClick={fetchEmpresas}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por razón social o CUIT..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setCurrentPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative sm:w-52">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterPais}
            onChange={(e) => { setFilterPais(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
          >
            <option value="">Todos los países</option>
            {paisesDisponibles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {(searchTerm || filterPais) && (
          <div className="flex items-center text-sm text-gray-500">
            {filteredEmpresas.length} resultado{filteredEmpresas.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {empresas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-6 sm:p-12 text-center">
          <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros</h3>
          <p className="text-gray-500">Sube un PDF para comenzar a extraer datos</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {filteredCurrentEmpresas.map((empresa) => {
              const taxIdLabel = resolveTaxIdLabel(empresa)
              const rutUruguayValidado = isUruguayRutValidated(empresa)
              const cuitArgentinoValidado = isArgentinaCuitValidated(empresa)
              const afipValidation = getArgentinaAfipValidation(empresa)
              const hasBalanceGeneral = canSeeBalanceGeneralBadge && Boolean(empresa.has_balance_general)

              return (
              <div
                key={empresa.id}
                className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start space-x-3 sm:space-x-4 min-w-0">
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                      <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                        {cleanDisplayRazonSocial(empresa.razon_social) || 'Sin razón social'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {taxIdLabel}: {formatCuit(empresa.cuit) || 'No disponible'}
                      </p>
                      {rutUruguayValidado && (
                        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Star className="h-3 w-3 fill-current" />
                          RUT validado
                        </div>
                      )}
                      {canSeeAfipData && afipValidation?.is_successful && (
                        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          <Shield className="h-3 w-3" />
                          Validado AFIP
                        </div>
                      )}
                      {cuitArgentinoValidado && (
                        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="h-3 w-3" />
                          CUIT verificado
                        </div>
                      )}
                      {hasBalanceGeneral && (
                        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Balance General
                        </div>
                      )}
                      {empresa.cotiza_bolsa && (
                        <div className="inline-flex items-center gap-1.5 mt-2 ml-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <TrendingUp className="h-3 w-3" />
                          BYMA
                        </div>
                      )}
                      {empresa.actividad_principal && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                          {empresa.actividad_principal}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 sm:mt-3 text-xs text-gray-400">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Informe: {formatDate(empresa.fecha_informe)}
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span>Guardado: {formatDate(empresa.created_at)}</span>
                        {empresa.version > 1 && (
                          <>
                            <span className="hidden sm:inline">|</span>
                            <span className="text-purple-500 font-medium">Versión {empresa.version}</span>
                          </>
                        )}
                      </div>
                      {canSeeScoring && (
                        <>
                          {empresa.scoring ? (
                            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Con Score
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                              <BarChart3 className="h-3 w-3" />
                              Sin scoring
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => viewDetail(empresa)}
                    className="btn-secondary flex items-center text-sm w-full sm:w-auto justify-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver detalle
                  </button>
                </div>
              </div>
            )})}
          </div>

          {/* Paginación */}
          {filteredTotalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-white rounded-lg shadow-sm border px-4 sm:px-6 py-3 sm:py-4 gap-3">
              <div className="text-sm text-gray-600">
                Mostrando {filteredStartIndex + 1} - {Math.min(filteredEndIndex, filteredEmpresas.length)} de {filteredEmpresas.length}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Números de página */}
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {(() => {
                    const pages = []
                    const delta = window.innerWidth < 640 ? 1 : 2 // menos páginas en mobile
                    const left = Math.max(2, currentPage - delta)
                    const right = Math.min(filteredTotalPages - 1, currentPage + delta)

                    // Siempre mostrar página 1
                    pages.push(1)

                    // Elipsis izquierda
                    if (left > 2) pages.push('...')

                    // Páginas centrales
                    for (let i = left; i <= right; i++) {
                      pages.push(i)
                    }

                    // Elipsis derecha
                    if (right < filteredTotalPages - 1) pages.push('...')

                    // Siempre mostrar última página
                    if (filteredTotalPages > 1) pages.push(filteredTotalPages)

                    return pages.map((page, idx) =>
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="min-w-[36px] h-9 flex items-center justify-center text-gray-400 text-sm">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`min-w-[36px] h-9 rounded-lg font-medium text-sm transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )
                  })()}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === filteredTotalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === filteredTotalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalle */}
      {selectedEmpresa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b bg-gray-50">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {cleanDisplayRazonSocial(selectedEmpresa.razon_social)}
                  </h3>
                  <p className="text-sm text-gray-500">{resolveTaxIdLabel(selectedEmpresa)}: {formatCuit(selectedEmpresa.cuit)}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Datos Principales */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Datos Principales</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Actividad Principal</dt>
                      <dd className="text-sm">{selectedEmpresa.actividad_principal || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Forma Legal</dt>
                      <dd className="text-sm">{selectedEmpresa.forma_legal || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Capital Social</dt>
                      <dd className="text-sm">{formatCurrency(selectedEmpresa.capital_social, selectedEmpresa)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Duración</dt>
                      <dd className="text-sm">{selectedEmpresa.duracion_anios || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Cierre Ejercicio</dt>
                      <dd className="text-sm">{selectedEmpresa.cierre_ejercicio || '-'}</dd>
                    </div>
                  </dl>
                </div>
                
                {/* Contacto */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Contacto</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Domicilio</dt>
                      <dd className="text-sm">{selectedEmpresa.domicilio || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Teléfono</dt>
                      <dd className="text-sm">
                        {selectedEmpresa.telefono_1 || '-'}
                        {selectedEmpresa.telefono_2 && ` / ${selectedEmpresa.telefono_2}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Email</dt>
                      <dd className="text-sm">{selectedEmpresa.email || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Sinopsis */}
              {selectedEmpresa.sinopsis && (
                <div className="mt-6 overflow-hidden">
                  <h4 className="font-semibold text-gray-900 mb-2">Sinopsis</h4>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 sm:p-4 rounded-lg prose prose-sm max-w-none break-words overflow-wrap-anywhere [&>*]:max-w-full [&_p]:break-words [&_strong]:break-words"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: selectedEmpresa.sinopsis }}
                  />
                </div>
              )}
              
              {/* Conclusión */}
              {selectedEmpresa.conclusion && (
                <div className="mt-6 overflow-hidden">
                  <h4 className="font-semibold text-gray-900 mb-2">Conclusión</h4>
                  <div className="text-sm text-gray-700 bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 prose prose-sm max-w-none break-words"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: selectedEmpresa.conclusion }}
                  />
                </div>
              )}
            </div>
            
            {/* Botones de acción */}
            <div className="p-3 sm:p-4 border-t bg-gray-50 flex flex-wrap gap-2 sm:gap-3">
              {hasPermission('editar') && (
              <button
                onClick={() => handleEdit(selectedEmpresa)}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-xs sm:text-sm"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </button>
              )}
              {hasPermission('descargar_pdf') && (
              <div className="flex-1 relative" ref={dropdownRef}>
                <button
                  onClick={() => setOpenPdfDropdown(!openPdfDropdown)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  <Download className="h-4 w-4" />
                  PDF
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {openPdfDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
                    <button
                      onClick={() => handleDownloadPDF(selectedEmpresa, 'es')}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm"
                    >
                      <span className="text-base">ES</span>
                      Español
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(selectedEmpresa, 'en')}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-t"
                    >
                      <span className="text-base">EN</span>
                      English
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(selectedEmpresa, 'de')}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm border-t"
                    >
                      <span className="text-base">DE</span>
                      Deutsch
                    </button>
                  </div>
                )}
              </div>
              )}
              {hasPermission('historial') && (
              <button
                onClick={() => handleHistorial(selectedEmpresa)}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span><span className="sm:hidden">Hist.</span> {selectedEmpresa.version > 1 && `(v${selectedEmpresa.version})`}
              </button>
              )}
              <button
                onClick={closeModal}
                className="px-4 sm:px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-xs sm:text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmpresasList

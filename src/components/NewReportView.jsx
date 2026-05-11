import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Globe, Loader2, CheckCircle, XCircle, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'

const COUNTRY_FLAGS = {
  AR: '🇦🇷', UY: '🇺🇾', CR: '🇨🇷', GT: '🇬🇹', CO: '🇨🇴',
  PE: '🇵🇪', EC: '🇪🇨', PA: '🇵🇦', NI: '🇳🇮', DO: '🇩🇴',
  CL: '🇨🇱', SV: '🇸🇻', DE: '🇩🇪', US: '🇺🇸', BR: '🇧🇷',
  MX: '🇲🇽', HN: '🇭🇳', BO: '🇧🇴', PY: '🇵🇾', VE: '🇻🇪',
}

const PAISES_CON_VALIDACION = new Set(['AR'])

function quickFormatCheck(taxId, tipo) {
  if (!taxId) return { valid: false, error: 'Requerido' }
  const clean = taxId.replace(/[-.\s/]/g, '')
  if (!clean) return { valid: false, error: 'Requerido' }
  if (tipo === 'CUIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 11) return { valid: false, error: 'Debe tener 11 dígitos' }
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const suma = mult.reduce((s, m, i) => s + parseInt(clean[i]) * m, 0)
    const resto = 11 - (suma % 11)
    const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto
    if (parseInt(clean[10]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RUT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 12) return { valid: false, error: 'Debe tener 12 dígitos' }
    const rest = clean.slice(0, 11)
    let total = 0, factor = 2
    for (let i = 10; i >= 0; i--) {
      total += factor * parseInt(rest[i])
      factor = factor === 9 ? 2 : factor + 1
    }
    let dv = 11 - (total % 11)
    if (dv === 11) dv = 0
    else if (dv === 10) dv = 1
    if (parseInt(clean[11]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'NIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (clean.length < 4 || clean.length > 20) return { valid: false, error: '4-20 caracteres' }
  return { valid: true }
}

function autoFormatTaxId(value, tipo) {
  const digits = value.replace(/\D/g, '')
  if (tipo === 'CUIT') {
    if (digits.length <= 2) return digits
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`
  }
  if (tipo === 'CNPJ') {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
  }
  if (tipo === 'RUT') {
    return digits.slice(0, 12)
  }
  if (tipo === 'RUC') {
    return digits.slice(0, 11)
  }
  if (tipo === 'RNC') {
    if (digits.length <= 9) return digits.slice(0, 9)
    return digits.slice(0, 11)
  }
  if (tipo === 'NIT') {
    return digits.slice(0, 10)
  }
  return value
}

export default function NewReportView({ onCreated, onBack, onEditExisting }) {
  const [paises, setPaises] = useState([])
  const [loadingPaises, setLoadingPaises] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryRef = useRef(null)

  const [taxId, setTaxId] = useState('')
  const [formatError, setFormatError] = useState(null)

  // Validación y datos AFIP
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)
  const [afipData, setAfipData] = useState(null)
  const [existsInDb, setExistsInDb] = useState(null)
  const [creating, setCreating] = useState(false)

  const taxIdRef = useRef(null)
  const validateTimerRef = useRef(null)

  useEffect(() => {
    loadPaises()
  }, [])

  // Cerrar dropdown país al clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadPaises = async () => {
    try {
      const res = await axios.get('/api/country-patterns')
      if (res.data.paises) setPaises(res.data.paises)
    } catch {
      toast.error('Error al cargar países')
    } finally {
      setLoadingPaises(false)
    }
  }

  const handleCountryChange = (codigo) => {
    const pais = paises.find(p => p.codigo_pais === codigo) || null
    setSelectedCountry(pais)
    setTaxId('')
    setFormatError(null)
    setValidated(false)
    setAfipData(null)
    setExistsInDb(null)
    setTimeout(() => taxIdRef.current?.focus(), 100)
  }

  const handleTaxIdChange = (value) => {
    if (!selectedCountry) return
    const tipo = selectedCountry.tipo_id_fiscal
    const formatted = autoFormatTaxId(value, tipo)
    setTaxId(formatted)
    setValidated(false)
    setAfipData(null)
    setExistsInDb(null)

    if (formatted.trim()) {
      const result = quickFormatCheck(formatted, tipo)
      setFormatError(result.valid ? null : result.error)
      if (result.valid) {
        if (validateTimerRef.current) clearTimeout(validateTimerRef.current)
        validateTimerRef.current = setTimeout(() => {
          handleValidate(formatted)
        }, 500)
      }
    } else {
      setFormatError(null)
    }
  }

  const handleValidate = async (id) => {
    const taxIdValue = id || taxId
    if (!selectedCountry) return
    const check = quickFormatCheck(taxIdValue, selectedCountry.tipo_id_fiscal)
    if (!check.valid) return

    setValidating(true)
    setExistsInDb(null)
    setAfipData(null)

    try {
      // 1. Verificar si ya existe en BD
      const checkRes = await axios.get(`/api/check-cuit/${encodeURIComponent(taxIdValue.trim())}`)
      if (checkRes.data.exists && checkRes.data.empresa) {
        setExistsInDb(checkRes.data.empresa)
        setValidated(true)
        setValidating(false)
        return
      }

      // 2. Si el país tiene validación externa, consultar fuente oficial
      if (PAISES_CON_VALIDACION.has(selectedCountry.codigo_pais)) {
        try {
          const tipoParam = selectedCountry.tipo_id_fiscal || 'CUIT'
          const res = await axios.get(`/api/validar-cuit-nuevo/${encodeURIComponent(taxIdValue.trim())}?tipo=${tipoParam}`)
          if (res.data.success && res.data.datos) {
            setAfipData(res.data.datos)
          }
        } catch {
          // Validación externa falló — se continúa sin datos
        }
      }
      setValidated(true)
    } catch {
      setValidated(true)
    } finally {
      setValidating(false)
    }
  }

  // Crear registro y abrir DataEditor directamente
  const handleContinue = async () => {
    if (!selectedCountry || !taxId.trim()) return

    // Si ya existe, abrir para editar
    if (existsInDb) {
      onEditExisting(existsInDb.id, taxId.trim())
      return
    }

    setCreating(true)
    try {
      const saveData = {
        tipo_identificacion: selectedCountry.tipo_id_fiscal || 'CUIT',
        cuit: taxId.trim(),
        razon_social: afipData?.razon_social || '',
        domicilio: afipData?.domicilio || '',
        actividad_principal: afipData?.actividad_principal || '',
        ingresos_brutos: afipData?.ingresos_brutos || '',
      }
      const res = await axios.post('/api/save', saveData)
      if (res.data.success && res.data.id) {
        onCreated(res.data.id, taxId.trim(), {
          ...selectedCountry,
          afipData: {
            cuit: taxId.trim(),
            razon_social: afipData?.razon_social || '',
            domicilio: afipData?.domicilio || '',
            actividad_principal: afipData?.actividad_principal || '',
            ingresos_brutos: afipData?.ingresos_brutos || '',
            fecha_contrato_social: afipData?.fecha_contrato_social || '',
            estado_afip: afipData?.estado || '',
            _afip_validated: !!(afipData?.razon_social),
          }
        })
      } else {
        toast.error('Error al crear informe')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setCreating(false)
    }
  }

  const tipoId = selectedCountry?.tipo_id_fiscal || 'ID'
  const formatoId = selectedCountry?.formato_id || ''
  const formEnabled = !!selectedCountry
  const canContinue = validated && taxId.trim() && !validating && !creating

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nuevo Informe</h1>
            <p className="text-sm text-gray-500">Selecciona un país e ingresa el identificador fiscal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Selector de País */}
          <div className="p-5 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Globe className="h-4 w-4 inline mr-1.5 text-blue-600" />
              País
            </label>
            {loadingPaises ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando países...
              </div>
            ) : (
              <div className="relative w-full sm:w-96" ref={countryRef}>
                <button
                  type="button"
                  onClick={() => { setCountryDropdownOpen(!countryDropdownOpen); setCountrySearch('') }}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 transition-colors bg-white flex items-center justify-between"
                >
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{COUNTRY_FLAGS[selectedCountry.codigo_pais] || '🏳️'}</span>
                      <span>{selectedCountry.nombre_pais} — {selectedCountry.tipo_id_fiscal}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Selecciona un país para comenzar...</span>
                  )}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {countryDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden">
                    <div className="p-2 border-b">
                      <input
                        type="text"
                        placeholder="Buscar país..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto max-h-56">
                      {paises
                        .filter(p => !countrySearch || p.nombre_pais.toLowerCase().includes(countrySearch.toLowerCase()) || p.codigo_pais.toLowerCase().includes(countrySearch.toLowerCase()))
                        .map(p => (
                        <button
                          key={p.codigo_pais}
                          type="button"
                          onClick={() => { handleCountryChange(p.codigo_pais); setCountryDropdownOpen(false) }}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${selectedCountry?.codigo_pais === p.codigo_pais ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <span className="text-xl leading-none">{COUNTRY_FLAGS[p.codigo_pais] || '🏳️'}</span>
                          <span className="text-sm">
                            <span className="text-gray-400 font-mono text-xs mr-1">{p.codigo_pais}</span>
                            {p.nombre_pais} — <span className="text-blue-600">{p.tipo_id_fiscal}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ID Fiscal */}
          <div className={`p-5 sm:p-6 space-y-4 ${!formEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tipoId} <span className="text-red-500">*</span>
                {formatoId && <span className="text-xs text-gray-400 ml-2">Formato: {formatoId}</span>}
              </label>
              <div className="relative">
                <input
                  ref={taxIdRef}
                  type="text"
                  value={taxId}
                  onChange={(e) => handleTaxIdChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canContinue && handleContinue()}
                  placeholder={formatoId || 'Ingresa el identificador fiscal'}
                  disabled={!formEnabled}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-mono focus:outline-none transition-colors ${
                    formatError ? 'border-red-400 bg-red-50' :
                    validated ? 'border-green-400 bg-green-50' :
                    'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {validating && (
                  <Loader2 className="absolute right-3 top-3.5 h-5 w-5 text-blue-500 animate-spin" />
                )}
                {validated && !validating && !existsInDb && (
                  <CheckCircle className="absolute right-3 top-3.5 h-5 w-5 text-green-500" />
                )}
              </div>
              {formatError && (
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <XCircle className="h-3 w-3 mr-1" /> {formatError}
                </p>
              )}
              {validating && (
                <p className="text-xs text-blue-600 flex items-center mt-1.5">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Consultando registro oficial...
                </p>
              )}
            </div>

            {/* Ya existe en BD */}
            {existsInDb && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
                <p className="text-sm text-amber-800 font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Este {tipoId} ya tiene un informe en la base de datos
                </p>
                <p className="text-sm text-amber-700 mt-1 ml-6">
                  <strong>{existsInDb.razon_social}</strong>
                  {existsInDb.actividad_principal && <span className="text-amber-600"> — {existsInDb.actividad_principal}</span>}
                </p>
              </div>
            )}

            {/* Datos encontrados en AFIP */}
            {validated && !existsInDb && afipData?.razon_social && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-1.5">
                <p className="text-sm text-green-800 font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Datos encontrados
                </p>
                <div className="ml-6 text-sm text-gray-700 space-y-0.5">
                  <p><span className="text-gray-500">Razón Social:</span> <strong>{afipData.razon_social}</strong></p>
                  {afipData.actividad_principal && <p><span className="text-gray-500">Actividad:</span> {afipData.actividad_principal}</p>}
                  {afipData.domicilio && <p><span className="text-gray-500">Domicilio:</span> {afipData.domicilio}</p>}
                  {afipData.estado && (
                    <p><span className="text-gray-500">Estado:</span>{' '}
                      <span className={afipData.estado_activo ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>{afipData.estado}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sin datos AFIP pero formato válido */}
            {validated && !existsInDb && !afipData?.razon_social && PAISES_CON_VALIDACION.has(selectedCountry?.codigo_pais) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                No se encontraron datos en el registro oficial. Se creará el informe para completar manualmente.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row items-center gap-3 justify-between">
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : existsInDb ? (
                <>Abrir informe existente <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Continuar al editor <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

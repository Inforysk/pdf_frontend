import { useState, useEffect } from 'react'
import axios from 'axios'
import { Globe, Loader2, X, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react'

const COUNTRY_FLAGS = {
  AR: '🇦🇷', UY: '🇺🇾', CR: '🇨🇷', GT: '🇬🇹', CO: '🇨🇴',
  PE: '🇵🇪', EC: '🇪🇨', PA: '🇵🇦', NI: '🇳🇮', DO: '🇩🇴',
  CL: '🇨🇱', SV: '🇸🇻', DE: '🇩🇪', US: '🇺🇸', BR: '🇧🇷',
  MX: '🇲🇽', HN: '🇭🇳', BO: '🇧🇴', PY: '🇵🇾', VE: '🇻🇪',
}

// Países con validación externa disponible
const PAISES_CON_VALIDACION = new Set(['AR'])

// Validación de formato local (misma lógica que DataEditor)
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
    // Validación dígito verificador módulo 11
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
  // Genérico
  if (clean.length < 4 || clean.length > 20) return { valid: false, error: '4-20 caracteres' }
  return { valid: true }
}

// Formatos de ID fiscal por tipo
function autoFormatTaxId(value, tipo) {
  const digits = value.replace(/\D/g, '')
  if (tipo === 'CUIT') {
    // Formato: XX-XXXXXXXX-X
    if (digits.length <= 2) return digits
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`
  }
  if (tipo === 'CNPJ') {
    // Formato: XX.XXX.XXX/XXXX-XX
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
  }
  if (tipo === 'RUT') {
    // Solo dígitos, máx 12
    return digits.slice(0, 12)
  }
  // Otros tipos: devolver tal cual
  return value
}

export default function CountrySelectModal({ onSelect, onClose }) {
  const [paises, setPaises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Paso 2: Ingreso de ID fiscal
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [taxId, setTaxId] = useState('')
  const [formatError, setFormatError] = useState(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null) // { success, datos, error }
  const [existsInDb, setExistsInDb] = useState(null) // { exists, empresa }

  useEffect(() => {
    loadPaises()
  }, [])

  const loadPaises = async () => {
    try {
      const res = await axios.get('/api/country-patterns')
      if (res.data.paises) {
        setPaises(res.data.paises)
      }
    } catch (err) {
      setError('Error al cargar países')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCountry = (pais) => {
    setSelectedCountry(pais)
    setTaxId('')
    setFormatError(null)
    setValidationResult(null)
    setExistsInDb(null)
  }

  const handleBackToCountries = () => {
    setSelectedCountry(null)
    setTaxId('')
    setFormatError(null)
    setValidationResult(null)
    setExistsInDb(null)
  }

  const handleTaxIdChange = (value) => {
    const tipo = selectedCountry.tipo_id_fiscal
    const formatted = autoFormatTaxId(value, tipo)
    setTaxId(formatted)
    setValidationResult(null)
    setExistsInDb(null)
    if (formatted.trim()) {
      const result = quickFormatCheck(formatted, tipo)
      setFormatError(result.valid ? null : result.error)
    } else {
      setFormatError(null)
    }
  }

  const handleValidate = async () => {
    const check = quickFormatCheck(taxId, selectedCountry.tipo_id_fiscal)
    if (!check.valid) {
      setFormatError(check.error)
      return
    }

    setValidating(true)
    setValidationResult(null)
    setExistsInDb(null)

    try {
      // 1. Verificar si ya existe en BD
      const checkRes = await axios.get(`/api/check-cuit/${encodeURIComponent(taxId.trim())}`)
      if (checkRes.data.exists && checkRes.data.empresa) {
        setExistsInDb(checkRes.data.empresa)
      }

      // 2. Si el país tiene validación externa (Argentina), validar con AFIP
      if (PAISES_CON_VALIDACION.has(selectedCountry.codigo_pais)) {
        const res = await axios.get(`/api/validar-cuit-nuevo/${encodeURIComponent(taxId.trim())}`)
        if (res.data.success) {
          setValidationResult({ success: true, datos: res.data.datos })
        } else {
          setValidationResult({ success: false, error: res.data.error || 'No se encontró en AFIP' })
        }
      } else {
        // Países sin validación externa — aceptar solo con formato válido
        setValidationResult({ success: true, datos: null })
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al validar'
      setValidationResult({ success: false, error: msg })
    } finally {
      setValidating(false)
    }
  }

  const handleAccept = () => {
    // Pasar país + datos AFIP al editor
    const afipData = validationResult?.datos || {}
    onSelect(selectedCountry, {
      cuit: taxId.trim(),
      razon_social: afipData.razon_social || '',
      domicilio: afipData.domicilio || '',
      actividad_principal: afipData.actividad_principal || '',
      ingresos_brutos: afipData.ingresos_brutos || '',
      fecha_contrato_social: afipData.fecha_contrato_social || '',
      estado_afip: afipData.estado || '',
      _afip_validated: !!afipData.razon_social,
      _existing_id: existsInDb?.id || null,
    })
  }

  const tipoId = selectedCountry?.tipo_id_fiscal || 'ID'
  const formatoId = selectedCountry?.formato_id || ''
  const canValidate = taxId.trim() && !formatError
  const canAccept = validationResult?.success

  // ── Paso 2: Ingresar ID fiscal ──
  if (selectedCountry) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <button onClick={handleBackToCountries} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-xl">{COUNTRY_FLAGS[selectedCountry.codigo_pais] || '🏳️'}</span>
              <h2 className="text-lg font-semibold text-gray-900">{selectedCountry.nombre_pais}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingresa el {tipoId} <span className="text-red-500">*</span>
              </label>
              {formatoId && (
                <p className="text-xs text-gray-400 mb-1.5">Formato: {formatoId}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => handleTaxIdChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canValidate && handleValidate()}
                  placeholder={`Ej: ${formatoId || '12345678901'}`}
                  className={`flex-1 field-input text-base ${
                    formatError ? 'border-red-400 bg-red-50' : ''
                  } ${taxId && !formatError ? 'border-green-400' : ''}`}
                  autoFocus
                />
                <button
                  onClick={handleValidate}
                  disabled={!canValidate || validating}
                  className="btn-primary flex items-center px-4 whitespace-nowrap disabled:opacity-50"
                >
                  {validating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1" />
                      Validar
                    </>
                  )}
                </button>
              </div>
              {formatError && (
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <XCircle className="h-3 w-3 mr-1" /> {formatError}
                </p>
              )}
              {taxId && !formatError && !validationResult && !validating && (
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Formato válido — presiona Validar
                </p>
              )}
            </div>

            {/* Existe en BD */}
            {existsInDb && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="text-sm text-amber-800 font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                  Ya existe en la base de datos
                </p>
                <p className="text-xs text-amber-700 mt-1 ml-5.5">
                  <strong>{existsInDb.razon_social}</strong>
                  {existsInDb.actividad_principal ? ` — ${existsInDb.actividad_principal}` : ''}
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5 ml-5.5">
                  Al aceptar, se abrirá el informe existente para editar.
                </p>
              </div>
            )}

            {/* Resultado validación AFIP */}
            {validationResult && validationResult.success && validationResult.datos && (
              <div className="p-3 bg-green-50 border border-green-300 rounded-lg space-y-2">
                <p className="text-sm text-green-800 font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Validado — datos encontrados
                </p>
                <div className="text-sm text-gray-700 space-y-1 ml-5.5">
                  {validationResult.datos.razon_social && (
                    <p><span className="text-gray-500">Razón Social:</span> <strong>{validationResult.datos.razon_social}</strong></p>
                  )}
                  {validationResult.datos.tipo_societario && (
                    <p><span className="text-gray-500">Tipo Societario:</span> {validationResult.datos.tipo_societario}</p>
                  )}
                  {validationResult.datos.actividad_principal && (
                    <p><span className="text-gray-500">Actividad:</span> {validationResult.datos.actividad_principal}</p>
                  )}
                  {validationResult.datos.otras_actividades && validationResult.datos.otras_actividades.length > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-500">Otras actividades:</span>
                      <ul className="list-disc list-inside ml-2 text-gray-600">
                        {validationResult.datos.otras_actividades.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.datos.domicilio_fiscal && (
                    <p><span className="text-gray-500">Domicilio Fiscal:</span> {validationResult.datos.domicilio_fiscal}</p>
                  )}
                  {validationResult.datos.domicilio_legal && (
                    <p><span className="text-gray-500">Domicilio Legal:</span> {validationResult.datos.domicilio_legal}</p>
                  )}
                  {validationResult.datos.fecha_contrato_social && (
                    <p><span className="text-gray-500">Fecha Contrato:</span> {validationResult.datos.fecha_contrato_social}</p>
                  )}
                  {validationResult.datos.estado && (
                    <p><span className="text-gray-500">Estado:</span> {validationResult.datos.estado}</p>
                  )}
                  {validationResult.datos.fuentes && validationResult.datos.fuentes.length > 0 && (
                    <p className="text-[10px] text-gray-400">Fuentes: {validationResult.datos.fuentes.join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Validación sin datos externos (otros países) */}
            {validationResult && validationResult.success && !validationResult.datos && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Formato válido — no hay validación externa para {selectedCountry.nombre_pais}
                </p>
              </div>
            )}

            {/* Error de validación */}
            {validationResult && !validationResult.success && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm text-red-700 flex items-center">
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {validationResult.error}
                </p>
                <p className="text-[10px] text-red-500 mt-1 ml-5.5">
                  Puedes continuar sin validación externa, pero los datos no serán pre-llenados.
                </p>
                {/* Permitir continuar sin AFIP */}
                <button
                  onClick={() => setValidationResult({ success: true, datos: null })}
                  className="mt-2 ml-5.5 text-xs text-red-600 underline hover:text-red-800"
                >
                  Continuar sin validación
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {canAccept && (
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleAccept}
                className="btn-primary w-full flex items-center justify-center py-2.5"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {existsInDb ? 'Aceptar y editar informe' : 'Aceptar y crear informe'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Paso 1: Selección de país ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Selecciona el país</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-500">Cargando países...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500">{error}</div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paises.map((pais) => (
                <button
                  key={pais.codigo_pais}
                  onClick={() => handleSelectCountry(pais)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-2xl">{COUNTRY_FLAGS[pais.codigo_pais] || '🏳️'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{pais.nombre_pais}</p>
                    <p className="text-xs text-gray-500">{pais.tipo_id_fiscal}{pais.formato_id ? ` · ${pais.formato_id}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && paises.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay países configurados</div>
          )}
        </div>
      </div>
    </div>
  )
}

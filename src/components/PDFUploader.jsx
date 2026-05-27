import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, AlertCircle, AlertTriangle, Info, ToggleLeft, ToggleRight, Globe } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function PDFUploader({ onDataExtracted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [pendingData, setPendingData] = useState(null)
  const [skipIdValidation, setSkipIdValidation] = useState(false)
  // Estado para selección de país cuando no hay ID fiscal
  const [countrySelection, setCountrySelection] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [pendingFile, setPendingFile] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    
    if (!file) return
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se permiten archivos PDF')
      return
    }

    setLoading(true)
    setError(null)
    setDuplicateWarning(null)
    setPendingData(null)
    setCountrySelection(null)
    setPendingFile(file) // Guardar archivo para posible reenvío

    const formData = new FormData()
    formData.append('file', file)
    formData.append('skip_id_validation', skipIdValidation ? 'true' : 'false')

    try {
      const response = await axios.post('/api/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        validateStatus: (status) => status < 500
      })

      if (response.status === 400) {
        setError(response.data.error || 'Error al procesar el PDF')
        toast.error('Error al procesar el PDF')
        return
      }

      if (response.data.success) {
        // Verificar si necesita selección de país (sin ID fiscal)
        if (response.data.needs_country_selection) {
          // Cargar países desde el endpoint dedicado
          let paisesLista = []
          try {
            const paisesRes = await axios.get('/api/paises')
            if (paisesRes.data.success) {
              paisesLista = paisesRes.data.paises || []
            }
          } catch (e) {
            console.error('Error cargando países:', e)
          }
          
          setCountrySelection({
            message: response.data.message,
            paises: paisesLista,
            data: response.data.data,
            filename: response.data.filename,
            idInfo: response.data.id_info
          })
          toast('Se requiere seleccionar país del informe', { icon: '🌍' })
          return
        }
        
        // Verificar si el CUIT ya existe
        if (response.data.cuit_exists && response.data.existing_empresa) {
          setDuplicateWarning({
            cuit: response.data.data.cuit,
            existing: response.data.existing_empresa,
            message: response.data.warning,
            changes: response.data.changes || [],
            hasChanges: response.data.has_changes
          })
          setPendingData({ data: response.data.data, filename: response.data.filename, sinopsisInfo: response.data.sinopsis_info })
          toast('CUIT ya registrado en la BD', { icon: '⚠️' })
        } else {
          if (response.data.sinopsis_info?.mejorado) {
            toast.success('Sinopsis estructurada automáticamente')
          }
          toast.success('PDF procesado correctamente')
          onDataExtracted(response.data.data, response.data.filename, response.data.sinopsis_info)
        }
      } else {
        setError(response.data.error || 'Error al procesar el PDF')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err.response?.data?.error || 'Error de conexión con el servidor')
      toast.error('Error al procesar el PDF')
    } finally {
      setLoading(false)
    }
  }, [onDataExtracted, skipIdValidation])

  const handleContinueAnyway = () => {
    if (pendingData) {
      onDataExtracted(pendingData.data, pendingData.filename, pendingData.sinopsisInfo)
      setDuplicateWarning(null)
      setPendingData(null)
    }
  }

  const handleCancel = () => {
    setDuplicateWarning(null)
    setPendingData(null)
  }

  // Manejar selección de país y reenviar
  const handleCountrySelect = async () => {
    if (!selectedCountry || !pendingFile) {
      toast.error('Selecciona un país')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', pendingFile)
    formData.append('skip_id_validation', 'true')
    formData.append('pais_codigo', selectedCountry)

    try {
      const response = await axios.post('/api/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: (status) => status < 500
      })

      if (response.data.success && !response.data.needs_country_selection) {
        toast.success('PDF procesado correctamente')
        onDataExtracted(response.data.data, response.data.filename, response.data.sinopsis_info)
        setCountrySelection(null)
        setSelectedCountry('')
        setPendingFile(null)
      } else {
        setError(response.data.error || 'Error al procesar el PDF')
        toast.error('Error al procesar')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión')
      toast.error('Error al procesar el PDF')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelCountrySelection = () => {
    setCountrySelection(null)
    setSelectedCountry('')
    setPendingFile(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: loading
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Subir Documento PDF
        </h2>
        <p className="text-gray-600">
          Arrastra un PDF societario o haz clic para seleccionarlo
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 sm:p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">Procesando PDF...</p>
            <p className="text-sm text-gray-500 mt-1">Extrayendo información del documento</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-blue-500 mb-4" />
            <p className="text-lg font-medium text-blue-600">Suelta el archivo aquí</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Arrastra un archivo PDF aquí
            </p>
            <p className="text-sm text-gray-500 mb-4">o</p>
            <button className="btn-primary">
              Seleccionar archivo
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Máximo 16MB - Solo archivos PDF
            </p>
          </div>
        )}
      </div>

      {/* Opción para omitir validación de ID fiscal */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <label className="flex items-center cursor-pointer">
          <button
            type="button"
            onClick={() => setSkipIdValidation(!skipIdValidation)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              skipIdValidation ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                skipIdValidation ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="ml-3 text-sm font-medium text-gray-700">
            Sin validación de ID fiscal
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500 ml-14">
          {skipIdValidation 
            ? '⚠️ Se extraerán datos sin requerir CUIT/RUC/RNC válido (para informes internacionales)'
            : 'Por defecto se requiere un ID fiscal válido (CUIT, RUC, RNC, RUT, etc.)'}
        </p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error al procesar</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Warning de CUIT duplicado con comparación de cambios */}
      {duplicateWarning && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                CUIT ya registrado en la Base de Datos
              </p>
              <p className="text-sm text-amber-700 mt-1">
                El CUIT <span className="font-mono font-bold">{duplicateWarning.cuit}</span> ya está asociado a un registro existente.
              </p>
              
              {duplicateWarning.existing && (
                <div className="mt-3 p-3 bg-white rounded border border-amber-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Registro existente:</p>
                  <p className="font-medium text-gray-900">{duplicateWarning.existing.razon_social}</p>
                  {duplicateWarning.existing.actividad_principal && (
                    <p className="text-sm text-gray-600">{duplicateWarning.existing.actividad_principal}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Versión actual: v{duplicateWarning.existing.version || 1} | 
                    Registrado: {duplicateWarning.existing.created_at ? new Date(duplicateWarning.existing.created_at).toLocaleDateString('es-AR') : 'N/A'}
                  </p>
                </div>
              )}

              {/* Mostrar cambios detectados */}
              {duplicateWarning.changes && duplicateWarning.changes.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">
                    Se detectaron {duplicateWarning.changes.length} cambios:
                  </p>
                  <div className="max-h-64 overflow-y-auto bg-white rounded border border-amber-200">
                    <table className="w-full text-xs">
                      <thead className="bg-amber-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-amber-900">Campo</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-amber-900">Valor Actual</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-amber-900">Nuevo Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {duplicateWarning.changes.map((change, idx) => (
                          <tr key={idx} className="hover:bg-amber-50">
                            <td className="px-2 py-1.5 font-medium text-gray-700">{change.label}</td>
                            <td className="px-2 py-1.5 text-red-600 line-through">{change.old}</td>
                            <td className="px-2 py-1.5 text-green-600 font-medium">{change.new}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {duplicateWarning.changes && duplicateWarning.changes.length === 0 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-700">
                    <Info className="inline h-4 w-4 mr-1" />
                    No se detectaron cambios. El PDF contiene la misma información.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleContinueAnyway}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  {duplicateWarning.changes?.length > 0 ? 'Actualizar (Nueva Versión)' : 'Continuar'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                {duplicateWarning.changes?.length > 0 
                  ? 'Si continúas, se creará una nueva versión del registro con los cambios detectados.'
                  : 'El documento no tiene cambios respecto al registro existente.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de país cuando no hay ID fiscal */}
      {countrySelection && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
          <div className="flex items-start">
            <Globe className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">
                Selección de País Requerida
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {countrySelection.message}
              </p>
              
              {/* Info del documento */}
              {countrySelection.data?.razon_social && (
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Empresa detectada:</p>
                  <p className="font-medium text-gray-900">{countrySelection.data.razon_social}</p>
                  {countrySelection.idInfo?.id_encontrado && (
                    <p className="text-sm text-gray-600 mt-1">
                      ID encontrado: <span className="font-mono">{countrySelection.idInfo.id_encontrado}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Selector de país */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona el país del informe:
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Seleccionar país --</option>
                  {countrySelection.paises.map((pais) => (
                    <option key={pais.codigo} value={pais.codigo}>
                      {pais.nombre} ({pais.tipo_identificacion || 'ID'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCountrySelect}
                  disabled={!selectedCountry || loading}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                    selectedCountry && !loading
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Procesando...' : 'Continuar con país seleccionado'}
                </button>
                <button
                  onClick={handleCancelCountrySelection}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                El país seleccionado determinará el tipo de identificación fiscal y la configuración de precios.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">¿Qué información se extrae?</h3>
        <ul className="grid grid-cols-2 gap-2 text-sm text-blue-800">
          <li>• Razón Social e ID Fiscal (CUIT/NIT/RUC/RNC/RUT/RTN)</li>
          <li>• Sinopsis completa</li>
          <li>• Objeto Social</li>
          <li>• Estructura Societaria</li>
          <li>• Composición del Capital</li>
          <li>• Datos de Directivos</li>
          <li>• Historia de la empresa</li>
          <li>• Situación Económica</li>
          <li>• Bienes de Uso</li>
          <li>• Evolución y Resultados</li>
          <li>• Relaciones Bancarias</li>
          <li>• Riesgo Crediticio</li>
          <li>• Conclusión</li>
          <li>• Y más...</li>
        </ul>
      </div>
    </div>
  )
}

export default PDFUploader

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Files,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

function BulkUploader({ onResultsChange }) {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [results, setResults] = useState({ success: [], warnings: [], failed: [] })
  const [showDetails, setShowDetails] = useState({ success: false, warnings: true, failed: true })
  
  // Notificar cambios de resultados al padre
  const updateResults = (newResults) => {
    setResults(newResults)
    if (onResultsChange) {
      onResultsChange(newResults)
    }
  }

  // Función para exportar reporte
  const exportReport = (format = 'json') => {
    const report = {
      fecha: new Date().toISOString(),
      resumen: {
        total: files.length,
        nuevos: results.success.length,
        actualizados: results.warnings.length,
        fallidos: results.failed.length
      },
      nuevos: results.success.map(item => ({
        archivo: item.filename,
        cuit: item.cuit,
        razon_social: item.razon_social,
        id: item.id
      })),
      actualizados: results.warnings.map(item => ({
        archivo: item.filename,
        cuit: item.cuit,
        razon_social: item.razon_social,
        id: item.id,
        cambios: item.changes || []
      })),
      fallidos: results.failed.map(item => ({
        archivo: item.filename,
        cuit: item.cuit || null,
        error: item.error
      }))
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_carga_${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte JSON descargado')
    } else {
      // CSV
      let csv = 'Estado,Archivo,Identificación,Razón Social,ID,Error,Cambios\n'
      
      results.success.forEach(item => {
        csv += `Nuevo,"${item.filename}","${item.cuit}","${item.razon_social || ''}",${item.id},,\n`
      })
      
      results.warnings.forEach(item => {
        const changes = item.changes?.map(c => `${c.label}: ${c.old} → ${c.new}`).join('; ') || ''
        csv += `Actualizado,"${item.filename}","${item.cuit}","${item.razon_social || ''}",${item.id},,"${changes}"\n`
      })
      
      results.failed.forEach(item => {
        csv += `Fallido,"${item.filename}","${item.cuit || ''}",,,\"${item.error}\",\n`
      })
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_carga_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte CSV descargado')
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    const pdfFiles = acceptedFiles.filter(f => 
      f.name.toLowerCase().endsWith('.pdf')
    )
    
    if (pdfFiles.length !== acceptedFiles.length) {
      toast.error('Algunos archivos no son PDF y fueron ignorados')
    }
    
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      const newFiles = pdfFiles.filter(f => !existingNames.has(f.name))
      return [...prev, ...newFiles]
    })
    
    // Reset results when adding new files
    updateResults({ success: [], warnings: [], failed: [] })
    setProgress(0)
  }, [onResultsChange])

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    updateResults({ success: [], warnings: [], failed: [] })
    setProgress(0)
  }

  const processFiles = async () => {
    if (files.length === 0) return

    setProcessing(true)
    setProgress(0)
    updateResults({ success: [], warnings: [], failed: [] })

    const successList = []
    const warningsList = []
    const failedList = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setCurrentFile(file.name)
      setProgress(Math.round(((i + 1) / files.length) * 100))

      let processed = false // Flag para asegurar que el archivo se registre

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Extraer datos del PDF
        let extractResponse
        try {
          extractResponse = await axios.post('/api/extract', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // 60 segundos por archivo
            validateStatus: () => true // Aceptar cualquier status para manejarlo manualmente
          })
        } catch (networkError) {
          failedList.push({
            filename: file.name,
            error: `Error de conexión: ${networkError.message}`
          })
          processed = true
        }

        if (!processed && extractResponse) {
          // Verificar si la extracción fue exitosa
          if (extractResponse.status >= 400) {
            failedList.push({
              filename: file.name,
              error: extractResponse.data?.error || `Error HTTP ${extractResponse.status}`
            })
            processed = true
          } else if (!extractResponse.data?.success) {
            failedList.push({
              filename: file.name,
              error: extractResponse.data?.error || 'Error al procesar PDF'
            })
            processed = true
          } else {
            // Extracción exitosa - verificar CUIT
            const cuit = extractResponse.data.data?.cuit
            if (!cuit) {
              failedList.push({
                filename: file.name,
                error: 'No se encontró identificación (CUIT/RNC/RUT/RTN) en el documento'
              })
              processed = true
            } else {
              // Tiene CUIT - intentar guardar
              const isDuplicate = extractResponse.data.cuit_exists
              const existingEmpresa = extractResponse.data.existing_empresa

              try {
                const saveResponse = await axios.post('/api/save', extractResponse.data.data, {
                  validateStatus: () => true,
                  timeout: 30000
                })

                if (saveResponse.data?.success) {
                  const resultItem = {
                    filename: file.name,
                    data: extractResponse.data.data,
                    id: saveResponse.data.id,
                    action: saveResponse.data.action,
                    cuit: cuit,
                    razon_social: extractResponse.data.data?.razon_social,
                    version: saveResponse.data.version || 1
                  }

                  // Si se creó una nueva versión (existía antes), va a warnings
                  if (saveResponse.data.action === 'updated' || saveResponse.data.action === 'versioned') {
                    warningsList.push({
                      ...resultItem,
                      existingEmpresa: existingEmpresa,
                      previousData: saveResponse.data.previous_data,
                      changes: saveResponse.data.changes || [],
                      message: `Identificación ya existía - Nueva versión creada (v${saveResponse.data.version || 2})`
                    })
                  } else if (saveResponse.data.action === 'no_changes') {
                    // Sin cambios detectados
                    warningsList.push({
                      ...resultItem,
                      message: `Sin cambios detectados - Registro sin modificar`,
                      changes: []
                    })
                  } else {
                    successList.push(resultItem)
                  }
                  processed = true
                } else {
                  failedList.push({
                    filename: file.name,
                    error: saveResponse.data?.error || 'Error al guardar en BD',
                    cuit: cuit,
                    razon_social: extractResponse.data.data?.razon_social
                  })
                  processed = true
                }
              } catch (saveError) {
                failedList.push({
                  filename: file.name,
                  error: `Error al guardar: ${saveError.message}`,
                  cuit: cuit
                })
                processed = true
              }
            }
          }
        }

        // Seguridad: si por alguna razón no se procesó, agregarlo a fallidos
        if (!processed) {
          failedList.push({
            filename: file.name,
            error: 'Error desconocido en procesamiento'
          })
        }

      } catch (err) {
        console.error(`Error processing ${file.name}:`, err)
        // Solo agregar si no se procesó antes
        if (!processed) {
          failedList.push({
            filename: file.name,
            error: err.response?.data?.error || err.message || 'Error desconocido'
          })
        }
      }

      // Actualizar resultados después de cada archivo
      updateResults({
        success: [...successList],
        warnings: [...warningsList],
        failed: [...failedList]
      })
    }

    setProgress(100)
    setCurrentFile('')
    setProcessing(false)

    // Notificaciones finales
    const totalSuccess = successList.length + warningsList.length
    if (totalSuccess > 0 && failedList.length === 0) {
      if (warningsList.length > 0) {
        toast.success(`${successList.length} nuevos, ${warningsList.length} actualizados`, { icon: '✅' })
      } else {
        toast.success(`${successList.length} archivos procesados correctamente`)
      }
    } else if (totalSuccess > 0 && failedList.length > 0) {
      toast(`${totalSuccess} procesados, ${failedList.length} fallidos`, { icon: '⚠️' })
    } else if (failedList.length > 0) {
      toast.error(`Todos los archivos fallaron (${failedList.length})`)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: processing
  })

  const totalFiles = files.length
  const processedCount = results.success.length + results.warnings.length + results.failed.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Subida Masiva de PDFs
        </h2>
        <p className="text-gray-600">
          Arrastra múltiples PDFs o haz clic para seleccionarlos
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-4 sm:p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${processing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Files className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Suelta los archivos aquí...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Arrastra PDFs aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-400">
              Sin límite de archivos - Procesa PDFs con diferentes estructuras
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && !processing && results.success.length === 0 && results.warnings.length === 0 && results.failed.length === 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              Archivos seleccionados ({files.length})
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Limpiar todo
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-700 truncate max-w-md">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {(processing || processedCount > 0) && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {processing ? 'Procesando...' : 'Completado'}
            </span>
            <span className="text-sm text-gray-500">
              {processedCount} / {totalFiles} archivos
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                processing 
                  ? 'bg-blue-500' 
                  : results.failed.length === 0 
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {processing && currentFile && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {currentFile}
                </span>
              )}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {!processing && (results.success.length > 0 || results.warnings.length > 0 || results.failed.length > 0) && (
        <div className="space-y-4">
          {/* Success List - Nuevos registros */}
          {results.success.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDetails(prev => ({ ...prev, success: !prev.success }))}
                className="w-full flex items-center justify-between p-4 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {results.success.length} archivos nuevos procesados correctamente
                  </span>
                </div>
                {showDetails.success ? (
                  <ChevronUp className="h-5 w-5 text-green-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-green-600" />
                )}
              </button>
              
              {showDetails.success && (
                <div className="border-t border-green-200 max-h-64 overflow-y-auto">
                  {results.success.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border-b border-green-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">{item.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-green-600">{item.cuit}</span>
                        <span className="text-green-700">{item.data?.razon_social || '-'}</span>
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                          Nuevo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings List - CUIT duplicados actualizados */}
          {results.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDetails(prev => ({ ...prev, warnings: !prev.warnings }))}
                className="w-full flex items-center justify-between p-4 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <span className="font-semibold text-amber-800">
                    {results.warnings.length} registros actualizados (identificación ya existía)
                  </span>
                </div>
                {showDetails.warnings ? (
                  <ChevronUp className="h-5 w-5 text-amber-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-amber-600" />
                )}
              </button>
              
              {showDetails.warnings && (
                <div className="border-t border-amber-200 max-h-96 overflow-y-auto">
                  {results.warnings.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border-b border-amber-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">{item.filename}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">
                          Actualizado
                        </span>
                      </div>
                      <div className="mt-1 ml-6 text-xs text-amber-700">
                        <span className="font-mono">{item.cuit}</span>
                        <span className="mx-2">•</span>
                        <span>{item.razon_social || '-'}</span>
                      </div>
                      
                      {/* Mostrar cambios específicos */}
                      {item.changes && item.changes.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1">
                          <p className="text-xs font-semibold text-amber-800">Campos modificados:</p>
                          {item.changes.map((change, ci) => (
                            <div key={ci} className="text-xs bg-white rounded p-2 border border-amber-200">
                              <span className="font-medium text-amber-900">{change.label}:</span>
                              {change.type === 'added' ? (
                                <span className="ml-1 text-green-600">+ {change.new}</span>
                              ) : change.type === 'removed' ? (
                                <span className="ml-1 text-red-600">- {change.old}</span>
                              ) : (
                                <div className="ml-2 mt-1">
                                  <div className="text-red-600 line-through">{change.old}</div>
                                  <div className="text-green-600">{change.new}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.changes && item.changes.length === 0 && (
                        <div className="mt-1 ml-6 text-xs text-amber-500 italic">
                          Sin cambios detectados en campos principales
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Failed List */}
          {results.failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDetails(prev => ({ ...prev, failed: !prev.failed }))}
                className="w-full flex items-center justify-between p-4 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="font-semibold text-red-800">
                    {results.failed.length} archivos con errores
                  </span>
                </div>
                {showDetails.failed ? (
                  <ChevronUp className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                )}
              </button>
              
              {showDetails.failed && (
                <div className="border-t border-red-200 max-h-64 overflow-y-auto">
                  {results.failed.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border-b border-red-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">
                          {item.filename}
                        </span>
                      </div>
                      <p className="text-xs text-red-600 ml-6">
                        {item.error}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 flex-wrap">
        {files.length > 0 && !processing && processedCount === 0 && (
          <button
            onClick={processFiles}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors font-medium"
          >
            <Play className="h-5 w-5" />
            Procesar {files.length} archivo{files.length !== 1 ? 's' : ''}
          </button>
        )}

        {!processing && processedCount > 0 && (
          <>
            <button
              onClick={() => {
                setFiles([])
                setResults({ success: [], warnings: [], failed: [] })
                setProgress(0)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg
                       hover:bg-gray-700 transition-colors font-medium"
            >
              <RotateCcw className="h-5 w-5" />
              Subir más archivos
            </button>
            
            {/* Botones de exportar */}
            <button
              onClick={() => exportReport('csv')}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 transition-colors font-medium"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Exportar CSV
            </button>
            <button
              onClick={() => exportReport('json')}
              className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 transition-colors font-medium"
            >
              <Download className="h-5 w-5" />
              Exportar JSON
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      {!processing && processedCount > 0 && (
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{totalFiles}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{results.success.length}</div>
            <div className="text-sm text-green-600">Nuevos</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{results.warnings.length}</div>
            <div className="text-sm text-amber-600">Actualizados</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{results.failed.length}</div>
            <div className="text-sm text-red-600">Fallidos</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkUploader

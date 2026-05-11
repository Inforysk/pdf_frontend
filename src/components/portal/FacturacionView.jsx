import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import {
  FileText, Download, Calendar, CreditCard, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Receipt, Clock, CheckCircle, DollarSign,
  AlertTriangle, Bell, XCircle
} from 'lucide-react'

const STATUS_MAP = {
  generada: { label: 'Generada', color: 'bg-blue-100 text-blue-700', icon: FileText },
  pagada: { label: 'Pagada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  vencida: { label: 'Vencida', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', ARS: '$', MXN: '$', COP: '$', PEN: 'S/', CLP: '$', UYU: '$', BRL: 'R$' }

export default function FacturacionView() {
  const { user } = useAuth()
  const isClienteAdmin = user?.rol === 'cliente_admin'
  
  const [facturas, setFacturas] = useState([])
  const [facturaActual, setFacturaActual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingActual, setLoadingActual] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(null)
  const [alertasVencimiento, setAlertasVencimiento] = useState([])
  const [resumenAlertas, setResumenAlertas] = useState(null)
  const [loadingAlertas, setLoadingAlertas] = useState(false)

  // Función para descargar PDF con autenticación
  const handleDownloadPdf = async (facturaId) => {
    setDownloadingPdf(facturaId)
    try {
      const response = await axios.get(`/api/portal/facturas/${facturaId}/pdf`, {
        responseType: 'blob'
      })
      
      // Crear blob y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura_${String(facturaId).padStart(8, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando PDF:', error)
      alert('Error al descargar el PDF. Intente nuevamente.')
    } finally {
      setDownloadingPdf(null)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadingActual(true)
    try {
      const [actualRes, histRes] = await Promise.allSettled([
        axios.get('/api/portal/factura'),
        axios.get('/api/portal/facturas')
      ])
      if (actualRes.status === 'fulfilled' && actualRes.value.data.success) {
        setFacturaActual(actualRes.value.data.factura)
      }
      if (histRes.status === 'fulfilled' && histRes.value.data.success) {
        setFacturas(histRes.value.data.facturas || [])
      }
      
      // Cargar alertas de vencimiento si es cliente_admin
      if (isClienteAdmin) {
        loadAlertasVencimiento()
      }
    } catch (err) { /* ignore */ }
    setLoading(false)
    setLoadingActual(false)
  }
  
  const loadAlertasVencimiento = async () => {
    setLoadingAlertas(true)
    try {
      const res = await axios.get('/api/portal/facturas/vencimientos')
      if (res.data.success) {
        setAlertasVencimiento(res.data.alertas || [])
        setResumenAlertas(res.data.resumen || null)
      }
    } catch (err) {
      console.error('Error cargando alertas:', err)
    }
    setLoadingAlertas(false)
  }

  const formatMoney = (v, currencyCode) => {
    const n = parseFloat(v) || 0
    const sym = CURRENCY_SYMBOLS[currencyCode] || '$'
    return `${sym}${n.toFixed(2)}`
  }

  const formatPeriodo = (p) => {
    if (!p) return '-'
    const [y, m] = p.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${meses[parseInt(m)-1] || m} ${y}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alertas de Vencimiento - Solo para cliente_admin */}
      {isClienteAdmin && alertasVencimiento.length > 0 && (
        <div className="space-y-3">
          {/* Resumen de alertas */}
          {resumenAlertas && (resumenAlertas.vencidas > 0 || resumenAlertas.criticas > 0 || resumenAlertas.altas > 0) && (
            <div className={`rounded-xl border p-4 ${
              resumenAlertas.vencidas > 0 || resumenAlertas.criticas > 0
                ? 'bg-red-50 border-red-200'
                : resumenAlertas.altas > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  resumenAlertas.vencidas > 0 || resumenAlertas.criticas > 0
                    ? 'bg-red-100'
                    : resumenAlertas.altas > 0
                      ? 'bg-amber-100'
                      : 'bg-blue-100'
                }`}>
                  <Bell className={`w-5 h-5 ${
                    resumenAlertas.vencidas > 0 || resumenAlertas.criticas > 0
                      ? 'text-red-600'
                      : resumenAlertas.altas > 0
                        ? 'text-amber-600'
                        : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    resumenAlertas.vencidas > 0 || resumenAlertas.criticas > 0
                      ? 'text-red-800'
                      : resumenAlertas.altas > 0
                        ? 'text-amber-800'
                        : 'text-blue-800'
                  }`}>
                    Alertas de Facturación
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {resumenAlertas.vencidas > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        {resumenAlertas.vencidas} vencida(s)
                      </span>
                    )}
                    {resumenAlertas.criticas > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {resumenAlertas.criticas} vence(n) hoy
                      </span>
                    )}
                    {resumenAlertas.altas > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        {resumenAlertas.altas} próxima(s) a vencer (5 días)
                      </span>
                    )}
                    {resumenAlertas.medias > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        {resumenAlertas.medias} en 10 días
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Lista de alertas urgentes */}
          {alertasVencimiento.filter(a => ['vencida', 'critica', 'alta'].includes(a.urgencia)).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Facturas que requieren atención
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {alertasVencimiento
                  .filter(a => ['vencida', 'critica', 'alta'].includes(a.urgencia))
                  .map(alerta => (
                    <div key={alerta.id} className={`p-4 flex items-center justify-between ${
                      alerta.urgencia === 'vencida' ? 'bg-red-50' :
                      alerta.urgencia === 'critica' ? 'bg-red-50' :
                      'bg-amber-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          alerta.urgencia === 'vencida' || alerta.urgencia === 'critica'
                            ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                          {alerta.urgencia === 'vencida' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : alerta.urgencia === 'critica' ? (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {alerta.plan_nombre || 'Factura'} - {formatPeriodo(alerta.periodo)}
                          </p>
                          <p className={`text-xs ${
                            alerta.urgencia === 'vencida' || alerta.urgencia === 'critica'
                              ? 'text-red-600 font-medium' : 'text-amber-600'
                          }`}>
                            {alerta.mensaje_vencimiento}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${parseFloat(alerta.precio_total || 0).toFixed(2)}
                        </p>
                        {alerta.fecha_vencimiento && (
                          <p className="text-xs text-gray-500">
                            Vence: {new Date(alerta.fecha_vencimiento).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Factura del mes actual */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Factura del período actual
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Resumen de consumo y costos del mes en curso</p>
          </div>
        </div>

        {loadingActual ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : facturaActual ? (
          <div className="p-5 space-y-4">
            {/* Header de factura */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Período</p>
                <p className="text-sm font-semibold text-gray-900">{formatPeriodo(facturaActual.periodo)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <p className="text-sm font-semibold text-gray-900">{facturaActual.plan_nombre || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                {(() => {
                  const st = STATUS_MAP[facturaActual.estado] || STATUS_MAP.generada
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      <st.icon className="h-3 w-3" />
                      {st.label}
                    </span>
                  )
                })()}
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{formatMoney(facturaActual.precio_total, facturaActual.currency_code)}</p>
              </div>
            </div>

            {/* Detalle de créditos */}
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-500">Créditos incluidos</p>
                <p className="text-sm font-bold text-gray-800">{facturaActual.creditos_incluidos}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Créditos usados</p>
                <p className="text-sm font-bold text-blue-700">{parseFloat(facturaActual.creditos_usados || 0).toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Excedente</p>
                <p className={`text-sm font-bold ${parseFloat(facturaActual.creditos_excedentes) > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {parseFloat(facturaActual.creditos_excedentes || 0).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cargo base</p>
                <p className="text-sm font-bold text-gray-800">{formatMoney(facturaActual.precio_base, facturaActual.currency_code)}</p>
              </div>
            </div>

            {/* Desglose por producto */}
            {facturaActual.desglose && Object.keys(facturaActual.desglose).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Desglose por producto</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Producto</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Operaciones</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Créditos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(facturaActual.desglose).map(([prod, info]) => (
                        <tr key={prod} className="hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-700">{prod}</td>
                          <td className="py-2 px-3 text-center text-gray-600">{info.cantidad || info.count || 0}</td>
                          <td className="py-2 px-3 text-center font-medium text-blue-700">{parseFloat(info.creditos || 0).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totales */}
            {parseFloat(facturaActual.precio_excedente) > 0 && (
              <div className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                <span className="text-sm text-red-700">Cargo por excedente</span>
                <span className="text-sm font-bold text-red-700">{formatMoney(facturaActual.precio_excedente, facturaActual.currency_code)}</span>
              </div>
            )}
            
            {/* Botón descarga PDF */}
            {facturaActual.id && (
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadPdf(facturaActual.id)}
                  disabled={downloadingPdf === facturaActual.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloadingPdf === facturaActual.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingPdf === facturaActual.id ? 'Descargando...' : 'Descargar PDF'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No hay factura generada para el período actual
          </div>
        )}
      </div>

      {/* Historial de facturas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Historial de facturas
          </h2>
        </div>

        {facturas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No hay facturas anteriores
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {facturas.map((f, i) => {
              const st = STATUS_MAP[f.estado] || STATUS_MAP.generada
              const isExpanded = expanded === i
              return (
                <div key={i}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatPeriodo(f.periodo)}</p>
                        <p className="text-xs text-gray-500">{f.plan_nombre}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{formatMoney(f.precio_total, f.currency_code)}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Cr. incluidos</p>
                          <p className="text-sm font-semibold">{f.creditos_incluidos}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cr. usados</p>
                          <p className="text-sm font-semibold text-blue-700">{parseFloat(f.creditos_usados || 0).toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Excedente</p>
                          <p className="text-sm font-semibold">{parseFloat(f.creditos_excedentes || 0).toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cargo excedente</p>
                          <p className="text-sm font-semibold text-red-600">{formatMoney(f.precio_excedente, f.currency_code)}</p>
                        </div>
                      </div>
                      {f.desglose && Object.keys(f.desglose).length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-left py-1.5 px-3 text-gray-500">Producto</th>
                                <th className="text-center py-1.5 px-3 text-gray-500">Ops</th>
                                <th className="text-center py-1.5 px-3 text-gray-500">Créditos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {Object.entries(f.desglose).map(([prod, info]) => (
                                <tr key={prod}>
                                  <td className="py-1.5 px-3 text-gray-700">{prod}</td>
                                  <td className="py-1.5 px-3 text-center text-gray-600">{info.cantidad || info.count || 0}</td>
                                  <td className="py-1.5 px-3 text-center font-medium text-blue-700">{parseFloat(info.creditos || 0).toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {/* Botón descarga PDF */}
                      {f.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleDownloadPdf(f.id)}
                            disabled={downloadingPdf === f.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {downloadingPdf === f.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            {downloadingPdf === f.id ? 'Descargando...' : 'Descargar PDF'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

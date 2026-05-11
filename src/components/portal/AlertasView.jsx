// ===============================
// ALERTAS VIEW - PORTAL CLIENTE
// Centro de alertas para cliente_admin
// ===============================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  Bell, Shield, CreditCard, AlertTriangle, AlertCircle, Info,
  Check, CheckCheck, X, RefreshCcw, Clock, Eye, TrendingUp,
  Zap, FileText, Loader2
} from 'lucide-react'

const CATEGORIAS = {
  all: { label: 'Todas', icon: Bell, color: 'gray' },
  consumo: { label: 'Consumo', icon: TrendingUp, color: 'blue' },
  seguridad: { label: 'Seguridad', icon: Shield, color: 'red' },
  facturacion: { label: 'Facturación', icon: CreditCard, color: 'green' },
  sistema: { label: 'Sistema', icon: Zap, color: 'purple' },
}

const SEVERIDADES = {
  critical: { label: 'Crítico', icon: AlertTriangle, color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  warning: { label: 'Advertencia', icon: AlertCircle, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  info: { label: 'Info', icon: Info, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  success: { label: 'Éxito', icon: Check, color: 'green', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
}

export default function AlertasView({ isAdmin = true }) {
  const [alertas, setAlertas] = useState([])
  const [counts, setCounts] = useState({ total: 0, consumo: 0, seguridad: 0, facturacion: 0, sistema: 0 })
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('all')
  const [soloNoLeidas, setSoloNoLeidas] = useState(false)
  const [selectedAlerta, setSelectedAlerta] = useState(null)

  useEffect(() => {
    fetchAlertas()
    fetchCounts()
  }, [filtroCategoria, soloNoLeidas])

  const fetchAlertas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '50')
      if (filtroCategoria !== 'all') params.append('categoria', filtroCategoria)
      if (soloNoLeidas) params.append('no_leidas', 'true')

      const res = await axios.get(`/api/portal/alertas?${params.toString()}`)
      if (res.data.success) {
        setAlertas(res.data.alertas || [])
      }
    } catch (err) {
      console.error('Error fetching alertas:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCounts = async () => {
    try {
      const res = await axios.get('/api/portal/alertas/count')
      if (res.data.success) {
        setCounts(res.data)
      }
    } catch (err) {
      console.error('Error fetching counts:', err)
    }
  }

  const markAsRead = async (id) => {
    try {
      await axios.post(`/api/portal/alertas/${id}/read`)
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a))
      fetchCounts()
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.post('/api/portal/alertas/read-all', 
        filtroCategoria !== 'all' ? { categoria: filtroCategoria } : {}
      )
      fetchAlertas()
      fetchCounts()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    // Siempre mostrar fecha y hora exacta
    const fechaExacta = date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    
    // Agregar tiempo relativo para fechas recientes
    let tiempoRelativo = ''
    if (diff < 60000) tiempoRelativo = 'hace un momento'
    else if (diff < 3600000) tiempoRelativo = `hace ${Math.floor(diff / 60000)} min`
    else if (diff < 86400000) tiempoRelativo = `hace ${Math.floor(diff / 3600000)}h`
    else if (diff < 604800000) tiempoRelativo = `hace ${Math.floor(diff / 86400000)}d`
    
    return tiempoRelativo ? `${fechaExacta} (${tiempoRelativo})` : fechaExacta
  }

  const getIconByType = (tipo, categoria, severidad) => {
    // Alertas de plan
    if (tipo === 'plan_aprobado') return <Check size={18} className="text-green-500" />
    if (tipo === 'plan_rechazado') return <X size={18} className="text-red-500" />
    // Alertas de consumo
    if (tipo === 'consumo_85') return <TrendingUp size={18} className="text-amber-500" />
    if (tipo === 'consumo_95') return <AlertCircle size={18} className="text-orange-500" />
    if (tipo === 'consumo_100') return <AlertTriangle size={18} className="text-red-500" />
    // Por categoría
    if (categoria === 'seguridad') return <Shield size={18} className="text-red-500" />
    if (categoria === 'facturacion') return <CreditCard size={18} className="text-green-500" />
    return <Bell size={18} className="text-blue-500" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Centro de Alertas</h1>
          <p className="text-sm text-gray-500 mt-0.5 sm:mt-1">Notificaciones importantes de tu cuenta</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => { fetchAlertas(); fetchCounts() }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Actualizar"
          >
            <RefreshCcw size={18} className="text-gray-500" />
          </button>
          {counts.total > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-gray-800 transition"
            >
              <CheckCheck size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Marcar todas</span> leídas
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        {Object.entries(CATEGORIAS).map(([key, cat]) => {
          const Icon = cat.icon
          const count = key === 'all' ? counts.total : (counts[key] || 0)
          const isActive = filtroCategoria === key
          
          return (
            <motion.div
              key={key}
              whileHover={{ scale: 1.02 }}
              onClick={() => setFiltroCategoria(key)}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition ${
                isActive 
                  ? key === 'all' ? 'bg-gray-900 text-white' : `bg-${cat.color}-600 text-white`
                  : 'bg-white border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={16} className={`sm:w-5 sm:h-5 ${isActive ? 'text-white' : `text-${cat.color}-500`}`} />
                {count > 0 && (
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                    isActive ? 'bg-white/20' : `bg-${cat.color}-100 text-${cat.color}-700`
                  }`}>
                    {count}
                  </span>
                )}
              </div>
              <p className={`mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                {cat.label}
              </p>
              <p className={`text-lg sm:text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                {count}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Filtro solo no leídas */}
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={soloNoLeidas}
            onChange={(e) => setSoloNoLeidas(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Solo no leídas</span>
        </label>
      </div>

      {/* Lista de Alertas */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 sm:p-12 text-center">
            <Loader2 size={28} className="sm:w-8 sm:h-8 mx-auto text-gray-300 animate-spin mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-500">Cargando alertas...</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Bell size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-200 mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-500 font-medium">No hay alertas{soloNoLeidas ? ' sin leer' : ''}</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Las alertas importantes aparecerán aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {alertas.map((alerta) => {
                const sevConfig = SEVERIDADES[alerta.severidad] || SEVERIDADES.info
                const catConfig = CATEGORIAS[alerta.categoria] || CATEGORIAS.sistema
                const CatIcon = catConfig.icon
                
                // Estilos especiales para alertas de plan
                const isPlanAprobado = alerta.tipo === 'plan_aprobado'
                const isPlanRechazado = alerta.tipo === 'plan_rechazado'
                const isPlanAlert = isPlanAprobado || isPlanRechazado
                
                const cardBg = isPlanAprobado ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500' :
                               isPlanRechazado ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' :
                               !alerta.leida ? sevConfig.bg : ''
                
                return (
                  <motion.div
                    key={alerta.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`p-3 sm:p-4 transition cursor-pointer ${cardBg}`}
                    onClick={() => setSelectedAlerta(alerta)}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-4">
                      <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isPlanAprobado ? 'bg-green-100' : isPlanRechazado ? 'bg-red-100' : sevConfig.bg}`}>
                        {getIconByType(alerta.tipo, alerta.categoria, alerta.severidad)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          {isPlanAlert ? (
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${isPlanAprobado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {isPlanAprobado ? 'Aprobado' : 'Rechazado'}
                            </span>
                          ) : (
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${sevConfig.bg} ${sevConfig.text}`}>
                              {sevConfig.label}
                            </span>
                          )}
                          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                            <CatIcon size={10} className="sm:w-3 sm:h-3" />
                            {catConfig.label}
                          </span>
                          {!alerta.leida && (
                            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isPlanAprobado ? 'bg-green-500' : isPlanRechazado ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                          )}
                        </div>
                        
                        <h3 className={`text-sm sm:text-base font-semibold ${isPlanAprobado ? 'text-green-800' : isPlanRechazado ? 'text-red-800' : !alerta.leida ? 'text-gray-900' : 'text-gray-600'}`}>
                          {alerta.titulo}
                        </h3>
                        <p className={`text-xs sm:text-sm line-clamp-2 sm:truncate ${isPlanAprobado ? 'text-green-600' : isPlanRechazado ? 'text-red-600' : 'text-gray-500'}`}>{alerta.descripcion}</p>
                        
                        <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={10} className="sm:w-3 sm:h-3" />
                            {formatDate(alerta.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {!alerta.leida && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(alerta.id) }}
                            className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition"
                            title="Marcar como leída"
                          >
                            <Eye size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <AnimatePresence>
        {selectedAlerta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
            onClick={() => setSelectedAlerta(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header especial para alertas de plan */}
              {(selectedAlerta.tipo === 'plan_aprobado' || selectedAlerta.tipo === 'plan_rechazado') ? (
                <div className={`p-4 sm:p-6 ${selectedAlerta.tipo === 'plan_aprobado' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                  <div className="flex items-center justify-between">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      {selectedAlerta.tipo === 'plan_aprobado' ? (
                        <Check size={24} className="sm:w-8 sm:h-8 text-white" />
                      ) : (
                        <X size={24} className="sm:w-8 sm:h-8 text-white" />
                      )}
                    </motion.div>
                    <button
                      onClick={() => setSelectedAlerta(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <X size={18} className="sm:w-5 sm:h-5 text-white" />
                    </button>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-3 sm:mt-4">{selectedAlerta.titulo}</h2>
                  <p className="text-white/80 text-xs sm:text-sm mt-1">
                    {selectedAlerta.tipo === 'plan_aprobado' ? 'Tu solicitud ha sido procesada exitosamente' : 'Tu solicitud no fue aprobada'}
                  </p>
                  {/* Fecha y hora prominente */}
                  <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-white/90 bg-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg inline-flex text-xs sm:text-sm">
                    <Clock size={14} className="sm:w-4 sm:h-4" />
                    <span className="font-medium">
                      {new Date(selectedAlerta.created_at).toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-white/60">•</span>
                    <span className="font-medium">
                      {new Date(selectedAlerta.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium ${SEVERIDADES[selectedAlerta.severidad]?.bg} ${SEVERIDADES[selectedAlerta.severidad]?.text}`}>
                        {SEVERIDADES[selectedAlerta.severidad]?.label}
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-2">{selectedAlerta.titulo}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedAlerta(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4 sm:p-6">
                {/* Contenido especial para alertas de plan */}
                {(selectedAlerta.tipo === 'plan_aprobado' || selectedAlerta.tipo === 'plan_rechazado') && selectedAlerta.datos ? (
                  <div className="space-y-4">
                    {/* Descripción */}
                    <p className="text-gray-600">{selectedAlerta.descripcion}</p>
                    
                    {/* Detalles organizados */}
                    <div className={`p-4 rounded-xl ${selectedAlerta.tipo === 'plan_aprobado' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                      <h4 className={`text-sm font-semibold mb-3 ${selectedAlerta.tipo === 'plan_aprobado' ? 'text-green-800' : 'text-red-800'}`}>
                        Detalles de la solicitud
                      </h4>
                      
                      <div className="space-y-3">
                        {selectedAlerta.tipo === 'plan_aprobado' ? (
                          <>
                            <div className="flex justify-between items-center py-2 border-b border-green-100">
                              <span className="text-sm text-green-700">Fecha de aprobación</span>
                              <span className="text-sm font-medium text-green-900">{new Date(selectedAlerta.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(selectedAlerta.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-green-100">
                              <span className="text-sm text-green-700">Plan anterior</span>
                              <span className="text-sm font-medium text-green-900">{selectedAlerta.datos.plan_anterior || 'Sin plan'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-green-100">
                              <span className="text-sm text-green-700">Nuevo plan</span>
                              <span className="text-sm font-bold text-green-900">{selectedAlerta.datos.plan_nuevo}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-green-700">Créditos mensuales</span>
                              <span className="text-sm font-bold text-green-900">{selectedAlerta.datos.creditos_nuevos} cr/mes</span>
                            </div>
                            {selectedAlerta.datos.notas_admin && (
                              <div className="pt-3 mt-3 border-t border-green-200">
                                <p className="text-xs text-green-600 mb-1">Nota del administrador:</p>
                                <p className="text-sm text-green-800 italic">"{selectedAlerta.datos.notas_admin}"</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center py-2 border-b border-red-100">
                              <span className="text-sm text-red-700">Fecha de respuesta</span>
                              <span className="text-sm font-medium text-red-900">{new Date(selectedAlerta.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(selectedAlerta.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-red-100">
                              <span className="text-sm text-red-700">Plan solicitado</span>
                              <span className="text-sm font-medium text-red-900">{selectedAlerta.datos.plan_solicitado}</span>
                            </div>
                            <div className="pt-3">
                              <p className="text-xs text-red-600 mb-2 font-medium">Motivo del rechazo:</p>
                              <div className="p-3 bg-red-100 rounded-lg">
                                <p className="text-sm text-red-800">{selectedAlerta.datos.motivo || 'No especificado'}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Sugerencia para rechazos */}
                    {selectedAlerta.tipo === 'plan_rechazado' && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">¿Tienes dudas?</span> Puedes contactar a nuestro equipo de soporte para obtener más información sobre tu solicitud.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 mb-4">{selectedAlerta.descripcion}</p>
                    
                    {selectedAlerta.datos && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalles</h4>
                        {selectedAlerta.tipo?.includes('consumo') && selectedAlerta.datos.porcentaje && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Uso actual</span>
                              <span className="font-semibold text-gray-900">{selectedAlerta.datos.porcentaje}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  selectedAlerta.datos.porcentaje >= 100 ? 'bg-red-500' :
                                  selectedAlerta.datos.porcentaje >= 95 ? 'bg-orange-500' :
                                  'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(selectedAlerta.datos.porcentaje, 100)}%` }}
                              />
                            </div>
                            {selectedAlerta.datos.creditos_usados !== undefined && (
                              <p className="text-xs text-gray-500">
                                {selectedAlerta.datos.creditos_usados} de {selectedAlerta.datos.creditos_totales} créditos usados
                              </p>
                            )}
                          </div>
                        )}
                        {selectedAlerta.tipo === 'nueva_ip' && selectedAlerta.datos.ip && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">IP detectada</span>
                              <span className="font-mono font-semibold text-gray-900">{selectedAlerta.datos.ip}</span>
                            </div>
                            {selectedAlerta.datos.ubicacion && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Ubicación</span>
                                <span className="text-gray-900">{selectedAlerta.datos.ubicacion}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {selectedAlerta.tipo === 'actividad_sospechosa' && (
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-700">{selectedAlerta.datos.detalle || 'Actividad inusual detectada'}</p>
                            {selectedAlerta.datos.ip && (
                              <p className="text-gray-500">IP: <span className="font-mono">{selectedAlerta.datos.ip}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {selectedAlerta.accion_url && (
                  <a
                    href={selectedAlerta.accion_url}
                    className="block w-full py-2.5 bg-blue-600 text-white text-center rounded-xl hover:bg-blue-700 transition mb-3"
                  >
                    {selectedAlerta.accion_texto || 'Ver más'}
                  </a>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(selectedAlerta.created_at).toLocaleString('es')}
                  </span>
                </div>
                
                <div className="flex gap-3">
                  {!selectedAlerta.leida && (
                    <button
                      onClick={() => { markAsRead(selectedAlerta.id); setSelectedAlerta({...selectedAlerta, leida: true}) }}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      Marcar leída
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlerta(null)}
                    className={`flex-1 py-2.5 text-white rounded-xl transition ${
                      selectedAlerta.tipo === 'plan_aprobado' ? 'bg-green-600 hover:bg-green-700' :
                      selectedAlerta.tipo === 'plan_rechazado' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

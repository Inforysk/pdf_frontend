// ===============================
// ADMIN NOTIFICATIONS PANEL
// Panel de alertas y notificaciones para admin
// ===============================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Shield, Globe, CreditCard, Server,
  AlertTriangle, AlertCircle, Info,
  Check, CheckCheck, X, RefreshCcw,
  User, Clock, Filter, Eye, Archive,
  CheckCircle, XCircle, Loader2
} from "lucide-react";
import axios from "axios";

const MODULOS = {
  all: { label: 'Todas', icon: Bell, color: 'gray' },
  security: { label: 'Seguridad', icon: Shield, color: 'red' },
  countries: { label: 'Países', icon: Globe, color: 'blue' },
  billing: { label: 'Facturación', icon: CreditCard, color: 'green' },
  system: { label: 'Sistema', icon: Server, color: 'purple' },
};

const SEVERIDADES = {
  critical: { label: 'Crítico', icon: AlertTriangle, color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  warning: { label: 'Advertencia', icon: AlertCircle, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  info: { label: 'Info', icon: Info, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
};

export default function AdminNotifications({ onCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ total: 0, criticas: 0, security: 0, countries: 0, billing: 0, system: 0 });
  const [loading, setLoading] = useState(true);
  const [filtroModulo, setFiltroModulo] = useState('all');
  const [filtroSeveridad, setFiltroSeveridad] = useState(null);
  const [soloNoLeidas, setSoloNoLeidas] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // 'aprobar' | 'rechazar' | null
  const [motivoRechazo, setMotivoRechazo] = useState('');
  
  // Estados para modales de confirmación y resultado
  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, solicitudId: null, notifId: null });
  const [resultModal, setResultModal] = useState({ show: false, type: null, title: '', message: '' });

  useEffect(() => {
    fetchNotifications();
    fetchCounts();
  }, [filtroModulo, filtroSeveridad, soloNoLeidas]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filtroModulo !== 'all') params.append('modulo', filtroModulo);
      if (filtroSeveridad) params.append('severidad', filtroSeveridad);
      if (soloNoLeidas) params.append('no_leidas', 'true');

      const res = await axios.get(`/api/admin/notifications?${params.toString()}`);
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const res = await axios.get('/api/admin/notifications/count');
      if (res.data.success) {
        setCounts(res.data);
        // Notificar al parent el nuevo count
        if (onCountChange) {
          onCountChange(res.data.total || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.post(`/api/admin/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      fetchCounts();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const body = filtroModulo !== 'all' ? { modulo: filtroModulo } : {};
      await axios.post('/api/admin/notifications/read-all', body);
      fetchNotifications();
      fetchCounts();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const resolveNotification = async (id, notas = null) => {
    try {
      await axios.post(`/api/admin/notifications/${id}/resolve`, { notas });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, resuelta: true, leida: true } : n));
      fetchCounts();
      setSelectedNotif(null);
    } catch (err) {
      console.error('Error resolving notification:', err);
    }
  };

  // Funciones para aprobar/rechazar solicitudes de cambio de plan
  const handleConfirmAction = (action, solicitudId, notifId) => {
    if (action === 'rechazar' && !motivoRechazo.trim()) {
      setResultModal({
        show: true,
        type: 'error',
        title: 'Motivo requerido',
        message: 'Por favor ingresa un motivo para el rechazo antes de continuar.'
      });
      return;
    }
    setConfirmModal({ show: true, action, solicitudId, notifId });
  };

  const executeAction = async () => {
    const { action, solicitudId, notifId } = confirmModal;
    setConfirmModal({ show: false, action: null, solicitudId: null, notifId: null });
    
    if (action === 'aprobar') {
      await aprobarCambioPlan(solicitudId, notifId);
    } else {
      await rechazarCambioPlan(solicitudId, notifId);
    }
  };

  const aprobarCambioPlan = async (solicitudId, notifId) => {
    setActionLoading('aprobar');
    try {
      const res = await axios.post(`/api/admin/solicitudes-plan/${solicitudId}/aprobar`, {});
      if (res.data.success) {
        // Marcar notificación como resuelta automáticamente
        await axios.post(`/api/admin/notifications/${notifId}/resolve`, { notas: 'Solicitud aprobada' });
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, resuelta: true, leida: true } : n));
        fetchCounts();
        setSelectedNotif(null);
        setResultModal({
          show: true,
          type: 'success',
          title: '¡Plan aprobado!',
          message: res.data.message
        });
      }
    } catch (err) {
      console.error('Error aprobando solicitud:', err);
      setResultModal({
        show: true,
        type: 'error',
        title: 'Error al aprobar',
        message: err.response?.data?.error || 'Ocurrió un error al procesar la solicitud'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const rechazarCambioPlan = async (solicitudId, notifId) => {
    setActionLoading('rechazar');
    try {
      const res = await axios.post(`/api/admin/solicitudes-plan/${solicitudId}/rechazar`, { motivo: motivoRechazo });
      if (res.data.success) {
        // Marcar notificación como resuelta automáticamente
        await axios.post(`/api/admin/notifications/${notifId}/resolve`, { notas: `Solicitud rechazada: ${motivoRechazo}` });
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, resuelta: true, leida: true } : n));
        fetchCounts();
        setSelectedNotif(null);
        setMotivoRechazo('');
        setResultModal({
          show: true,
          type: 'success',
          title: 'Solicitud rechazada',
          message: res.data.message
        });
      }
    } catch (err) {
      console.error('Error rechazando solicitud:', err);
      setResultModal({
        show: true,
        type: 'error',
        title: 'Error al rechazar',
        message: err.response?.data?.error || 'Ocurrió un error al procesar la solicitud'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const SeverityIcon = ({ severidad }) => {
    const config = SEVERIDADES[severidad] || SEVERIDADES.info;
    const Icon = config.icon;
    return <Icon size={18} className={`text-${config.color}-500`} />;
  };

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Centro de Alertas</h1>
            <p className="text-gray-500 mt-1">Monitorea actividad de clientes y sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchNotifications}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Actualizar"
            >
              <RefreshCcw size={20} className="text-gray-500" />
            </button>
            {counts.total > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition"
              >
                <CheckCheck size={16} />
                Marcar todas leídas
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(MODULOS).map(([key, mod]) => {
            if (key === 'all') {
              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setFiltroModulo('all')}
                  className={`p-4 rounded-2xl cursor-pointer transition ${
                    filtroModulo === 'all' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Bell size={20} className={filtroModulo === 'all' ? 'text-white' : 'text-gray-400'} />
                    {counts.total > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        filtroModulo === 'all' ? 'bg-white/20' : 'bg-red-100 text-red-700'
                      }`}>
                        {counts.total}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm font-medium ${filtroModulo === 'all' ? 'text-white/80' : 'text-gray-500'}`}>
                    Todas
                  </p>
                  <p className={`text-2xl font-bold ${filtroModulo === 'all' ? 'text-white' : 'text-gray-900'}`}>
                    {counts.total || 0}
                  </p>
                </motion.div>
              );
            }
            
            const Icon = mod.icon;
            const count = counts[key] || 0;
            const isActive = filtroModulo === key;
            
            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                onClick={() => setFiltroModulo(key)}
                className={`p-4 rounded-2xl cursor-pointer transition ${
                  isActive 
                    ? `bg-${mod.color}-600 text-white` 
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon size={20} className={isActive ? 'text-white' : `text-${mod.color}-500`} />
                  {count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-white/20' : `bg-${mod.color}-100 text-${mod.color}-700`
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm font-medium ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {mod.label}
                </p>
                <p className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                  {count}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">Filtros:</span>
          </div>
          
          <div className="flex gap-2">
            {Object.entries(SEVERIDADES).map(([key, sev]) => (
              <button
                key={key}
                onClick={() => setFiltroSeveridad(filtroSeveridad === key ? null : key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroSeveridad === key 
                    ? `${sev.bg} ${sev.text} ${sev.border} border` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
          
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={soloNoLeidas}
              onChange={(e) => setSoloNoLeidas(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Solo no leídas</span>
          </label>
        </div>

        {/* Lista de Notificaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCcw size={32} className="mx-auto text-gray-300 animate-spin mb-4" />
              <p className="text-gray-500">Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500">No hay notificaciones{soloNoLeidas ? ' sin leer' : ''}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {notifications.map((notif) => {
                  const sevConfig = SEVERIDADES[notif.severidad] || SEVERIDADES.info;
                  const modConfig = MODULOS[notif.modulo] || MODULOS.system;
                  const ModIcon = modConfig.icon;
                  
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                        !notif.leida ? sevConfig.bg : ''
                      }`}
                      onClick={() => setSelectedNotif(notif)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${sevConfig.bg}`}>
                          <SeverityIcon severidad={notif.severidad} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${sevConfig.bg} ${sevConfig.text}`}>
                              {sevConfig.label}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                              <ModIcon size={12} />
                              {modConfig.label}
                            </span>
                            {notif.resuelta && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                Resuelta
                              </span>
                            )}
                          </div>
                          
                          <h3 className={`font-semibold ${!notif.leida ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notif.titulo}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">{notif.descripcion}</p>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(notif.created_at)}
                            </span>
                            {notif.usuario_nombre && (
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {notif.usuario_nombre}
                              </span>
                            )}
                            {notif.ip_origen && (
                              <span>IP: {notif.ip_origen}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notif.leida && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                              className="p-2 hover:bg-gray-200 rounded-lg transition"
                              title="Marcar como leída"
                            >
                              <Eye size={16} className="text-gray-400" />
                            </button>
                          )}
                          {!notif.resuelta && (
                            <button
                              onClick={(e) => { e.stopPropagation(); resolveNotification(notif.id); }}
                              className="p-2 hover:bg-green-100 rounded-lg transition"
                              title="Marcar como resuelta"
                            >
                              <Check size={16} className="text-green-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Modal de Detalle */}
        <AnimatePresence>
          {selectedNotif && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => { setSelectedNotif(null); setMotivoRechazo(''); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${SEVERIDADES[selectedNotif.severidad]?.bg} ${SEVERIDADES[selectedNotif.severidad]?.text}`}>
                        {SEVERIDADES[selectedNotif.severidad]?.label}
                      </span>
                      <h2 className="text-xl font-bold text-gray-900 mt-2">{selectedNotif.titulo}</h2>
                    </div>
                    <button
                      onClick={() => { setSelectedNotif(null); setMotivoRechazo(''); }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{selectedNotif.descripcion}</p>
                  
                  {/* Detalles especiales para solicitud de cambio de plan */}
                  {selectedNotif.tipo === 'cambio_plan' && selectedNotif.datos && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <CreditCard size={16} className="text-blue-600" />
                        Detalles de la solicitud
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Cliente</p>
                          <p className="font-medium text-gray-900">{selectedNotif.datos.usuario_nombre}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Empresa</p>
                          <p className="font-medium text-gray-900">{selectedNotif.datos.empresa_nombre || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Plan actual</p>
                          <p className="font-medium text-gray-900">{selectedNotif.datos.plan_actual || 'Sin plan'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Plan solicitado</p>
                          <p className="font-semibold text-blue-600">{selectedNotif.datos.plan_nuevo}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Nuevo precio</p>
                          <p className="font-medium text-gray-900">${selectedNotif.datos.plan_nuevo_precio}/mes</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Nuevos créditos</p>
                          <p className="font-medium text-gray-900">{selectedNotif.datos.plan_nuevo_creditos} cr/mes</p>
                        </div>
                      </div>
                      {selectedNotif.datos.notas && (
                        <div className="mt-3 pt-3 border-t border-blue-100">
                          <p className="text-gray-500 text-sm">Notas del cliente:</p>
                          <p className="text-gray-700 text-sm italic">"{selectedNotif.datos.notas}"</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Datos genéricos para otras notificaciones */}
                  {selectedNotif.tipo !== 'cambio_plan' && selectedNotif.datos && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Datos adicionales</h4>
                      <pre className="text-xs text-gray-600 overflow-auto">
                        {JSON.stringify(selectedNotif.datos, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(selectedNotif.created_at).toLocaleString('es')}
                    </span>
                    {selectedNotif.ip_origen && <span>IP: {selectedNotif.ip_origen}</span>}
                  </div>
                  
                  {/* Botones especiales para solicitud de cambio de plan */}
                  {selectedNotif.tipo === 'cambio_plan' && !selectedNotif.resuelta && selectedNotif.datos?.solicitud_id && (
                    <div className="space-y-4 mb-4">
                      {/* Input para motivo de rechazo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Motivo (requerido para rechazar)
                        </label>
                        <input
                          type="text"
                          value={motivoRechazo}
                          onChange={(e) => setMotivoRechazo(e.target.value)}
                          placeholder="Ej: Requiere validación adicional..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleConfirmAction('aprobar', selectedNotif.datos.solicitud_id, selectedNotif.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading === 'aprobar' ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          Aprobar cambio
                        </button>
                        <button
                          onClick={() => handleConfirmAction('rechazar', selectedNotif.datos.solicitud_id, selectedNotif.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading === 'rechazar' ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <XCircle size={16} />
                          )}
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Botones genéricos */}
                  <div className="flex gap-3">
                    {!selectedNotif.leida && (
                      <button
                        onClick={() => { markAsRead(selectedNotif.id); setSelectedNotif({...selectedNotif, leida: true}); }}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        Marcar leída
                      </button>
                    )}
                    {!selectedNotif.resuelta && selectedNotif.tipo !== 'cambio_plan' && (
                      <button
                        onClick={() => resolveNotification(selectedNotif.id)}
                        className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <Check size={16} />
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Modal de Confirmación */}
        <AnimatePresence>
          {confirmModal.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              onClick={() => setConfirmModal({ show: false, action: null, solicitudId: null, notifId: null })}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header con icono */}
                <div className={`p-6 ${confirmModal.action === 'aprobar' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                  <div className="flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      {confirmModal.action === 'aprobar' ? (
                        <CheckCircle size={32} className="text-white" />
                      ) : (
                        <XCircle size={32} className="text-white" />
                      )}
                    </motion.div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {confirmModal.action === 'aprobar' ? '¿Aprobar cambio de plan?' : '¿Rechazar solicitud?'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {confirmModal.action === 'aprobar' 
                      ? 'El cliente será notificado y su plan será actualizado inmediatamente.'
                      : 'El cliente será notificado del rechazo con el motivo indicado.'}
                  </p>
                  
                  {/* Botones */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmModal({ show: false, action: null, solicitudId: null, notifId: null })}
                      className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={executeAction}
                      className={`flex-1 py-3 px-4 text-white rounded-xl transition font-medium flex items-center justify-center gap-2 ${
                        confirmModal.action === 'aprobar'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {confirmModal.action === 'aprobar' ? (
                        <>
                          <CheckCircle size={18} />
                          Sí, aprobar
                        </>
                      ) : (
                        <>
                          <XCircle size={18} />
                          Sí, rechazar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Resultado */}
        <AnimatePresence>
          {resultModal.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              onClick={() => setResultModal({ show: false, type: null, title: '', message: '' })}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header con icono animado */}
                <div className={`p-8 ${resultModal.type === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                  <div className="flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      {resultModal.type === 'success' ? (
                        <motion.div
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        >
                          <CheckCircle size={40} className="text-green-600" />
                        </motion.div>
                      ) : (
                        <AlertTriangle size={40} className="text-red-600" />
                      )}
                    </motion.div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 text-center">
                  <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-bold text-gray-900 mb-2"
                  >
                    {resultModal.title}
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-500 mb-6"
                  >
                    {resultModal.message}
                  </motion.p>
                  
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => setResultModal({ show: false, type: null, title: '', message: '' })}
                    className={`w-full py-3 px-4 text-white rounded-xl transition font-medium ${
                      resultModal.type === 'success'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Entendido
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

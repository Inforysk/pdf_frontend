// ===============================
// API CLIENT DASHBOARD - Inforysk
// ===============================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, RefreshCcw, BarChart3, Code, ExternalLink, Check, AlertCircle, Key, Zap, Shield, ShieldAlert, ShieldCheck, Bell, Lock, Users, Star, Crown, ChevronDown, ChevronUp, Clock, Loader2 } from "lucide-react";

// Configuración de colores e iconos por plan
const PLAN_CONFIG = {
  Starter: {
    icon: Zap,
    gradient: 'from-blue-500 to-blue-600',
    buttonText: 'text-blue-700',
    iconBg: 'bg-blue-400/30'
  },
  Pro: {
    icon: Star,
    gradient: 'from-purple-500 to-purple-600',
    buttonText: 'text-purple-700',
    iconBg: 'bg-purple-400/30'
  },
  Enterprise: {
    icon: Crown,
    gradient: 'from-amber-500 to-amber-600',
    buttonText: 'text-amber-700',
    iconBg: 'bg-amber-400/30'
  },
  default: {
    icon: Zap,
    gradient: 'from-indigo-600 to-purple-600',
    buttonText: 'text-indigo-700',
    iconBg: 'bg-white/20'
  }
};
import axios from "axios";
import { useAuth } from '../contexts/AuthContext';
import AmpliarPlanModal from './portal/AmpliarPlanModal';
import ConfirmModal from './ui/ConfirmModal';

export default function ApiDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'cliente_admin' || user?.rol === 'admin' || user?.rol === 'analista';
  
  const [apiKey, setApiKey] = useState(null);
  const [maskedKey, setMaskedKey] = useState("sk_live_****************");
  const [showFullKey, setShowFullKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [keyBlocked, setKeyBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [lastIps, setLastIps] = useState([]);
  const [apiHabilitada, setApiHabilitada] = useState(true); // Si tiene acceso a API
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [stats, setStats] = useState({
    creditos_usados: 0,
    creditos_total: 0,
    creditos_plan: 0,
    creditos_rollover: 0,
    requests_mes: 0,
    costo_estimado: 0,
  });
  const [plan, setPlan] = useState({
    nombre: 'Cargando...',
    creditos_mes: 0,
    precio_extra: 0,
  });
  const [actividad, setActividad] = useState([]);
  const [error, setError] = useState(null);
  const [showAmpliarPlan, setShowAmpliarPlan] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [consumoPorUsuario, setConsumoPorUsuario] = useState([]);
  
  // Estados para periodos de facturación
  const [periodoActivo, setPeriodoActivo] = useState('');
  const [historialPeriodos, setHistorialPeriodos] = useState([]);
  const [showHistorialPeriodos, setShowHistorialPeriodos] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [datosPeriodoHistorial, setDatosPeriodoHistorial] = useState(null);
  const [loadingPeriodo, setLoadingPeriodo] = useState(false);

  // Cargar datos de un periodo histórico
  const cargarPeriodoHistorial = async (periodo) => {
    if (periodoSeleccionado === periodo) {
      // Si ya está seleccionado, lo deseleccionamos
      setPeriodoSeleccionado(null);
      setDatosPeriodoHistorial(null);
      return;
    }
    
    setLoadingPeriodo(true);
    setPeriodoSeleccionado(periodo);
    try {
      const res = await axios.get(`/api/portal/api-stats/periodo/${periodo}`);
      if (res.data.success) {
        setDatosPeriodoHistorial(res.data);
      }
    } catch (err) {
      console.error('Error cargando periodo:', err);
      setDatosPeriodoHistorial(null);
    } finally {
      setLoadingPeriodo(false);
    }
  };

  // Formatear periodo
  const formatPeriodo = (p) => {
    if (!p) return ''
    try {
      const parts = p.split('-')
      if (parts.length < 2) return p
      const [year, month] = parts
      const monthNum = parseInt(month)
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return p
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${meses[monthNum - 1]} ${year}`
    } catch (e) {
      return p || ''
    }
  }

  useEffect(() => {
    fetchApiData();
  }, []);

  const fetchApiData = async () => {
    setLoading(true);
    try {
      // Obtener API key, stats y alertas de seguridad
      const [keyRes, statsRes, alertsRes] = await Promise.all([
        axios.get('/api/portal/api-key'),
        axios.get('/api/portal/api-stats'),
        axios.get('/api/portal/api-key/security-alerts?unread=true').catch(() => ({ data: { alerts: [] } })),
      ]);

      if (keyRes.data.success) {
        // Verificar si tiene API habilitada
        if (keyRes.data.api_habilitada === false) {
          setApiHabilitada(false);
          setApiKey(null);
          setMaskedKey('');
        } else {
          setApiHabilitada(true);
          setApiKey(keyRes.data.api_key);
          setMaskedKey(keyRes.data.masked_key || maskKey(keyRes.data.api_key));
          setKeyBlocked(keyRes.data.blocked || false);
          setBlockedReason(keyRes.data.blocked_reason);
          setExpiresAt(keyRes.data.expires_at);
          setLastIps(keyRes.data.last_ips || []);
        }
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
        setPlan(statsRes.data.plan);
        // Actividad y consumo por usuario vienen del mismo endpoint
        setActividad(statsRes.data.actividad || []);
        setEsAdmin(statsRes.data.es_admin || false);
        setConsumoPorUsuario(statsRes.data.consumo_por_usuario || []);
        // Periodo de facturación
        if (statsRes.data.periodo_activo) {
          setPeriodoActivo(statsRes.data.periodo_activo);
        }
        if (statsRes.data.historial_periodos) {
          setHistorialPeriodos(statsRes.data.historial_periodos);
        }
      }

      if (alertsRes.data.success) {
        setSecurityAlerts(alertsRes.data.alerts || []);
      }
    } catch (err) {
      // Si no existe el endpoint, usar datos demo
      console.log('API endpoints no disponibles, usando datos demo');
      setApiHabilitada(false);
    } finally {
      setLoading(false);
    }
  };

  const maskKey = (key) => {
    if (!key) return 'sk_live_****************';
    return key.substring(0, 8) + '****************' + key.substring(key.length - 4);
  };

  const copyToClipboard = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = apiKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateClick = () => {
    setShowRegenerateConfirm(true);
  };

  const confirmRegenerate = async () => {
    setShowRegenerateConfirm(false);
    setRegenerating(true);
    try {
      const res = await axios.post('/api/portal/api-key/regenerate');
      if (res.data.success) {
        setApiKey(res.data.api_key);
        setMaskedKey(maskKey(res.data.api_key));
        setShowFullKey(true);
        setTimeout(() => setShowFullKey(false), 10000); // Mostrar 10 segundos
      }
    } catch (err) {
      setError('Error regenerando API key');
    } finally {
      setRegenerating(false);
    }
  };

  const porcentajeUso = stats.creditos_total > 0 
    ? Math.min(100, (stats.creditos_usados / stats.creditos_total) * 100) 
    : 0;

  const getBarColor = () => {
    if (porcentajeUso < 50) return 'bg-emerald-500';
    if (porcentajeUso < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">API & Integraciones</h1>
            <p className="text-sm text-gray-500 mt-0.5 sm:mt-1">Gestiona tu acceso programático a Inforysk</p>
          </div>
          <a 
            href="/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800 transition"
          >
            <ExternalLink size={16} />
            Documentación
          </a>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle size={18} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* PRIMERA FILA: API KEY + CONSUMO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">

          {/* API KEY CARD */}
          <div className={`bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border ${
            !apiHabilitada ? 'border-gray-300 bg-gray-50' : 
            keyBlocked ? 'border-red-300 bg-red-50' : 'border-gray-100'
          }`}>
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base sm:text-lg text-gray-900">API Key</h2>
                {!apiHabilitada ? (
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] sm:text-xs rounded-full flex items-center gap-1">
                    <Lock size={10} className="sm:w-3 sm:h-3" /> No habilitada
                  </span>
                ) : keyBlocked ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] sm:text-xs rounded-full flex items-center gap-1">
                    <ShieldAlert size={10} className="sm:w-3 sm:h-3" /> Bloqueada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} className="sm:w-3 sm:h-3" /> Activa
                  </span>
                )}
              </div>
              <div className={`p-1.5 sm:p-2 rounded-lg ${
                !apiHabilitada ? 'bg-gray-200' :
                keyBlocked ? 'bg-red-100' : 'bg-blue-50'
              }`}>
                <Key className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  !apiHabilitada ? 'text-gray-400' :
                  keyBlocked ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
            </div>

            {!apiHabilitada ? (
              <div className="py-8 text-center">
                <Lock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium mb-2">API no habilitada</p>
                <p className="text-sm text-gray-500">
                  {isAdmin 
                    ? 'Tu plan actual no incluye acceso a la API.'
                    : 'Contacta a tu administrador para habilitar el acceso a la API.'}
                </p>
              </div>
            ) : (
              <>
                {keyBlocked && blockedReason && (
                  <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded-lg text-sm text-red-700">
                    <strong>Razón:</strong> {blockedReason}
                  </div>
                )}

                <div className="relative">
                  <code className="block bg-gray-100 p-3 rounded-lg text-sm font-mono mb-4 break-all">
                    {showFullKey && apiKey ? apiKey : maskedKey}
                  </code>
                  {apiKey && (
                    <button
                      onClick={() => setShowFullKey(!showFullKey)}
                      className="absolute right-2 top-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {showFullKey ? 'Ocultar' : 'Mostrar'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    disabled={!apiKey}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  {/* Botón regenerar visible para cualquier usuario con API habilitada */}
                  <button 
                    onClick={handleRegenerateClick}
                    disabled={regenerating}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                    title="Regenerar API Key"
                  >
                    <RefreshCcw size={16} className={regenerating ? 'animate-spin' : ''} />
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Tu API key es única. Cada consulta queda registrada a tu usuario.
                </p>
              </>
            )}
          </div>

          {/* CONSUMO API CARD */}
          <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div>
                <h2 className="font-semibold text-base sm:text-lg text-gray-900">Consumo API</h2>
                {esAdmin && (
                  <p className="text-[10px] sm:text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                    <Users size={10} className="sm:w-3 sm:h-3" /> Consumo agregado del equipo
                  </p>
                )}
              </div>
              <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg">
                <BarChart3 className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats.creditos_usados.toLocaleString()} 
              <span className="text-base sm:text-lg font-normal text-gray-400"> / {stats.creditos_total.toLocaleString()}</span>
            </p>
            <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
              créditos usados {periodoActivo ? `periodo ${formatPeriodo(periodoActivo)}` : 'este mes'}
              {stats.creditos_rollover > 0 && (
                <span className="ml-1 text-emerald-600">
                  ({(stats.creditos_plan || stats.creditos_total - stats.creditos_rollover).toLocaleString()} + {stats.creditos_rollover.toLocaleString()} rollover)
                </span>
              )}
            </p>

            <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
              <motion.div 
                className={`h-2.5 sm:h-3 rounded-full ${getBarColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${porcentajeUso}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>

            <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-gray-500">Requests</p>
                <p className="font-semibold text-gray-900">{stats.requests_mes.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Costo estimado</p>
                <p className="font-semibold text-gray-900">${stats.costo_estimado.toFixed(2)} USD</p>
              </div>
            </div>

            {/* Info de usuarios si es admin */}
            {esAdmin && stats.usuarios_empresa && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {stats.usuarios_empresa} usuarios en tu equipo
                </p>
              </div>
            )}

            {/* Alerta de límite */}
            {porcentajeUso >= 80 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>⚠️ Atención:</strong> Has usado el {porcentajeUso.toFixed(0)}% de tus créditos.
                  {porcentajeUso >= 100 && ' No podrás hacer más consultas hasta el próximo mes.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* PLAN - Solo visible para admin */}
        {isAdmin && (() => {
          const planConfig = PLAN_CONFIG[plan.nombre] || PLAN_CONFIG.default
          const PlanIcon = planConfig.icon
          return (
          <div className="mb-6">
            <div className={`bg-gradient-to-br ${planConfig.gradient} p-6 rounded-2xl shadow-sm text-white`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${planConfig.iconBg} rounded-xl`}>
                    <PlanIcon className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg opacity-90">Tu Plan: {plan.nombre}</h2>
                    <p className="opacity-80">{plan.creditos_mes.toLocaleString()} créditos / mes · ${plan.precio_extra.toFixed(2)} por crédito extra</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAmpliarPlan(true)}
                  className={`px-6 py-2.5 bg-white ${planConfig.buttonText} font-semibold rounded-xl hover:bg-gray-100 transition`}
                >
                  Cambiar Plan
                </button>
              </div>

        {/* Modal Ampliar Plan */}
        <AmpliarPlanModal
          isOpen={showAmpliarPlan}
          onClose={() => setShowAmpliarPlan(false)}
          planActual={plan}
        />
            </div>
          </div>
          )
        })()}

        {/* Banner de Periodo Actual */}
        {periodoActivo && (
          <div className={`bg-gradient-to-r ${esAdmin ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-blue-50 to-indigo-50 border-blue-200'} border rounded-xl p-4 mb-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2.5 flex-1">
                <BarChart3 className={`h-5 w-5 ${esAdmin ? 'text-emerald-600' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${esAdmin ? 'text-emerald-800' : 'text-blue-800'}`}>
                    Periodo de facturación: {formatPeriodo(periodoActivo)}
                  </p>
                  <p className={`text-xs ${esAdmin ? 'text-emerald-700' : 'text-blue-700'} mt-0.5`}>
                    {esAdmin 
                      ? 'Los créditos API se reinician con cada nuevo ciclo de facturación'
                      : `Créditos asignados: ${stats?.creditos_total || 0} · Usados: ${stats?.creditos_usados || 0} · Disponible: ${(stats?.creditos_total || 0) - (stats?.creditos_usados || 0)}`
                    }
                  </p>
                </div>
              </div>
              {historialPeriodos && historialPeriodos.length > 1 && (
                <button 
                  onClick={() => setShowHistorialPeriodos(!showHistorialPeriodos)}
                  className={`w-full sm:w-auto px-4 py-2 ${esAdmin ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-sm font-medium rounded-lg transition-colors shrink-0`}
                >
                  {showHistorialPeriodos ? 'Ocultar historial' : 'Ver historial'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Historial de Periodos - Expandible (Para admin y usuario) */}
        {showHistorialPeriodos && historialPeriodos && historialPeriodos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Historial de Periodos</h3>
              <p className="text-xs text-gray-500 mt-0.5">Haz clic en un periodo para ver detalles de consumo API</p>
            </div>
            <div className="divide-y divide-gray-100">
              {historialPeriodos.map((p, i) => (
                <div key={p.factura_id || i}>
                  {/* Encabezado del periodo - clicable */}
                  <div 
                    onClick={() => i > 0 && cargarPeriodoHistorial(p.periodo)}
                    className={`p-4 ${i === 0 ? 'bg-blue-50' : 'hover:bg-gray-50 cursor-pointer'} transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i > 0 && (
                          periodoSeleccionado === p.periodo ? 
                            <ChevronUp size={16} className="text-gray-400" /> : 
                            <ChevronDown size={16} className="text-gray-400" />
                        )}
                        <span className="text-sm font-semibold text-gray-900">{formatPeriodo(p.periodo)}</span>
                        {i === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Actual</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          p.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                          p.estado === 'vencida' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.estado === 'pagada' ? 'Pagada' : p.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                        </span>
                        {i > 0 && <span className="text-[10px] text-gray-500">Clic para ver detalles</span>}
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <span>{Number(p.creditos_usados || 0).toFixed(1)} / {p.creditos_incluidos || 0} créditos API</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detalles expandibles del periodo histórico */}
                  {periodoSeleccionado === p.periodo && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      {loadingPeriodo ? (
                        <div className="p-6 flex items-center justify-center gap-2 text-gray-500">
                          <Loader2 className="animate-spin" size={18} />
                          <span>Cargando datos del periodo...</span>
                        </div>
                      ) : datosPeriodoHistorial ? (
                        <div className="p-4 space-y-4">
                          {/* Consumo API por Usuario del periodo - solo admins */}
                          {esAdmin && datosPeriodoHistorial.consumo_por_usuario && datosPeriodoHistorial.consumo_por_usuario.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Users size={16} className="text-gray-500" />
                                Consumo API por Usuario - {formatPeriodo(p.periodo)}
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                      <th className="px-4 py-2 text-left">Usuario</th>
                                      <th className="px-4 py-2 text-center">Requests</th>
                                      <th className="px-4 py-2 text-center">Créditos API</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {datosPeriodoHistorial.consumo_por_usuario.map((u, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                          <p className="font-medium text-gray-900">{u.nombre}</p>
                                          <p className="text-xs text-gray-500">@{u.username}</p>
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-600">{u.requests_mes || 0}</td>
                                        <td className="px-4 py-2 text-center font-medium text-gray-900">{Number(u.creditos_api || 0).toFixed(1)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          {/* Stats del periodo - para usuarios normales */}
                          {!esAdmin && datosPeriodoHistorial.stats && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <p className="text-xs text-gray-500 mb-1">Créditos Usados</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {Number(datosPeriodoHistorial.stats.creditos_usados || 0).toFixed(1)}
                                  <span className="text-sm font-normal text-gray-400"> / {datosPeriodoHistorial.stats.creditos_total || 0}</span>
                                </p>
                              </div>
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <p className="text-xs text-gray-500 mb-1">Requests</p>
                                <p className="text-xl font-bold text-gray-900">{datosPeriodoHistorial.stats.requests_mes || 0}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Actividad API del periodo */}
                          {datosPeriodoHistorial.actividad && datosPeriodoHistorial.actividad.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-gray-500" />
                                Actividad API - {formatPeriodo(p.periodo)}
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                    <tr>
                                      <th className="px-4 py-2 text-left">Fecha</th>
                                      {esAdmin && <th className="px-4 py-2 text-left">Usuario</th>}
                                      <th className="px-4 py-2 text-left">Endpoint</th>
                                      <th className="px-4 py-2 text-left">Tax ID</th>
                                      <th className="px-4 py-2 text-center">Créditos</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {datosPeriodoHistorial.actividad.map((a, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-xs text-gray-500">
                                          {a.fecha ? new Date(a.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        {esAdmin && <td className="px-4 py-2 text-gray-600">{a.usuario || a.username || '-'}</td>}
                                        <td className="px-4 py-2">
                                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{a.endpoint || '-'}</code>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{a.tax_id || '-'}</td>
                                        <td className="px-4 py-2 text-center font-medium">{Number(a.creditos || 0).toFixed(1)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          {/* Sin datos */}
                          {(!esAdmin || !datosPeriodoHistorial.consumo_por_usuario || datosPeriodoHistorial.consumo_por_usuario.length === 0) && 
                           (!datosPeriodoHistorial.actividad || datosPeriodoHistorial.actividad.length === 0) && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No hay actividad API registrada en este periodo
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No se pudieron cargar los datos del periodo
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEGUNDA FILA */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">

          {/* DOCUMENTACION */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Recursos</h2>

            <div className="grid grid-cols-2 gap-3">
              <a 
                href="/docs" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition"
              >
                <Code size={18} />
                API Docs
              </a>
              <a 
                href="/docs#sdks" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" className="w-5 h-5" alt="" />
                SDK Node
              </a>
              <a 
                href="/docs#sdks" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" className="w-5 h-5" alt="" />
                SDK Python
              </a>
              <a 
                href="/api/v1/docs" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
              >
                <Code size={18} />
                Swagger
              </a>
            </div>
          </div>

          {/* EJEMPLO REQUEST */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ejemplo de uso</h2>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`curl -X GET "https://api.inforysk.com/v1/companies/30123456789" \\
  -H "Authorization: Bearer ${apiKey || 'sk_live_xxx'}"`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Copiar
              </button>
            </div>

            <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs overflow-x-auto">
{`curl -X GET "https://api.inforysk.com/v1/companies/30123456789" \\
  -H "Authorization: Bearer ${showFullKey && apiKey ? apiKey : 'sk_live_xxx'}"`}
            </pre>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Endpoints disponibles:</strong> /companies, /scoring, /validate, /reports
              </p>
            </div>
          </div>
        </div>

        {/* CONSUMO POR USUARIO - Solo para cliente_admin */}
        {esAdmin && consumoPorUsuario.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">Consumo API por Usuario</h2>
              </div>
              <span className="text-xs text-gray-500">{consumoPorUsuario.length} usuarios con actividad</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="py-3 px-2 font-semibold text-gray-600">Usuario</th>
                    <th className="py-3 px-2 font-semibold text-gray-600 text-right">Requests</th>
                    <th className="py-3 px-2 font-semibold text-gray-600 text-right">Créditos API</th>
                    <th className="py-3 px-2 font-semibold text-gray-600 text-right">% del Total</th>
                    <th className="py-3 px-2 font-semibold text-gray-600">Última Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {consumoPorUsuario.map((u, idx) => {
                    const porcentaje = stats.creditos_usados > 0 
                      ? ((u.creditos_api / stats.creditos_usados) * 100).toFixed(1) 
                      : 0;
                    return (
                      <tr key={u.usuario_id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-gray-900">{u.nombre || 'Sin nombre'}</p>
                            <p className="text-xs text-gray-500">@{u.username}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-gray-700">{u.requests_mes || 0}</td>
                        <td className="py-3 px-2 text-right font-semibold text-gray-900">{(u.creditos_api || 0).toFixed(1)}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, porcentaje)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">{porcentaje}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-500 text-xs">
                          {u.ultima_actividad 
                            ? new Date(u.ultima_actividad).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Sin actividad'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABLA DE USO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {esAdmin ? 'Actividad API del equipo' : 'Actividad reciente'}
            </h2>
            <button 
              onClick={fetchApiData}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCcw size={14} />
              Actualizar
            </button>
          </div>

          {actividad.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="py-3 px-2 font-semibold text-gray-600">Fecha</th>
                    {esAdmin && <th className="py-3 px-2 font-semibold text-gray-600">Usuario</th>}
                    <th className="py-3 px-2 font-semibold text-gray-600">Endpoint</th>
                    <th className="py-3 px-2 font-semibold text-gray-600">Tax ID</th>
                    <th className="py-3 px-2 font-semibold text-gray-600">Status</th>
                    <th className="py-3 px-2 font-semibold text-gray-600 text-right">Créditos</th>
                  </tr>
                </thead>
                <tbody>
                  {actividad.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">
                        {new Date(item.fecha).toLocaleDateString('es-AR', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      {esAdmin && (
                        <td className="py-3 px-2 text-xs text-gray-700 font-medium">
                          {item.usuario || item.username || '-'}
                        </td>
                      )}
                      <td className="py-3 px-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.endpoint}</code>
                      </td>
                      <td className="py-3 px-2 font-mono text-gray-700">{item.tax_id || '-'}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 200 ? 'bg-emerald-100 text-emerald-700' :
                          item.status >= 400 ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">{item.creditos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Code size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No hay actividad reciente</p>
              <p className="text-gray-400 text-xs mt-1">Las llamadas a la API aparecerán aquí</p>
            </div>
          )}
        </div>

        {/* RATE LIMITS INFO */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Rate Limits:</strong> 100 requests/minuto, 10,000 requests/día. 
            Para límites más altos, <a href="#" className="underline">contacta ventas</a>.
          </p>
        </div>
      </div>

      {/* Modal Confirmar Regeneración */}
      <ConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={confirmRegenerate}
        title="¿Regenerar API Key?"
        message="La key actual dejará de funcionar inmediatamente. Todos los sistemas que usen esta key perderán acceso hasta que actualices la nueva key."
        confirmText="Regenerar"
        cancelText="Cancelar"
        confirmVariant="danger"
        icon={RefreshCcw}
        loading={regenerating}
      />
    </div>
  );
}

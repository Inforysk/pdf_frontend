import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  CreditCard, Webhook, Settings, RefreshCw, Loader2, CheckCircle, XCircle,
  AlertCircle, Eye, ExternalLink, Clock, Zap, Shield, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, Search, Filter, X, Copy, Link2
} from 'lucide-react'

const GATEWAY_ICONS = {
  mercadopago: '💳',
  stripe: '💰'
}

const RESULT_CONFIG = {
  success: { label: 'Exitoso', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', icon: XCircle },
  ignored: { label: 'Ignorado', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock }
}

export default function AdminPaymentsView() {
  const [activeTab, setActiveTab] = useState('gateways') // gateways, webhooks
  const [gateways, setGateways] = useState([])
  const [webhooks, setWebhooks] = useState([])
  const [webhookStats, setWebhookStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  
  // Filtros webhooks
  const [filterGateway, setFilterGateway] = useState('')
  const [filterResult, setFilterResult] = useState('')
  
  // Modales
  const [editGateway, setEditGateway] = useState(null)
  const [viewWebhook, setViewWebhook] = useState(null)

  useEffect(() => {
    if (activeTab === 'gateways') {
      loadGateways()
    } else {
      loadWebhooks()
    }
  }, [activeTab])

  const loadGateways = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/gateways')
      if (res.data.success) {
        setGateways(res.data.gateways)
      }
    } catch (err) {
      toast.error('Error cargando pasarelas')
    }
    setLoading(false)
  }

  const loadWebhooks = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, per_page: 20 })
      if (filterGateway) params.append('gateway', filterGateway)
      if (filterResult) params.append('result', filterResult)
      
      const res = await axios.get(`/api/admin/webhook-events?${params}`)
      if (res.data.success) {
        setWebhooks(res.data.eventos)
        setPagination(res.data.pagination)
        setWebhookStats(res.data.stats)
      }
    } catch (err) {
      toast.error('Error cargando webhooks')
    }
    setLoading(false)
  }

  const toggleGateway = async (nombre, activo) => {
    try {
      const res = await axios.put(`/api/admin/gateways/${nombre}`, { activo: !activo })
      if (res.data.success) {
        toast.success(`${nombre} ${!activo ? 'activado' : 'desactivado'}`)
        loadGateways()
      }
    } catch (err) {
      toast.error('Error actualizando pasarela')
    }
  }

  const toggleSandbox = async (nombre, sandbox) => {
    try {
      const res = await axios.put(`/api/admin/gateways/${nombre}`, { sandbox_mode: !sandbox })
      if (res.data.success) {
        toast.success(`Modo ${!sandbox ? 'sandbox' : 'producción'} activado`)
        loadGateways()
      }
    } catch (err) {
      toast.error('Error actualizando modo')
    }
  }

  const testGateway = async (nombre) => {
    try {
      const res = await axios.post(`/api/admin/gateways/${nombre}/test`)
      if (res.data.success && res.data.test_result.connected) {
        toast.success(res.data.test_result.message)
      } else {
        toast.error(res.data.test_result?.message || 'Error de conexión')
      }
    } catch (err) {
      toast.error('Error probando conexión')
    }
  }

  const copyWebhookUrl = (nombre) => {
    const url = `${window.location.origin}/webhook/${nombre}`
    navigator.clipboard.writeText(url)
    toast.success('URL copiada al portapapeles')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pasarelas de Pago</h1>
          <p className="text-sm text-gray-500 mt-1">Configuración de MercadoPago y Stripe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gateways'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Configuración
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'webhooks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Webhook className="w-4 h-4 inline mr-2" />
          Webhooks
          {webhookStats && webhookStats.errores > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {webhookStats.errores}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : activeTab === 'gateways' ? (
        <GatewaysPanel
          gateways={gateways}
          onToggle={toggleGateway}
          onToggleSandbox={toggleSandbox}
          onTest={testGateway}
          onEdit={setEditGateway}
          onCopyUrl={copyWebhookUrl}
          onRefresh={loadGateways}
        />
      ) : (
        <WebhooksPanel
          webhooks={webhooks}
          stats={webhookStats}
          pagination={pagination}
          filterGateway={filterGateway}
          filterResult={filterResult}
          onFilterGateway={setFilterGateway}
          onFilterResult={setFilterResult}
          onPageChange={(p) => loadWebhooks(p)}
          onView={setViewWebhook}
          onRefresh={() => loadWebhooks(pagination.page)}
        />
      )}

      {/* Modal Editar Gateway */}
      {editGateway && (
        <EditGatewayModal
          gateway={editGateway}
          onClose={() => setEditGateway(null)}
          onSave={() => { setEditGateway(null); loadGateways() }}
        />
      )}

      {/* Modal Ver Webhook */}
      {viewWebhook && (
        <WebhookDetailModal
          webhookId={viewWebhook}
          onClose={() => setViewWebhook(null)}
        />
      )}
    </div>
  )
}

// ── Panel de Pasarelas ──
function GatewaysPanel({ gateways, onToggle, onToggleSandbox, onTest, onEdit, onCopyUrl, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gateways.map(gw => (
          <div key={gw.nombre} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{GATEWAY_ICONS[gw.nombre]}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{gw.display_name}</h3>
                    <p className="text-xs text-gray-500">{gw.nombre}</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggle(gw.nombre, gw.activo)}
                  className={`p-2 rounded-lg transition-colors ${
                    gw.activo ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {gw.activo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  gw.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {gw.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Modo */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Modo</span>
                <button
                  onClick={() => onToggleSandbox(gw.nombre, gw.sandbox_mode)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    gw.sandbox_mode 
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {gw.sandbox_mode ? '🧪 Sandbox' : '🔴 Producción'}
                </button>
              </div>

              {/* Credenciales */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Key</span>
                <span className={`flex items-center gap-1 text-xs ${
                  gw.has_api_key ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {gw.has_api_key ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {gw.has_api_key ? 'Configurada' : 'No configurada'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Webhook Secret</span>
                <span className={`flex items-center gap-1 text-xs ${
                  gw.has_webhook_secret ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {gw.has_webhook_secret ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {gw.has_webhook_secret ? 'Configurado' : 'No configurado'}
                </span>
              </div>

              {/* Stats de uso */}
              {gw.usage && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{gw.usage.total_events}</p>
                      <p className="text-xs text-gray-500">Eventos</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-green-600">{gw.usage.successful}</p>
                      <p className="text-xs text-gray-500">Exitosos</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs font-medium text-gray-600 truncate">
                        {gw.usage.last_event 
                          ? new Date(gw.usage.last_event).toLocaleDateString('es-AR')
                          : '-'}
                      </p>
                      <p className="text-xs text-gray-500">Último</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Webhook URL */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Webhook URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded truncate">
                    /webhook/{gw.nombre}
                  </code>
                  <button
                    onClick={() => onCopyUrl(gw.nombre)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title="Copiar URL"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => onEdit(gw)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Configurar
              </button>
              <button
                onClick={() => onTest(gw.nombre)}
                disabled={!gw.has_api_key}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                Probar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Panel de Webhooks ──
function WebhooksPanel({ webhooks, stats, pagination, filterGateway, filterResult, onFilterGateway, onFilterResult, onPageChange, onView, onRefresh }) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total (30d)</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-2xl font-bold text-blue-600">{stats.procesados}</p>
            <p className="text-xs text-gray-500">Procesados</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-2xl font-bold text-green-600">{stats.exitosos}</p>
            <p className="text-xs text-gray-500">Exitosos</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-2xl font-bold text-red-600">{stats.errores}</p>
            <p className="text-xs text-gray-500">Errores</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-2xl font-bold text-purple-600">{stats.mercadopago}</p>
            <p className="text-xs text-gray-500">MercadoPago</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-2xl font-bold text-indigo-600">{stats.stripe}</p>
            <p className="text-xs text-gray-500">Stripe</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <select
          value={filterGateway}
          onChange={(e) => { onFilterGateway(e.target.value); onPageChange(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Todas las pasarelas</option>
          <option value="mercadopago">MercadoPago</option>
          <option value="stripe">Stripe</option>
        </select>

        <select
          value={filterResult}
          onChange={(e) => { onFilterResult(e.target.value); onPageChange(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Todos los resultados</option>
          <option value="success">Exitosos</option>
          <option value="error">Errores</option>
          <option value="ignored">Ignorados</option>
        </select>

        <div className="flex-1" />

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Gateway</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Evento</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Factura</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Resultado</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No hay eventos de webhook
                  </td>
                </tr>
              ) : (
                webhooks.map(wh => {
                  const result = RESULT_CONFIG[wh.process_result] || RESULT_CONFIG.pending
                  return (
                    <tr key={wh.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(wh.created_at).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span>{GATEWAY_ICONS[wh.gateway]}</span>
                          <span className="capitalize">{wh.gateway}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900">{wh.event_type}</p>
                        {wh.event_id && (
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">{wh.event_id}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {wh.factura_id ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">#{wh.factura_id}</p>
                            <p className="text-xs text-gray-500">{wh.empresa_nombre}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${result.color}`}>
                          <result.icon className="w-3 h-3" />
                          {result.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onView(wh.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {pagination.page} de {pagination.pages} ({pagination.total} eventos)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Editar Gateway ──
function EditGatewayModal({ gateway, onClose, onSave }) {
  const [formData, setFormData] = useState({
    api_key: '',
    api_secret: '',
    webhook_secret: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Solo enviar campos con valor
      const data = {}
      if (formData.api_key) data.api_key = formData.api_key
      if (formData.api_secret) data.api_secret = formData.api_secret
      if (formData.webhook_secret) data.webhook_secret = formData.webhook_secret
      
      if (Object.keys(data).length === 0) {
        toast.error('Ingrese al menos un valor')
        setSaving(false)
        return
      }

      const res = await axios.put(`/api/admin/gateways/${gateway.nombre}`, data)
      if (res.data.success) {
        toast.success('Credenciales actualizadas')
        onSave()
      }
    } catch (err) {
      toast.error('Error guardando')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{GATEWAY_ICONS[gateway.nombre]}</span>
            <h2 className="font-semibold">Configurar {gateway.display_name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <Shield className="w-4 h-4 inline mr-1" />
              Las credenciales se almacenan de forma segura. Deje vacío para mantener el valor actual.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Access Token</label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder={gateway.has_api_key ? '••••••••••••' : 'Ingresar API Key'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
            <input
              type="password"
              value={formData.api_secret}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
              placeholder="Ingresar API Secret"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
            <input
              type="password"
              value={formData.webhook_secret}
              onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
              placeholder={gateway.has_webhook_secret ? '••••••••••••' : 'Ingresar Webhook Secret'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Usado para verificar la firma de los webhooks</p>
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Detalle Webhook ──
function WebhookDetailModal({ webhookId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetail()
  }, [webhookId])

  const loadDetail = async () => {
    try {
      const res = await axios.get(`/api/admin/webhook-events/${webhookId}`)
      if (res.data.success) {
        setData(res.data.evento)
      }
    } catch (err) {
      toast.error('Error cargando detalle')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!data) return null

  const result = RESULT_CONFIG[data.process_result] || RESULT_CONFIG.pending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-semibold">Webhook #{data.id}</h2>
            <p className="text-sm text-gray-500">{data.gateway} - {data.event_type}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Gateway</p>
              <p className="font-medium flex items-center gap-2">
                <span>{GATEWAY_ICONS[data.gateway]}</span>
                <span className="capitalize">{data.gateway}</span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Resultado</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${result.color}`}>
                <result.icon className="w-3 h-3" />
                {result.label}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Recibido</p>
              <p className="font-medium text-sm">{new Date(data.created_at).toLocaleString('es-AR')}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Procesado</p>
              <p className="font-medium text-sm">
                {data.processed_at ? new Date(data.processed_at).toLocaleString('es-AR') : '-'}
              </p>
            </div>
          </div>

          {/* Factura asociada */}
          {data.factura_id && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Factura Asociada</p>
              <p className="font-semibold text-blue-900">#{data.factura_id} - {data.factura_periodo}</p>
              <p className="text-sm text-blue-700">{data.empresa_nombre}</p>
            </div>
          )}

          {/* Mensaje de proceso */}
          {data.process_message && (
            <div className={`p-4 rounded-lg ${
              data.process_result === 'error' ? 'bg-red-50' :
              data.process_result === 'success' ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <p className="text-xs font-medium mb-1">Mensaje</p>
              <p className="text-sm">{data.process_message}</p>
            </div>
          )}

          {/* Payload JSON */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Payload Completo</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64 text-xs">
              {JSON.stringify(data.payload, null, 2)}
            </pre>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">IP Address</p>
              <p className="font-mono">{data.ip_address || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Event ID</p>
              <p className="font-mono truncate">{data.event_id || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

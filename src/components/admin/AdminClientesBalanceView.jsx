// ===============================
// ADMIN CLIENTES PREPAGO VIEW
// Gestión de balances de clientes
// ===============================

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Users, Building2, Package, TrendingUp, TrendingDown,
  Loader2, Search, Eye, Plus, Minus, RefreshCw,
  ChevronDown, ChevronUp, History, CreditCard, FileText,
  Zap, Clock, AlertTriangle, CheckCircle, X, ArrowLeft
} from 'lucide-react'

const REPORT_TYPES = {
  completo: { label: 'Completo', color: 'indigo', icon: Zap },
  reducido: { label: 'Reducido', color: 'blue', icon: FileText },
  historico: { label: 'Histórico', color: 'purple', icon: Clock },
  actualizado: { label: 'Actualizado', color: 'orange', icon: RefreshCw }
}

export default function AdminClientesBalanceView() {
  const [clientes, setClientes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [showAjusteModal, setShowAjusteModal] = useState(null)
  const [ajusteData, setAjusteData] = useState({ report_type: 'completo', cantidad: 0, motivo: '' })
  const [ajustando, setAjustando] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [clientesRes, statsRes] = await Promise.all([
        axios.get('/api/admin/clientes-prepago'),
        axios.get('/api/admin/clientes-prepago/stats')
      ])
      if (clientesRes.data.success) setClientes(clientesRes.data.clientes)
      if (statsRes.data.success) setStats(statsRes.data.stats)
    } catch (err) {
      toast.error('Error cargando datos')
    }
    setLoading(false)
  }

  const loadClienteDetalle = async (empresaId) => {
    setLoadingDetalle(true)
    try {
      const res = await axios.get(`/api/admin/clientes-prepago/${empresaId}`)
      if (res.data.success) {
        setClienteDetalle(res.data)
        setSelectedCliente(empresaId)
      }
    } catch (err) {
      toast.error('Error cargando detalle')
    }
    setLoadingDetalle(false)
  }

  const handleAjustarBalance = async () => {
    if (!showAjusteModal || ajusteData.cantidad === 0) return
    setAjustando(true)
    try {
      const res = await axios.post(`/api/admin/clientes-prepago/${showAjusteModal}/ajustar-balance`, ajusteData)
      if (res.data.success) {
        toast.success(res.data.message)
        setShowAjusteModal(null)
        setAjusteData({ report_type: 'completo', cantidad: 0, motivo: '' })
        loadData()
        if (selectedCliente === showAjusteModal) {
          loadClienteDetalle(showAjusteModal)
        }
      } else {
        toast.error(res.data.error)
      }
    } catch (err) {
      toast.error('Error al ajustar balance')
    }
    setAjustando(false)
  }

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.identificacion || '').includes(searchTerm)
  )

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Vista de detalle de cliente
  if (selectedCliente && clienteDetalle) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setSelectedCliente(null); setClienteDetalle(null); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{clienteDetalle.empresa.nombre}</h2>
            <p className="text-sm text-gray-500">{clienteDetalle.empresa.identificacion || 'Sin ID'}</p>
          </div>
          <button
            onClick={() => { setShowAjusteModal(selectedCliente); setAjusteData({ report_type: 'completo', cantidad: 0, motivo: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Ajustar Balance
          </button>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(REPORT_TYPES).map(([type, config]) => {
            const bal = clienteDetalle.balances[type]?.balance || 0
            const Icon = config.icon
            return (
              <div key={type} className={`bg-white rounded-xl border-2 border-${config.color}-200 p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 text-${config.color}-600`} />
                  <span className="text-sm font-medium text-gray-700">{config.label}</span>
                </div>
                <p className={`text-3xl font-bold text-${config.color}-600`}>{bal}</p>
              </div>
            )
          })}
        </div>

        {/* Tabs de info */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Usuarios */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Usuarios ({clienteDetalle.usuarios.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {clienteDetalle.usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{u.nombre_completo || u.username}</p>
                    <p className="text-xs text-gray-500">{u.rol}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
              {clienteDetalle.usuarios.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Sin usuarios</p>
              )}
            </div>
          </div>

          {/* Compras recientes */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-500" />
              Compras recientes ({clienteDetalle.compras.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {clienteDetalle.compras.slice(0, 10).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{c.package_nombre}</p>
                    <p className="text-xs text-gray-500">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${c.total_paid}</p>
                    <p className="text-xs text-green-600">+{c.quantity}</p>
                  </div>
                </div>
              ))}
              {clienteDetalle.compras.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Sin compras</p>
              )}
            </div>
          </div>
        </div>

        {/* Historial de consumo */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            Historial de consumo ({clienteDetalle.consumos.length})
          </h3>
          {clienteDetalle.consumos.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Sin consumos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">CUIT</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clienteDetalle.consumos.slice(0, 20).map(c => {
                    const typeConfig = REPORT_TYPES[c.report_type] || REPORT_TYPES.completo
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{formatDate(c.used_at)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-blue-600">{c.cuit}</td>
                        <td className="px-3 py-2 text-gray-900 truncate max-w-xs">{c.razon_social || '-'}</td>
                        <td className="px-3 py-2 text-gray-500">{c.usuario_nombre || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vista principal - Lista de clientes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-indigo-600" />
            Clientes Prepago
          </h1>
          <p className="text-sm text-gray-500">Gestión de balances y consumos por empresa</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Stats globales */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
            <p className="text-indigo-100 text-xs font-medium">Total Balance</p>
            <p className="text-2xl font-bold">
              {Object.values(stats.balances_totales).reduce((a, b) => a + (b || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-gray-500 text-xs font-medium">Clientes Activos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.clientes_con_balance}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-gray-500 text-xs font-medium">Consumos (mes)</p>
            <p className="text-2xl font-bold text-blue-600">
              {Object.values(stats.consumos_mes).reduce((a, b) => a + (b || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-gray-500 text-xs font-medium">Compras (mes)</p>
            <p className="text-2xl font-bold text-green-600">{stats.compras_mes?.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-gray-500 text-xs font-medium">Ingresos (mes)</p>
            <p className="text-2xl font-bold text-emerald-600">${stats.compras_mes?.monto?.toFixed(0) || 0}</p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o ID..."
          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Empresa</th>
                <th className="px-4 py-3 text-center font-medium">Completo</th>
                <th className="px-4 py-3 text-center font-medium">Reducido</th>
                <th className="px-4 py-3 text-center font-medium">Histórico</th>
                <th className="px-4 py-3 text-center font-medium">Actualizado</th>
                <th className="px-4 py-3 text-center font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Consumos</th>
                <th className="px-4 py-3 text-center font-medium">Pagado</th>
                <th className="px-4 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClientes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{c.nombre}</p>
                      <p className="text-xs text-gray-500">{c.identificacion || '-'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded font-semibold ${c.balance_completo > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}>
                      {c.balance_completo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded font-semibold ${c.balance_reducido > 0 ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
                      {c.balance_reducido}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded font-semibold ${c.balance_historico > 0 ? 'bg-purple-100 text-purple-700' : 'text-gray-400'}`}>
                      {c.balance_historico}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded font-semibold ${c.balance_actualizado > 0 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'}`}>
                      {c.balance_actualizado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{c.total_balance}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.total_consumos}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">${c.total_pagado?.toFixed(0) || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => loadClienteDetalle(c.id)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => { setShowAjusteModal(c.id); setAjusteData({ report_type: 'completo', cantidad: 0, motivo: '' }); }}
                        className="p-2 hover:bg-green-100 rounded-lg transition"
                        title="Ajustar balance"
                      >
                        <Plus className="h-4 w-4 text-green-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No se encontraron clientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajustar Balance */}
      {showAjusteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-lg font-bold">Ajustar Balance</h3>
                <button onClick={() => setShowAjusteModal(null)} className="p-1 hover:bg-white/20 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Informe</label>
                <select
                  value={ajusteData.report_type}
                  onChange={e => setAjusteData({ ...ajusteData, report_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.entries(REPORT_TYPES).map(([type, config]) => (
                    <option key={type} value={type}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (positivo = agregar, negativo = quitar)</label>
                <input
                  type="number"
                  value={ajusteData.cantidad}
                  onChange={e => setAjusteData({ ...ajusteData, cantidad: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: 10 o -5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={ajusteData.motivo}
                  onChange={e => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: Bonificación, corrección, etc."
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowAjusteModal(null)}
                className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAjustarBalance}
                disabled={ajustando || ajusteData.cantidad === 0}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {ajustando ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  ajusteData.cantidad > 0 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />
                )}
                {ajusteData.cantidad > 0 ? `Agregar ${ajusteData.cantidad}` : ajusteData.cantidad < 0 ? `Quitar ${Math.abs(ajusteData.cantidad)}` : 'Ajustar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

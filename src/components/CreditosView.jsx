import { useState, useEffect } from 'react'
import {
  Loader2, Edit2, Save, X, CreditCard, Zap, Users, Activity,
  TrendingUp, Package
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function CreditosView() {
  const [productos, setProductos] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prodRes, statsRes] = await Promise.allSettled([
        axios.get('/api/admin/productos-creditos'),
        axios.get('/api/admin/consumo-global')
      ])
      if (prodRes.status === 'fulfilled' && prodRes.value.data.success) setProductos(prodRes.value.data.productos)
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) setStats(statsRes.value.data)
    } catch (err) { /* ignore */ }
    setLoading(false)
  }

  const saveCreditos = async (codigo) => {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) { toast.error('Valor inválido'); return }
    setSaving(true)
    try {
      const res = await axios.put(`/api/admin/productos-creditos/${codigo}`, { creditos: val })
      if (res.data.success) {
        toast.success('Créditos actualizados')
        setEditing(null)
        loadData()
      }
    } catch (err) { toast.error('Error al guardar') }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Gestión de Créditos
        </h2>
        <p className="text-sm text-gray-500">Consumo global y costos por producto</p>
      </div>

      {/* Stats globales */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Créditos consumidos (mes)</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.mes?.creditos_total?.toFixed(1) || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Operaciones (mes)</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.mes?.operaciones_total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Usuarios activos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.mes?.usuarios_activos || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de productos y créditos */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Productos y créditos</h3>
          <p className="text-xs text-gray-500">Define cuántos créditos consume cada producto</p>
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {productos.map(p => (
            <div key={p.codigo} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-[11px] font-mono text-gray-500 break-all">{p.codigo}</p>
                </div>
                {editing === p.codigo ? (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-center text-sm"
                    autoFocus
                  />
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                    {p.creditos} cr
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500">{p.descripcion || '-'}</p>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editing === p.codigo ? (
                  <>
                    <button
                      onClick={() => saveCreditos(p.codigo)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditing(p.codigo); setEditValue(String(p.creditos)) }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar créditos
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Descripción</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Créditos</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productos.map(p => (
                <tr key={p.codigo} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{p.codigo}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{p.nombre}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{p.descripcion || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    {editing === p.codigo ? (
                      <input type="number" step="0.1" min="0" value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-center text-sm" autoFocus />
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                        {p.creditos}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editing === p.codigo ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => saveCreditos(p.codigo)} disabled={saving}
                          className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditing(p.codigo); setEditValue(String(p.creditos)) }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        {stats?.productos?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Top productos (este mes)
            </h3>
            <div className="space-y-3">
              {stats.productos.map(p => {
                const maxCr = Math.max(...stats.productos.map(x => x.creditos || 0))
                const pct = maxCr > 0 ? ((p.creditos || 0) / maxCr * 100) : 0
                return (
                  <div key={p.tipo_producto}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm mb-1">
                      <span className="text-gray-700 break-words">{p.tipo_producto}</span>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <span className="text-gray-400 text-xs">{p.total} ops</span>
                        <span className="font-semibold text-blue-600">{p.creditos?.toFixed(1)} cr</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top clientes */}
        {stats?.top_clientes?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Top clientes por consumo (este mes)
            </h3>
            <div className="space-y-3">
              {stats.top_clientes.map((c, i) => (
                <div key={c.usuario_id} className="flex items-start sm:items-center justify-between gap-2 text-sm">
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                    <span className="text-gray-700 truncate">{c.nombre || `Usuario #${c.usuario_id}`}</span>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-gray-400 text-xs">{c.operaciones} ops</span>
                    <span className="font-semibold text-blue-600">{c.creditos?.toFixed(1)} cr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

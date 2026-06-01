import { useState, useEffect } from 'react'
import {
  Loader2, Edit2, Save, X, Package, Users as UsersIcon,
  DollarSign, Zap, CheckCircle, XCircle
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'ARS', symbol: '$' },
  { code: 'MXN', symbol: '$' },
  { code: 'COP', symbol: '$' },
  { code: 'PEN', symbol: 'S/' },
  { code: 'CLP', symbol: '$' },
  { code: 'UYU', symbol: '$' },
  { code: 'BRL', symbol: 'R$' },
]

export default function PlanesView() {
  const [planes, setPlanes] = useState([])
  const [suscripciones, setSuscripciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm, setPlanForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [planesRes, usersRes] = await Promise.allSettled([
        axios.get('/api/admin/planes'),
        axios.get('/api/admin/usuarios')
      ])
      if (planesRes.status === 'fulfilled' && planesRes.value.data.success) setPlanes(planesRes.value.data.planes)
      if (usersRes.status === 'fulfilled' && usersRes.value.data.success) {
        // Filtrar solo usuarios con rol 'usuario' (clientes)
        const clientes = usersRes.value.data.usuarios.filter(u => u.rol === 'usuario')
        setSuscripciones(clientes)
      }
    } catch (err) { /* ignore */ }
    setLoading(false)
  }

  const savePlan = async (planId) => {
    setSaving(true)
    try {
      const res = await axios.put(`/api/admin/planes/${planId}`, planForm)
      if (res.data.success) {
        toast.success('Plan actualizado')
        setEditingPlan(null)
        setPlanForm({})
        loadData()
      }
    } catch (err) { toast.error('Error al guardar plan') }
    setSaving(false)
  }

  const startEditPlan = (plan) => {
    setEditingPlan(plan.id)
    setPlanForm({
      creditos_mes: plan.creditos_mes,
      precio_mensual: plan.precio_mensual,
      precio_por_credito: plan.precio_por_credito,
      currency_code: plan.currency_code || 'USD',
    })
  }

  const asignarPlan = async (usuarioId, planId) => {
    try {
      const res = await axios.post('/api/admin/portal/asignar-plan', {
        usuario_id: usuarioId,
        plan_id: planId
      })
      if (res.data.success) {
        toast.success('Plan asignado')
        loadData()
      }
    } catch (err) { toast.error('Error al asignar plan') }
  }

  const getCurrencySymbol = (code) => CURRENCIES.find(c => c.code === code)?.symbol || '$'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-600" />
          Gestión de Planes
        </h2>
        <p className="text-sm text-gray-500">Configura planes, precios, créditos y moneda</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {planes.filter(p => p.activo).map(plan => {
          const sym = getCurrencySymbol(plan.currency_code)
          return (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">{plan.nombre}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {plan.currency_code || 'USD'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">{plan.descripcion || ''}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Precio mensual</span>
                  <span className="font-bold text-gray-900">{sym}{plan.precio_mensual}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Créditos incluidos</span>
                  <span className="font-bold text-blue-700">{plan.creditos_mes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Crédito extra</span>
                  <span className="text-gray-600">{sym}{plan.precio_por_credito}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla editable de planes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Configuración de planes</h3>
          <p className="text-xs text-gray-500">Edita créditos, precios y moneda de cada plan</p>
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {planes.map(plan => (
            <div key={plan.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{plan.nombre}</p>
                  <p className="text-xs text-gray-500">{plan.descripcion || ''}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  plan.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {plan.activo
                    ? <><CheckCircle className="h-3 w-3" /> Activo</>
                    : <><XCircle className="h-3 w-3" /> Inactivo</>
                  }
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Créditos/mes</p>
                  {editingPlan === plan.id ? (
                    <input
                      type="number"
                      value={planForm.creditos_mes}
                      onChange={e => setPlanForm(f => ({...f, creditos_mes: parseInt(e.target.value)}))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    <p className="font-bold text-blue-700">{plan.creditos_mes}</p>
                  )}
                </div>

                <div>
                  <p className="text-gray-400">Moneda</p>
                  {editingPlan === plan.id ? (
                    <select
                      value={planForm.currency_code}
                      onChange={e => setPlanForm(f => ({...f, currency_code: e.target.value}))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {plan.currency_code || 'USD'}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-gray-400">Precio mensual</p>
                  {editingPlan === plan.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={planForm.precio_mensual}
                      onChange={e => setPlanForm(f => ({...f, precio_mensual: parseFloat(e.target.value)}))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{getCurrencySymbol(plan.currency_code)}{plan.precio_mensual}</p>
                  )}
                </div>

                <div>
                  <p className="text-gray-400">Precio crédito extra</p>
                  {editingPlan === plan.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={planForm.precio_por_credito}
                      onChange={e => setPlanForm(f => ({...f, precio_por_credito: parseFloat(e.target.value)}))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    <p className="text-gray-600">{getCurrencySymbol(plan.currency_code)}{plan.precio_por_credito}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                {editingPlan === plan.id ? (
                  <>
                    <button
                      onClick={() => savePlan(plan.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingPlan(null)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEditPlan(plan)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar plan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[940px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Plan</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Créditos/mes</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Precio mensual</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Precio/cr extra</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Moneda</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Estado</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {planes.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{plan.nombre}</p>
                    <p className="text-xs text-gray-500">{plan.descripcion || ''}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingPlan === plan.id ? (
                      <input type="number" value={planForm.creditos_mes}
                        onChange={e => setPlanForm(f => ({...f, creditos_mes: parseInt(e.target.value)}))}
                        className="w-20 px-2 py-1 border rounded text-center text-sm" />
                    ) : (
                      <span className="font-bold text-blue-700">{plan.creditos_mes}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingPlan === plan.id ? (
                      <input type="number" step="0.01" value={planForm.precio_mensual}
                        onChange={e => setPlanForm(f => ({...f, precio_mensual: parseFloat(e.target.value)}))}
                        className="w-24 px-2 py-1 border rounded text-center text-sm" />
                    ) : (
                      <span className="font-medium text-gray-900">{getCurrencySymbol(plan.currency_code)}{plan.precio_mensual}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingPlan === plan.id ? (
                      <input type="number" step="0.01" value={planForm.precio_por_credito}
                        onChange={e => setPlanForm(f => ({...f, precio_por_credito: parseFloat(e.target.value)}))}
                        className="w-20 px-2 py-1 border rounded text-center text-sm" />
                    ) : (
                      <span className="text-gray-600">{getCurrencySymbol(plan.currency_code)}{plan.precio_por_credito}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingPlan === plan.id ? (
                      <select value={planForm.currency_code}
                        onChange={e => setPlanForm(f => ({...f, currency_code: e.target.value}))}
                        className="px-2 py-1 border rounded text-sm">
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {plan.currency_code || 'USD'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      plan.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {plan.activo
                        ? <><CheckCircle className="h-3 w-3" /> Activo</>
                        : <><XCircle className="h-3 w-3" /> Inactivo</>
                      }
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingPlan === plan.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => savePlan(plan.id)} disabled={saving}
                          className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingPlan(null)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditPlan(plan)}
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

      {/* Clientes y sus planes */}
      {suscripciones.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Clientes y planes asignados</h3>
            <p className="text-xs text-gray-500">Asigna o cambia el plan de cada cliente</p>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {suscripciones.map(u => (
              <div key={u.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{u.nombre_completo || u.username}</p>
                    <p className="text-xs text-gray-400">ID: {u.id}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                    {u.plan_nombre || 'Sin plan'}
                  </span>
                </div>

                <p className="text-xs text-gray-600 truncate">{u.email || '-'}</p>

                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) asignarPlan(u.id, parseInt(e.target.value))
                    e.target.value = ''
                  }}
                  className="w-full px-2 py-2 border rounded text-sm text-gray-600"
                >
                  <option value="" disabled>Seleccionar plan...</option>
                  {planes.filter(p => p.activo).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.creditos_mes} cr)</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Email</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Plan actual</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Cambiar plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {suscripciones.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{u.nombre_completo || u.username}</p>
                      <p className="text-xs text-gray-400">ID: {u.id}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.email || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {u.plan_nombre || 'Sin plan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        defaultValue=""
                        onChange={e => {
                          if (e.target.value) asignarPlan(u.id, parseInt(e.target.value))
                          e.target.value = ''
                        }}
                        className="px-2 py-1 border rounded text-sm text-gray-600"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {planes.filter(p => p.activo).map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} ({p.creditos_mes} cr)</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

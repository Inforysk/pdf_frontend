import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Building2, Calendar, CheckCircle2, Globe2, History, Loader2, RefreshCw, Save } from 'lucide-react'

const DEFAULT_EUR_USD = 1.2
const DEFAULT_USD_EUR = Number((1 / DEFAULT_EUR_USD).toFixed(6))

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-AR')
}

export default function AdminPricingExchangeRatesTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activatingId, setActivatingId] = useState(null)
  const [legacyMode, setLegacyMode] = useState(false)
  const [providers, setProviders] = useState([])
  const [currentGlobal, setCurrentGlobal] = useState(null)
  const [activeOverrides, setActiveOverrides] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({
    scope: 'global',
    proveedor_id: '',
    fecha_vigencia: new Date().toISOString().split('T')[0],
    eur_usd: DEFAULT_EUR_USD,
    usd_eur: DEFAULT_USD_EUR,
    motivo: '',
    activa: true,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/pricing/tasas-cambio')
      if (res.data.success) {
        setLegacyMode(false)
        setProviders(res.data.providers || [])
        setCurrentGlobal(res.data.current_global || null)
        setActiveOverrides(res.data.active_overrides || [])
        setHistory(res.data.history || [])
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          const [legacyRatesRes, providersRes] = await Promise.all([
            axios.get('/api/admin/precios-pais/tasas-cambio'),
            axios.get('/api/admin/proveedores'),
          ])

          const tasas = legacyRatesRes.data?.tasas || []
          const eurUsd = Number(tasas.find(t => t.moneda_origen === 'EUR' && t.moneda_destino === 'USD')?.tasa || DEFAULT_EUR_USD)
          const usdEur = Number(tasas.find(t => t.moneda_origen === 'USD' && t.moneda_destino === 'EUR')?.tasa || (1 / eurUsd).toFixed(6))

          setLegacyMode(true)
          setProviders(providersRes.data?.proveedores || [])
          setCurrentGlobal({
            eur_usd: eurUsd,
            usd_eur: usdEur,
            fecha_vigencia: new Date().toISOString().slice(0, 10),
          })
          setActiveOverrides([])
          setHistory([])
        } catch (legacyErr) {
          toast.error(legacyErr.response?.data?.error || 'Error cargando tasas')
        }
      } else {
        toast.error(err.response?.data?.error || 'Error cargando tasas')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEurUsdChange = (value) => {
    setForm(prev => ({
      ...prev,
      eur_usd: value,
      usd_eur: value > 0 ? Number((1 / value).toFixed(6)) : 0,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.eur_usd || form.eur_usd <= 0) {
      toast.error('La tasa EUR -> USD debe ser mayor a 0')
      return
    }
    if (form.scope === 'proveedor' && !form.proveedor_id) {
      toast.error('Selecciona un proveedor para el override')
      return
    }

    setSaving(true)
    try {
      let res
      if (legacyMode) {
        if (form.scope !== 'global') {
          toast.error('El backend activo solo soporta tasa global. Reinicia backend para usar overrides por proveedor.')
          setSaving(false)
          return
        }
        res = await axios.put('/api/admin/precios-pais/tasas-cambio', {
          tasas: [
            { moneda_origen: 'EUR', moneda_destino: 'USD', tasa: Number(form.eur_usd) },
            { moneda_origen: 'USD', moneda_destino: 'EUR', tasa: Number(form.usd_eur) },
          ],
        })
      } else {
        const payload = {
          scope: form.scope,
          proveedor_id: form.scope === 'proveedor' ? Number(form.proveedor_id) : null,
          fecha_vigencia: form.fecha_vigencia,
          eur_usd: Number(form.eur_usd),
          usd_eur: Number(form.usd_eur),
          motivo: form.motivo,
          activa: form.activa,
        }
        res = await axios.post('/api/admin/pricing/tasas-cambio', payload)
      }

      if (res.data.success) {
        toast.success('Tasa registrada correctamente')
        setForm(prev => ({
          ...prev,
          proveedor_id: '',
          motivo: '',
          activa: true,
          eur_usd: prev.scope === 'global' ? prev.eur_usd : DEFAULT_EUR_USD,
          usd_eur: prev.scope === 'global' ? prev.usd_eur : DEFAULT_USD_EUR,
        }))
        loadData()
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error guardando tasa')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id) => {
    if (legacyMode) {
      toast.error('Activación histórica no disponible en modo legacy')
      return
    }
    setActivatingId(id)
    try {
      const res = await axios.put(`/api/admin/pricing/tasas-cambio/${id}/activar`)
      if (res.data.success) {
        toast.success('Tasa activada')
        loadData()
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error activando tasa')
    } finally {
      setActivatingId(null)
    }
  }

  const visibleHistory = useMemo(() => history.slice(0, 50), [history])

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-cyan-600" />
              Tasa de Cambio
            </h4>
            <p className="text-sm text-gray-500">Configura tasa oficial EUR/USD y overrides por proveedor con historial y fecha de vigencia.</p>
            {legacyMode && (
              <p className="text-xs text-amber-700 mt-1">Modo compatibilidad activo: backend sin endpoints nuevos de pricing.</p>
            )}
          </div>
          <button onClick={loadData} className="btn-secondary text-sm flex items-center justify-center gap-1 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4 bg-cyan-50">
            <p className="text-xs uppercase tracking-wide text-cyan-700 font-semibold">Global vigente</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">1 EUR = {Number(currentGlobal?.eur_usd || DEFAULT_EUR_USD).toFixed(4)} USD</p>
            <p className="text-sm text-gray-600 mt-1">1 USD = {Number(currentGlobal?.usd_eur || DEFAULT_USD_EUR).toFixed(6)} EUR</p>
            <p className="text-xs text-gray-500 mt-2">Vigencia: {formatDate(currentGlobal?.fecha_vigencia)}</p>
          </div>

          <div className="rounded-xl border p-4 bg-white lg:col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Overrides activos por proveedor</p>
            {activeOverrides.length === 0 ? (
              <p className="text-sm text-gray-500">No hay overrides activos. Los proveedores usan la tasa global oficial.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeOverrides.map(item => (
                  <div key={item.id} className="rounded-lg border p-3 bg-amber-50 border-amber-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Building2 className="h-4 w-4 text-amber-600" />
                      {item.proveedor_codigo} - {item.proveedor_nombre}
                    </div>
                    <p className="text-sm mt-2">1 EUR = {Number(item.eur_usd).toFixed(4)} USD</p>
                    <p className="text-xs text-gray-500 mt-1">Vigencia: {formatDate(item.fecha_vigencia)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h5 className="font-medium text-gray-900 mb-3">Nueva Tasa</h5>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alcance</label>
            <select
              value={form.scope}
              onChange={e => setForm(prev => ({ ...prev, scope: e.target.value, proveedor_id: '' }))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="global">Global</option>
              <option value="proveedor">Proveedor específico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              value={form.proveedor_id}
              onChange={e => setForm(prev => ({ ...prev, proveedor_id: e.target.value }))}
              disabled={form.scope !== 'proveedor'}
              className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-100"
            >
              <option value="">Todos</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.codigo} - {provider.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha vigencia</label>
            <input
              type="date"
              value={form.fecha_vigencia}
              onChange={e => setForm(prev => ({ ...prev, fecha_vigencia: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">1 EUR = USD</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={form.eur_usd}
              onChange={e => handleEurUsdChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">1 USD = EUR</label>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={form.usd_eur}
              onChange={e => setForm(prev => ({ ...prev, usd_eur: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <div className="flex items-end">
            <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center justify-center gap-1 w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar tasa
            </button>
          </div>

          <div className="md:col-span-2 xl:col-span-5">
            <label className="block text-xs font-medium text-gray-700 mb-1">Motivo / Auditoría</label>
            <input
              type="text"
              value={form.motivo}
              onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Tasa oficial BCRA / acuerdo proveedor / ajuste mensual..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 xl:justify-end">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={e => setForm(prev => ({ ...prev, activa: e.target.checked }))}
            />
            Activar al guardar
          </label>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-5 w-5 text-gray-500" />
          <h5 className="font-medium text-gray-900">Historial</h5>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Alcance</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Proveedor</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Vigencia</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">EUR/USD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">USD/EUR</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Estado</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Motivo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Alta</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleHistory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 capitalize">{item.scope}</td>
                  <td className="px-3 py-2">{item.proveedor_codigo ? `${item.proveedor_codigo} - ${item.proveedor_nombre}` : 'Todos los proveedores'}</td>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(item.fecha_vigencia)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{Number(item.eur_usd).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(item.usd_eur).toFixed(6)}</td>
                  <td className="px-3 py-2">
                    {item.activa ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Histórica</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.motivo || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{item.created_by || '-'}<br />{formatDate(item.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    {!item.activa && (
                      <button
                        onClick={() => handleActivate(item.id)}
                        disabled={activatingId === item.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                      >
                        {activatingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, FileText, Loader2, RefreshCw, Search } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const PER_PAGE = 20

const ESTADO_STYLES = {
  precarga: 'bg-amber-100 text-amber-800 border-amber-200',
  precargado: 'bg-blue-100 text-blue-800 border-blue-200',
}

const COUNTRY_BY_TIPO = {
  CUIT: 'Argentina',
  RUT: 'Uruguay',
  RUC: 'Peru',
  RNC: 'Rep. Dominicana',
  NIT: 'Colombia',
  RTN: 'Honduras',
  RFC: 'Mexico',
  CNPJ: 'Brasil',
  'CEDULA JURIDICA': 'Costa Rica',
  DPI: 'Guatemala',
}

function inferPais(row) {
  const tipo = String(row?.tipo_identificacion || '').toUpperCase()
  return COUNTRY_BY_TIPO[tipo] || row?.pais || 'Sin definir'
}

export default function RegistrosPrecargadosView({ onIniciarInforme, onAbrirEditor }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: null, total: null, has_more: false })
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [estado, setEstado] = useState('')
  const pais = 'Argentina'
  const [openingId, setOpeningId] = useState(null)
  const [openingPdfId, setOpeningPdfId] = useState(null)
  const [prefetching, setPrefetching] = useState(false)
  const [loadingTotal, setLoadingTotal] = useState(false)
  const pageCacheRef = useRef(new Map())
  const totalCacheRef = useRef(new Map())
  const inFlightPrefetchRef = useRef(new Set())

  const filterKey = useMemo(() => `${query}::${estado}::${pais}`, [query, estado, pais])

  const buildParams = (targetPage, options = {}) => {
    const params = new URLSearchParams({ page: String(targetPage), per_page: String(PER_PAGE) })
    if (query) params.append('q', query)
    if (estado) params.append('estado', estado)
    params.append('pais', pais)
    params.append('solo_con_datos', '1')
    if (options.includeTotal) params.append('include_total', '1')
    if (options.totalsOnly) params.append('totals_only', '1')
    return params
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setQuery(searchValue.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchValue])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const cacheKey = `${filterKey}::${page}`
      const cached = pageCacheRef.current.get(cacheKey)

      if (cached) {
        setRows(cached.rows)
        const cachedTotal = totalCacheRef.current.get(filterKey)
        setPagination({
          ...cached.pagination,
          total: cachedTotal?.total ?? cached.pagination.total ?? null,
          total_pages: cachedTotal?.total_pages ?? cached.pagination.total_pages ?? null,
        })
        setLoading(false)
      } else {
        setLoading(true)
      }

      try {
        if (!cached) {
          const res = await axios.get(`/api/solicitudes-precargadas?${buildParams(page).toString()}`)
          if (cancelled) return
          if (res.data?.success) {
            const nextRows = res.data.solicitudes || []
            const nextPagination = res.data.pagination || { page: 1, total_pages: null, total: null, has_more: false }
            pageCacheRef.current.set(cacheKey, { rows: nextRows, pagination: nextPagination })
            setRows(nextRows)
            const cachedTotal = totalCacheRef.current.get(filterKey)
            setPagination({
              ...nextPagination,
              total: cachedTotal?.total ?? nextPagination.total ?? null,
              total_pages: cachedTotal?.total_pages ?? nextPagination.total_pages ?? null,
            })
          } else {
            toast.error(res.data?.error || 'No se pudieron cargar los registros precargados')
            return
          }
        }

        if (!totalCacheRef.current.has(filterKey)) {
          setLoadingTotal(true)
          axios
            .get(`/api/solicitudes-precargadas?${buildParams(1, { includeTotal: true, totalsOnly: true }).toString()}`)
            .then((res) => {
              if (cancelled || !res.data?.success) return
              const nextPagination = res.data.pagination || {}
              const totalInfo = {
                total: nextPagination.total ?? null,
                total_pages: nextPagination.total_pages ?? null,
              }
              totalCacheRef.current.set(filterKey, totalInfo)
              setPagination((prev) => ({
                ...prev,
                total: totalInfo.total,
                total_pages: totalInfo.total_pages,
              }))
            })
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setLoadingTotal(false)
            })
        }

        const currentPageData = pageCacheRef.current.get(cacheKey)
        const currentHasMore = currentPageData?.pagination?.has_more
        const nextPage = page + 1
        const nextCacheKey = `${filterKey}::${nextPage}`
        if (currentHasMore && !pageCacheRef.current.has(nextCacheKey) && !inFlightPrefetchRef.current.has(nextCacheKey)) {
          inFlightPrefetchRef.current.add(nextCacheKey)
          setPrefetching(true)
          axios
            .get(`/api/solicitudes-precargadas?${buildParams(nextPage).toString()}`)
            .then((res) => {
              if (!res.data?.success) return
              pageCacheRef.current.set(nextCacheKey, {
                rows: res.data.solicitudes || [],
                pagination: res.data.pagination || { page: nextPage, total_pages: null, total: null, has_more: false },
              })
            })
            .catch(() => {})
            .finally(() => {
              inFlightPrefetchRef.current.delete(nextCacheKey)
              if (!cancelled && inFlightPrefetchRef.current.size === 0) setPrefetching(false)
            })
        }
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.error || 'Error al cargar registros precargados')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [page, query, estado, pais])

  const statsLabel = useMemo(() => {
    if (pagination.total != null) {
      const total = Number(pagination.total || 0)
      return `${total.toLocaleString()} registros totales` + (estado ? ` en ${estado}` : '') + (pais ? ` · ${pais}` : '')
    }
    return `${rows.length.toLocaleString()} registros del lote actual` + (estado ? ` en ${estado}` : '') + (pais ? ` · ${pais}` : '')
  }, [pagination.total, rows.length, estado, pais])

  const loadedPagesForFilter = useMemo(() => {
    let count = 0
    for (const key of pageCacheRef.current.keys()) {
      if (key.startsWith(`${filterKey}::`)) count += 1
    }
    return count
  }, [filterKey, rows, pagination])

  const handleOpenEditor = async (row) => {
    if (onAbrirEditor) {
      await onAbrirEditor(row)
      return
    }
    if (!onIniciarInforme) return
    setOpeningId(row.id)
    try {
      await onIniciarInforme({
        ...row,
        solicitud_source: 'solicitudes_investigacion',
        view_source: 'registros-precargados',
      })
    } catch (error) {
      toast.error(error?.response?.data?.error || 'No se pudo abrir el editor')
    } finally {
      setOpeningId(null)
    }
  }

  const handleOpenPdf = async (row) => {
    if (!row?.id) {
      toast.error('Registro sin ID de solicitud')
      return
    }

    setOpeningPdfId(row.id)
    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams({ lang: 'es' })
      if (token) params.append('token', token)
      const pdfUrl = `/api/solicitudes-investigacion/${row.id}/pdf?${params.toString()}`
      const win = window.open(pdfUrl, '_blank', 'noopener,noreferrer')
      if (!win) {
        const a = document.createElement('a')
        a.href = pdfUrl
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Error al abrir PDF')
    } finally {
      setOpeningPdfId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registros Precargados</h2>
            <p className="text-sm text-gray-500 mt-1">Solo CUIT argentinos con datos cargados para generar informe.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[700px]">
            <label className="flex-1 relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar por razon social o identificador"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-inforysk-navy-200"
              />
            </label>
            <select
              value={estado}
              onChange={(e) => {
                setPage(1)
                setEstado(e.target.value)
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-inforysk-navy-200"
            >
              <option value="">Todos los estados</option>
              <option value="precarga">Precarga</option>
              <option value="precargado">Precargado</option>
            </select>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
              Argentina
            </div>
            <button
              onClick={() => {
                setSearchValue('')
                setQuery('')
                setEstado('')
                setPage(1)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex flex-col gap-1">
            <span>{statsLabel}</span>
            <span className="text-xs text-gray-400">
              Mostrando {rows.length.toLocaleString()} registros por pagina. {loadingTotal ? 'Calculando total...' : `Lotes listos: ${loadedPagesForFilter}`}
              {prefetching ? ' · Precargando siguiente lote...' : ''}
            </span>
          </div>
          <span>
            Pagina {pagination.page || 1}
            {pagination.total_pages ? ` de ${pagination.total_pages}` : ''}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-gray-500 gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando registros precargados...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            No hay registros para los filtros seleccionados.
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Identificador</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pais</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    return (
                      <tr key={row.id} className="hover:bg-gray-50/70">
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[row.estado] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {row.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-gray-900">{row.razon_social || 'Sin razon social'}</div>
                          <div className="text-xs text-gray-500 mt-1">ID #{row.id}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700">{row.cuit || '-'}</td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700">{inferPais(row)}</td>
                        <td className="px-4 py-3 align-top text-sm text-gray-700">{row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditor(row)}
                              disabled={openingId === row.id}
                              className="inline-flex items-center gap-2 rounded-lg bg-inforysk-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-inforysk-navy-800 disabled:opacity-60"
                            >
                              {openingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                              Abrir editor
                            </button>
                            <button
                              onClick={() => handleOpenPdf(row)}
                              disabled={openingPdfId === row.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Ver PDF del informe"
                            >
                              {openingPdfId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                              Ver PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-100">
              {rows.map((row) => {
                return (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{row.razon_social || 'Sin razon social'}</div>
                        <div className="text-sm text-gray-500 mt-1">{row.cuit || '-'} · {inferPais(row)}</div>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[row.estado] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {row.estado}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleOpenEditor(row)}
                        disabled={openingId === row.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-inforysk-navy-900 px-3 py-2 text-sm font-medium text-white hover:bg-inforysk-navy-800 disabled:opacity-60"
                      >
                        {openingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Abrir editor
                      </button>
                      <button
                        onClick={() => handleOpenPdf(row)}
                        disabled={openingPdfId === row.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {openingPdfId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        Ver PDF
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 bg-gray-50">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            {rows.length
              ? `Mostrando pagina ${pagination.page}${pagination.total_pages ? ` de ${pagination.total_pages}` : ''}`
              : 'Sin resultados'}
          </span>
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || !pagination.has_more}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

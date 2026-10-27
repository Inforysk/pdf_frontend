import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, Search } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const PER_PAGE = 20

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

function asObject(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatArgentinaCuit(value) {
  const digits = onlyDigits(value)
  if (digits.length !== 11) return value || '-'
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

function formatIdentifier(row, pais) {
  if (pais === 'Argentina' || String(row?.tipo_identificacion || '').toUpperCase() === 'CUIT') {
    return formatArgentinaCuit(row?.cuit)
  }
  return row?.cuit || '-'
}

function getEnrichment(row) {
  const datos = asObject(row?.datos_externos)
  return {
    datos,
    meta: asObject(datos.auto_enrichment_ar || datos.auto_enrichment_pe),
    metaAr: asObject(datos.auto_enrichment_ar),
    metaPe: asObject(datos.auto_enrichment_pe),
    autofill: asObject(datos.autofill_ar || datos.autofill_pe),
    autofillAr: asObject(datos.autofill_ar),
    autofillPe: asObject(datos.autofill_pe),
    afip: asObject(datos.afip),
    sunat: asObject(datos.sunat),
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-AR')
}

function getDisplayDate(row) {
  const { meta } = getEnrichment(row)
  return meta.completed_at || meta.last_attempt_at || row?.updated_at || row?.created_at
}

function getValidationInfo(row, pais) {
  const { afip, sunat, autofill, autofillPe, metaPe } = getEnrichment(row)
  if (pais === 'Peru' || String(row?.tipo_identificacion || '').toUpperCase() === 'RUC') {
    const estado = String(sunat.estado || '').trim()
    const condicion = String(sunat.condicion || '').trim()
    const hasSunat = Boolean(metaPe.completed_at || sunat.razon_social || estado || condicion || Object.keys(autofillPe).length)
    if (!hasSunat) return { label: 'Sin SUNAT', className: 'bg-gray-100 text-gray-500 border-gray-200', title: 'Sin validación SUNAT cargada' }
    const ok = estado.toUpperCase() === 'ACTIVO' && condicion.toUpperCase() === 'HABIDO'
    const label = ok ? 'SUNAT OK' : `SUNAT ${estado || condicion || 'obs.'}`
    const detail = [estado && `Estado: ${estado}`, condicion && `Condición: ${condicion}`, sunat.departamento && `Depto: ${sunat.departamento}`].filter(Boolean).join(' · ')
    return {
      label,
      className: ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200',
      title: detail || 'SUNAT cargado',
    }
  }

  const bcra = asObject(afip.bcra)
  const relaciones = String(autofill.relaciones_bancarias_riesgo || '')
  const hasBcra = Boolean(Object.keys(bcra).length || relaciones)
  if (!hasBcra) return { label: 'Sin BCRA', className: 'bg-gray-100 text-gray-500 border-gray-200', title: 'Sin datos BCRA cargados' }

  const situacion = bcra.peor_situacion || (relaciones.match(/Situacion[^:]*:\s*([1-5])/i)?.[1]) || ''
  const monto = Number(bcra.monto_total_deuda || 0)
  const entidades = bcra.cant_entidades || (relaciones.match(/Entidades[^:]*:\s*(\d+)/i)?.[1]) || ''
  const situacionNum = Number(situacion || 0)
  const isDebt = monto > 0 || situacionNum > 1
  const label = isDebt
    ? `BCRA ${situacion || '?'} · ${monto > 0 ? monto.toLocaleString('es-AR') : 'deuda'}`
    : `BCRA ${situacion || 'OK'}${entidades ? ` · ${entidades} ent.` : ''}`
  const className = isDebt
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return { label, className, title: relaciones || 'BCRA cargado' }
}

function buildPageItems(currentPage, totalPages) {
  const total = Number(totalPages || 0)
  const current = Number(currentPage || 1)
  if (!total || total <= 1) return [1]
  const pages = new Set([1, total])
  for (let page = Math.max(1, current - 2); page <= Math.min(total, current + 2); page += 1) {
    pages.add(page)
  }
  if (current <= 3) {
    for (let page = 1; page <= Math.min(total, 5); page += 1) pages.add(page)
  }
  if (current >= total - 2) {
    for (let page = Math.max(1, total - 4); page <= total; page += 1) pages.add(page)
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('...')
    result.push(page)
  })
  return result
}

export default function RegistrosPrecargadosView() {
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: null, total: null, has_more: false })
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [estado, setEstado] = useState('')
  const [pais, setPais] = useState('')
  const [openingPdfId, setOpeningPdfId] = useState(null)
  const [prefetching, setPrefetching] = useState(false)
  const [loadingTotal, setLoadingTotal] = useState(false)
  const pageCacheRef = useRef(new Map())
  const totalCacheRef = useRef(new Map())
  const inFlightPrefetchRef = useRef(new Set())
  const requestAbortRef = useRef(null)

  const filterKey = useMemo(() => `${query}::${estado}::${pais}`, [query, estado, pais])

  const buildParams = (targetPage, options = {}) => {
    const params = new URLSearchParams({ page: String(targetPage), per_page: String(PER_PAGE) })
    if (query) params.append('q', query)
    if (estado) params.append('estado', estado)
    if (pais) params.append('pais', pais)
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
      if (requestAbortRef.current) {
        requestAbortRef.current.abort()
      }
      const controller = new AbortController()
      requestAbortRef.current = controller

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
        setSearching(false)
      } else {
        setSearching(true)
        if (!rows.length) setLoading(true)
      }

      try {
        if (!cached) {
          const res = await axios.get(`/api/solicitudes-precargadas?${buildParams(page).toString()}`, { signal: controller.signal })
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
            .get(`/api/solicitudes-precargadas?${buildParams(1, { includeTotal: true, totalsOnly: true }).toString()}`, { signal: controller.signal })
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
            .get(`/api/solicitudes-precargadas?${buildParams(nextPage).toString()}`, { signal: controller.signal })
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
        if (!cancelled && error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          toast.error(error.response?.data?.error || 'Error al cargar registros precargados')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setSearching(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
      if (requestAbortRef.current) {
        requestAbortRef.current.abort()
      }
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

  const pageItems = useMemo(() => buildPageItems(pagination.page || page, pagination.total_pages), [pagination.page, pagination.total_pages, page])
  const paisLabel = pais || 'todos los países'
  const estadoLabel = estado || 'todos los estados'

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
            <p className="text-sm text-gray-500 mt-1">Registros precargados con datos validados para generar informe.</p>
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
            <select
              value={pais}
              onChange={(e) => {
                setPage(1)
                setPais(e.target.value)
                pageCacheRef.current.clear()
                totalCacheRef.current.clear()
              }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">Todos los países</option>
              <option value="Argentina">Argentina</option>
              <option value="Peru">Perú</option>
            </select>
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
              {searching ? ' · Buscando...' : ''}
            </span>
          </div>
          <span>
            Pagina {pagination.page || 1}
            {pagination.total_pages ? ` de ${pagination.total_pages}` : ''}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {searching && !loading && (
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-sm text-sky-700 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Actualizando listado para {paisLabel} · {estadoLabel}...
          </div>
        )}

        {loading ? (
          <div className="py-16 flex items-center justify-center text-gray-500 gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando registros precargados...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {searching ? `Cargando registros de ${paisLabel}...` : 'No hay registros para los filtros seleccionados.'}
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Identificador</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pais</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Validación</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actualizado</th>
                    <th className="w-[130px] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const validationInfo = getValidationInfo(row, pais)
                    return (
                      <tr key={row.id} className="hover:bg-gray-50/70">
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-gray-900">{row.razon_social || 'Sin razon social'}</div>
                          <div className="text-xs text-gray-500 mt-1">ID #{row.id}</div>
                        </td>
                        <td className="px-3 py-3 align-top text-sm font-medium text-gray-800">{formatIdentifier(row, pais)}</td>
                        <td className="px-3 py-3 align-top text-sm text-gray-700">{inferPais(row)}</td>
                        <td className="px-3 py-3 align-top">
                          <span title={validationInfo.title} className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${validationInfo.className}`}>
                            {validationInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top text-sm text-gray-700">{formatDate(getDisplayDate(row))}</td>
                        <td className="w-[130px] px-3 py-3 align-top">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenPdf(row)}
                              disabled={openingPdfId === row.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
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
                const validationInfo = getValidationInfo(row, pais)
                return (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{row.razon_social || 'Sin razon social'}</div>
                        <div className="text-sm text-gray-500 mt-1">{formatIdentifier(row, pais)} · {inferPais(row)} · {formatDate(getDisplayDate(row))}</div>
                        <span title={validationInfo.title} className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${validationInfo.className}`}>
                          {validationInfo.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
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

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
            {rows.length ? pageItems.map((item, index) => (
              item === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  disabled={loading || item === page}
                  className={`min-w-[36px] rounded-lg border px-3 py-2 font-medium ${item === page ? 'border-inforysk-navy-900 bg-inforysk-navy-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'} disabled:cursor-default`}
                >
                  {item}
                </button>
              )
            )) : (
              <span className="text-sm text-gray-500">Sin resultados</span>
            )}
          </div>
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

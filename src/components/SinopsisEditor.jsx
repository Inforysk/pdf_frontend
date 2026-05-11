import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { Plus, X, Search, Sparkles, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'

const CATEGORIA_LABELS = {
  origen: 'Origen',
  contable: 'Info Contable',
  antecedentes: 'Antecedentes',
  aptitud: 'Aptitud Crediticia',
  garantias: 'Garantías',
  personalizado: 'Personalizado',
}

const CATEGORIA_COLORS = {
  origen: 'bg-blue-50 border-blue-200 text-blue-700',
  contable: 'bg-purple-50 border-purple-200 text-purple-700',
  antecedentes: 'bg-amber-50 border-amber-200 text-amber-700',
  aptitud: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  garantias: 'bg-rose-50 border-rose-200 text-rose-700',
  personalizado: 'bg-gray-50 border-gray-200 text-gray-700',
}

export default function SinopsisEditor({ value, onChange, readOnly, sinopsisInfo }) {
  const [items, setItems] = useState([])
  const [showOriginal, setShowOriginal] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCategoria, setNewCategoria] = useState('personalizado')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [allItems, setAllItems] = useState({})
  const [showCatalog, setShowCatalog] = useState(false)
  const [expandedCats, setExpandedCats] = useState({})
  const [initialized, setInitialized] = useState(false)
  const searchTimeoutRef = useRef(null)

  // ═══ INICIALIZACIÓN: Usar items del backend si están disponibles ═══
  useEffect(() => {
    if (initialized) return

    // Prioridad 1: items del backend (ya vienen separados por categoría)
    if (sinopsisInfo?.items?.length > 0) {
      const parsed = sinopsisInfo.items.map((item, idx) => ({
        id: `backend-${idx}-${Date.now()}`,
        text: item.texto,
        categoria: item.categoria,
      }))
      setItems(parsed)
      setInitialized(true)
      return
    }

    // Prioridad 2: parsear el valor HTML/texto
    if (value) {
      const parsed = parseHtmlToItems(value)
      if (parsed.length > 0) {
        setItems(parsed)
      }
    }
    setInitialized(true)
  }, [sinopsisInfo, value, initialized])

  // Cargar catálogo de items
  useEffect(() => {
    axios.get('/api/sinopsis-items')
      .then(res => {
        if (res.data.success) setAllItems(res.data.items)
      })
      .catch(() => {})
  }, [])

  // ═══ PARSEAR HTML → ITEMS ═══
  function parseHtmlToItems(html) {
    if (!html) return []
    const clean = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim()

    if (!clean) return []

    return clean.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map((text, idx) => ({
        id: `parsed-${idx}-${Date.now()}`,
        text,
        categoria: detectCategoria(text),
      }))
  }

  // ═══ SINCRONIZAR ITEMS → HTML (para guardar en BD) ═══
  const syncToParent = useCallback((newItems) => {
    if (!onChange) return
    const html = newItems.map(item => `<p>${item.text}</p>`).join('')
    onChange(html)
  }, [onChange])

  // ═══ DETECTAR CATEGORÍA POR HEURÍSTICA ═══
  function detectCategoria(text) {
    const t = text.toUpperCase()
    if (t.includes('INICIADORA') || t.includes('CONSTITUIDA') || t.includes('CONTINUADORA') || t.includes('OPERA DESDE')) return 'origen'
    if (t.includes('CONTABLE') || t.includes('BALANCE') || t.includes('FACILITAN') || t.includes('FINANCIER')) return 'contable'
    if (t.includes('ANTECEDENTES') || t.includes('NEGATIVOS') || t.includes('OBJECIONES') || t.includes('MALOS')) return 'antecedentes'
    if (t.includes('APTA') || t.includes('CRÉDITOS') || t.includes('CREDITOS') || t.includes('IMPORTANCIA')) return 'aptitud'
    if (t.includes('GARANTÍAS') || t.includes('GARANTIAS') || t.includes('AVALES')) return 'garantias'
    return 'personalizado'
  }

  // ═══ ACCIONES SOBRE ITEMS ═══
  function removeItem(id) {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    syncToParent(updated)
  }

  function moveItem(idx, direction) {
    const newItems = [...items]
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= newItems.length) return
    ;[newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]]
    setItems(newItems)
    syncToParent(newItems)
  }

  function addCustomItem() {
    if (!newText.trim()) return
    const item = {
      id: `custom-${Date.now()}`,
      text: newText.trim(),
      categoria: newCategoria,
    }
    const updated = [...items, item]
    setItems(updated)
    syncToParent(updated)

    // Guardar en BD como modelo reutilizable
    axios.post('/api/sinopsis-items', {
      texto: newText.trim(),
      categoria: newCategoria,
    }).then(() => {
      // Refrescar catálogo
      axios.get('/api/sinopsis-items').then(res => {
        if (res.data.success) setAllItems(res.data.items)
      }).catch(() => {})
    }).catch(() => {})

    setNewText('')
    setShowAddInput(false)
  }

  function addFromCatalog(catalogItem) {
    let texto = catalogItem.texto
    if (texto.includes('{anio}')) {
      const anio = prompt('Ingrese el año de constitución:')
      if (!anio) return
      texto = texto.replace('{anio}', anio)
    }
    if (texto.includes('{fecha}')) {
      const fecha = prompt('Ingrese la fecha del balance (ej: 31/12/2025):')
      if (!fecha) return
      texto = texto.replace('{fecha}', fecha)
    }

    const item = {
      id: `catalog-${Date.now()}`,
      text: texto,
      categoria: catalogItem.categoria || detectCategoria(texto),
    }
    const updated = [...items, item]
    setItems(updated)
    syncToParent(updated)
    setShowCatalog(false)
    setShowSearch(false)
    setSearchQuery('')

    if (catalogItem.id) {
      axios.put(`/api/sinopsis-items/${catalogItem.id}/frecuencia`).catch(() => {})
    }
  }

  // ═══ TOGGLE ORIGINAL ← → ESTRUCTURADO ═══
  function toggleOriginal() {
    if (showOriginal) {
      // Volver a la versión estructurada
      if (sinopsisInfo?.items?.length > 0) {
        const parsed = sinopsisInfo.items.map((item, idx) => ({
          id: `restore-${idx}-${Date.now()}`,
          text: item.texto,
          categoria: item.categoria,
        }))
        setItems(parsed)
        syncToParent(parsed)
      }
    } else {
      // Mostrar texto original como un solo bloque
      if (sinopsisInfo?.original) {
        const singleItem = [{
          id: `original-${Date.now()}`,
          text: sinopsisInfo.original,
          categoria: 'personalizado',
        }]
        setItems(singleItem)
        syncToParent(singleItem)
      }
    }
    setShowOriginal(!showOriginal)
  }

  // ═══ BÚSQUEDA CON @ ═══
  function handleSearchInput(e) {
    const val = e.target.value
    setSearchQuery(val)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (val.length < 2) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      axios.get(`/api/sinopsis-items/search?q=${encodeURIComponent(val)}`)
        .then(res => {
          if (res.data.success) setSearchResults(res.data.items)
        })
        .catch(() => {})
    }, 300)
  }

  function toggleCat(cat) {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  // ═══ RENDER: SOLO LECTURA ═══
  if (readOnly) {
    return (
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-gray-400 italic">Sin sinopsis</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-2 rounded-lg border text-sm ${CATEGORIA_COLORS[item.categoria] || CATEGORIA_COLORS.personalizado}`}
          >
            <span className="text-[10px] font-semibold uppercase opacity-60 mr-2">
              {CATEGORIA_LABELS[item.categoria] || item.categoria}
            </span>
            {item.text}
          </div>
        ))}
      </div>
    )
  }

  // ═══ RENDER: MODO EDICIÓN ═══
  return (
    <div className="space-y-2">
      {/* Toggle original / estructurado */}
      {sinopsisInfo?.mejorado && (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={toggleOriginal}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
          >
            <RotateCcw className="h-3 w-3" />
            {showOriginal ? 'Ver versión estructurada' : 'Ver texto original del PDF'}
          </button>
          {showOriginal && (
            <span className="text-gray-400 italic">Mostrando texto original</span>
          )}
        </div>
      )}

      {/* Items actuales */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`group flex items-start gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${CATEGORIA_COLORS[item.categoria] || CATEGORIA_COLORS.personalizado}`}
        >
          {!showOriginal && (
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity mt-0.5">
              <button
                type="button"
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                className="text-[10px] leading-none hover:text-black disabled:opacity-20"
                title="Mover arriba"
              >▲</button>
              <button
                type="button"
                onClick={() => moveItem(idx, 1)}
                disabled={idx === items.length - 1}
                className="text-[10px] leading-none hover:text-black disabled:opacity-20"
                title="Mover abajo"
              >▼</button>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] font-semibold uppercase opacity-60 mr-1.5">
              {CATEGORIA_LABELS[item.categoria] || item.categoria}
            </span>
            <span>{item.text}</span>
          </div>
          {!showOriginal && (
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0 mt-0.5"
              title="Eliminar item"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {/* Placeholder vacío */}
      {items.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed rounded-lg">
          <Sparkles className="h-5 w-5 mx-auto mb-1 opacity-50" />
          Sin items de sinopsis. Agregue usando los botones de abajo.
        </div>
      )}

      {/* Barra de acciones (solo en modo estructurado) */}
      {!showOriginal && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setShowAddInput(!showAddInput); setShowSearch(false); setShowCatalog(false) }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              showAddInput
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar texto
          </button>

          <button
            type="button"
            onClick={() => { setShowSearch(!showSearch); setShowAddInput(false); setShowCatalog(false) }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              showSearch
                ? 'bg-violet-100 border-violet-300 text-violet-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            @ Buscar frase
          </button>

          <button
            type="button"
            onClick={() => { setShowCatalog(!showCatalog); setShowAddInput(false); setShowSearch(false) }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              showCatalog
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Catálogo
          </button>
        </div>
      )}

      {/* Panel: Agregar texto libre */}
      {showAddInput && !showOriginal && (
        <div className="border rounded-lg p-3 bg-blue-50/50 space-y-2">
          <div className="flex gap-2">
            <select
              value={newCategoria}
              onChange={e => setNewCategoria(e.target.value)}
              className="text-xs border rounded px-2 py-1.5 bg-white"
            >
              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomItem()}
              placeholder="Escriba la frase a agregar..."
              className="flex-1 text-sm border rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddInput(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={addCustomItem}
              disabled={!newText.trim()}
              className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-3 w-3" />
              Agregar y guardar como modelo
            </button>
          </div>
        </div>
      )}

      {/* Panel: Búsqueda con @ */}
      {showSearch && !showOriginal && (
        <div className="border rounded-lg p-3 bg-violet-50/50 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="Buscar por palabra clave... (ej: crédito, balance, garantía)"
              className="w-full text-sm border rounded pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
              autoFocus
            />
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {searchResults.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => addFromCatalog({ ...item, categoria: item.categoria })}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-violet-100 transition-colors flex items-start gap-2"
                >
                  <span className={`flex-shrink-0 inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${CATEGORIA_COLORS[item.categoria] || CATEGORIA_COLORS.personalizado}`}>
                    {CATEGORIA_LABELS[item.categoria] || item.categoria}
                  </span>
                  <span className="flex-1">{item.texto}</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">
              Sin resultados para "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Panel: Catálogo completo */}
      {showCatalog && !showOriginal && (
        <div className="border rounded-lg p-3 bg-emerald-50/50 space-y-1 max-h-64 overflow-y-auto">
          {Object.entries(allItems).length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">Cargando catálogo...</p>
          )}
          {Object.entries(allItems).map(([cat, catItems]) => (
            <div key={cat}>
              <button
                type="button"
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase py-1.5 hover:text-gray-900"
              >
                {expandedCats[cat] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {CATEGORIA_LABELS[cat] || cat}
                <span className="text-gray-400 font-normal ml-1">({catItems.length})</span>
              </button>
              {expandedCats[cat] && (
                <div className="pl-4 space-y-1 pb-1">
                  {catItems.map(item => (
                    <button
                      type="button"
                      key={item.id || item.clave}
                      onClick={() => addFromCatalog({ ...item, categoria: cat })}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded border hover:shadow-sm transition-all ${CATEGORIA_COLORS[cat] || CATEGORIA_COLORS.personalizado}`}
                    >
                      {item.texto}
                      {item.es_personalizado && (
                        <span className="ml-1.5 text-[9px] opacity-50">(personalizado)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

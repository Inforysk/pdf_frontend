import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X, ChevronDown, Check, Plus } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import formasLegalesData from '../data/formasLegales.json'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * Selector de formas legales/tipos societarios por país
 * Muestra las opciones según el país detectado
 * Permite agregar formas personalizadas que se guardan en BD
 */
export default function FormaLegalSelector({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Seleccionar forma legal...',
  className = '',
  countryCode = null, // Código ISO del país (AR, UY, BR, etc.)
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFormaLegal, setNewFormaLegal] = useState('')
  const [customFormas, setCustomFormas] = useState([])
  const [savingNew, setSavingNew] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const addInputRef = useRef(null)

  // Obtener datos de formas legales según el país (predefinidas)
  const paisData = countryCode && formasLegalesData[countryCode]
  const formasPredefinidas = paisData?.formas || []

  // Cargar formas personalizadas del backend
  useEffect(() => {
    if (countryCode) {
      loadCustomFormas()
    }
  }, [countryCode])

  const loadCustomFormas = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/formas-legales/${countryCode}`)
      if (res.data?.formas) {
        setCustomFormas(res.data.formas)
      }
    } catch (err) {
      // Silencioso - si falla, solo usar las predefinidas
      console.log('No se pudieron cargar formas personalizadas:', err.message)
    }
  }

  // Combinar predefinidas + personalizadas (evitar duplicados)
  const formasDisponibles = useMemo(() => {
    const predefinedDescs = new Set(formasPredefinidas.map(f => f.descripcion.toLowerCase()))
    const uniqueCustom = customFormas.filter(f => !predefinedDescs.has(f.descripcion.toLowerCase()))
    return [...formasPredefinidas, ...uniqueCustom]
  }, [formasPredefinidas, customFormas])

  // Normalizar texto para búsqueda (quitar acentos)
  const normalizeText = (text) => {
    if (!text) return ''
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  // Filtrar formas por búsqueda
  const filteredFormas = useMemo(() => {
    if (!search.trim()) return formasDisponibles
    const searchNorm = normalizeText(search)
    return formasDisponibles.filter(forma => {
      const descNorm = normalizeText(forma.descripcion)
      const codeNorm = normalizeText(forma.codigo)
      return descNorm.includes(searchNorm) || codeNorm.includes(searchNorm)
    })
  }, [formasDisponibles, search])

  // Ordenar: seleccionado primero
  const sortedFormas = useMemo(() => {
    return [...filteredFormas].sort((a, b) => {
      const aSelected = a.descripcion === value ? 1 : 0
      const bSelected = b.descripcion === value ? 1 : 0
      return bSelected - aSelected
    })
  }, [filteredFormas, value])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearch('')
        setShowAddForm(false)
        setNewFormaLegal('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus en input de agregar cuando se muestra
  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [showAddForm])

  // Seleccionar una forma
  const handleSelect = (forma) => {
    onChange(forma.descripcion)
    setIsOpen(false)
    setSearch('')
    setShowAddForm(false)
  }

  // Limpiar selección
  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
  }

  // Mostrar formulario para agregar nuevo
  const handleShowAddForm = () => {
    setShowAddForm(true)
    setSearch('')
  }

  // Guardar nueva forma legal
  const handleSaveNewForma = async () => {
    const trimmed = newFormaLegal.trim()
    if (!trimmed) {
      toast.error('Ingrese un nombre válido')
      return
    }

    // Verificar que no existe ya
    const exists = formasDisponibles.some(
      f => f.descripcion.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) {
      toast.error('Esta forma legal ya existe en la lista')
      return
    }

    setSavingNew(true)
    try {
      await axios.post(`${API_BASE}/api/formas-legales`, {
        codigo_pais: countryCode,
        descripcion: trimmed
      })
      
      // Agregar a la lista local
      setCustomFormas(prev => [...prev, { codigo: `CUSTOM_${Date.now()}`, descripcion: trimmed }])
      
      // Seleccionar la nueva forma
      onChange(trimmed)
      
      toast.success('Forma legal agregada')
      setNewFormaLegal('')
      setShowAddForm(false)
      setIsOpen(false)
    } catch (err) {
      console.error('Error al guardar forma legal:', err)
      // Aunque falle el guardado en BD, permitir usar el valor
      onChange(trimmed)
      setNewFormaLegal('')
      setShowAddForm(false)
      setIsOpen(false)
      toast('Forma legal aplicada (sin guardar en historial)', { icon: '⚠️' })
    } finally {
      setSavingNew(false)
    }
  }

  // Si no hay país detectado, mostrar input simple
  if (!countryCode || !paisData) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`field-input ${className}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input principal */}
      <div
        className={`field-input flex items-center justify-between cursor-pointer min-h-[38px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {value || (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {value && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              title="Limpiar"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Buscador */}
          {!showAddForm && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Buscar en ${paisData.pais}...`}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                  autoFocus
                />
              </div>
              <div className="text-xs text-gray-400 mt-1 px-1">
                {formasDisponibles.length} formas legales disponibles
              </div>
            </div>
          )}

          {/* Formulario para agregar nuevo */}
          {showAddForm ? (
            <div className="p-3 border-b border-gray-100">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Agregar nueva forma legal para {paisData.pais}
              </div>
              <input
                ref={addInputRef}
                type="text"
                value={newFormaLegal}
                onChange={(e) => setNewFormaLegal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewForma()
                  if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewFormaLegal('')
                  }
                }}
                placeholder="Ej: Sociedad Anónima Especial"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNewForma}
                  disabled={savingNew || !newFormaLegal.trim()}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingNew ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewFormaLegal('')
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Lista de formas */}
              <div className="overflow-y-auto max-h-52">
                {sortedFormas.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">
                    No se encontraron resultados
                  </div>
                ) : (
                  sortedFormas.map((forma, index) => {
                    const selected = forma.descripcion === value
                    return (
                      <div
                        key={forma.codigo || `forma-${index}`}
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          selected 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelect(forma)}
                      >
                        <div className={`w-4 h-4 flex items-center justify-center rounded border ${
                          selected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm flex-1">{forma.descripcion}</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Opción "Otro" para agregar manualmente */}
              <div className="border-t border-gray-100">
                <div
                  className="px-3 py-2.5 cursor-pointer flex items-center gap-2 hover:bg-amber-50 text-amber-700"
                  onClick={handleShowAddForm}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Otro (agregar manualmente)</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

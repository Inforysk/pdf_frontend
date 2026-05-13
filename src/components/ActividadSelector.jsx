import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X, ChevronDown, Check, Plus } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import actividadesAR from '../data/actividadesF883.json'
import actividadesUY from '../data/actividadesUY.json'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Mapeo de actividades por país
const ACTIVIDADES_POR_PAIS = {
  AR: actividadesAR,
  UY: actividadesUY,
}

/**
 * Selector de actividades económicas
 * Soporta Argentina (AFIP F883) y Uruguay (BPS)
 * Permite agregar actividades personalizadas que se guardan en BD
 */
export default function ActividadSelector({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Seleccionar actividad...',
  multiple = true, // Permite múltiples actividades
  className = '',
  country = 'AR', // 'AR' para Argentina, 'UY' para Uruguay
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customActividades, setCustomActividades] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newActividad, setNewActividad] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const addInputRef = useRef(null)

  // Obtener datos de actividades base según el país
  const actividadesBase = ACTIVIDADES_POR_PAIS[country] || actividadesAR

  // Cargar actividades personalizadas del país
  useEffect(() => {
    if (country) {
      loadCustomActividades()
    }
  }, [country])

  const loadCustomActividades = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/actividades/${country}`)
      if (res.data.success && res.data.actividades) {
        setCustomActividades(res.data.actividades)
      }
    } catch (err) {
      // Silencioso - no es crítico
      console.log('No se pudieron cargar actividades custom:', err.message)
    }
  }

  // Combinar actividades base + personalizadas
  const actividadesData = useMemo(() => {
    if (customActividades.length === 0) return actividadesBase
    
    // Agregar las custom al final, evitando duplicados
    const baseDescSet = new Set(actividadesBase.map(a => a.descripcion.toLowerCase()))
    const uniqueCustom = customActividades.filter(
      c => !baseDescSet.has(c.descripcion.toLowerCase())
    )
    return [...actividadesBase, ...uniqueCustom]
  }, [actividadesBase, customActividades])

  // Parsear el valor actual (puede ser "descripcion" o múltiples separados por "; ")
  const selectedActivities = useMemo(() => {
    if (!value) return []
    
    // Separar por "; " para múltiples actividades
    const parts = value.split(/;\s*/).filter(Boolean)
    
    return parts.map(part => {
      // Buscar por código si tiene formato "codigo - descripcion"
      const codeMatch = part.match(/^(\d{6})\s*[-–]\s*(.+)$/)
      if (codeMatch) {
        const found = actividadesData.find(a => a.codigo === codeMatch[1])
        if (found) return found
      }
      
      // Buscar por descripción exacta o parcial
      const found = actividadesData.find(a => 
        a.descripcion.toLowerCase() === part.trim().toLowerCase() ||
        a.descripcion.toLowerCase().includes(part.trim().toLowerCase())
      )
      if (found) return found
      
      // Si no se encuentra, crear objeto temporal con la descripción
      return { codigo: '', descripcion: part.trim(), descripcion_larga: '' }
    }).filter(Boolean)
  }, [value])

  // Normalizar texto: quitar acentos y convertir a minúsculas
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
  }

  // Filtrar actividades por búsqueda y poner seleccionadas primero
  const filteredActivities = useMemo(() => {
    let results
    if (!search.trim()) {
      results = actividadesData.slice(0, 100) // Mostrar primeras 100 si no hay búsqueda
    } else {
      const searchNorm = normalizeText(search)
      const searchTerms = searchNorm.split(/\s+/).filter(Boolean)
      
      results = actividadesData.filter(act => {
        const fullText = normalizeText(`${act.codigo} ${act.descripcion} ${act.descripcion_larga}`)
        return searchTerms.every(term => fullText.includes(term))
      }).slice(0, 100) // Limitar a 100 resultados
    }
    
    // Ordenar: seleccionadas primero
    const selectedCodes = new Set(selectedActivities.map(a => a.codigo))
    const selectedDescs = new Set(selectedActivities.map(a => normalizeText(a.descripcion)))
    
    return results.sort((a, b) => {
      const aSelected = selectedCodes.has(a.codigo) || selectedDescs.has(normalizeText(a.descripcion))
      const bSelected = selectedCodes.has(b.codigo) || selectedDescs.has(normalizeText(b.descripcion))
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return 0
    })
  }, [search, selectedActivities])

  // Cerrar dropdown al clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setShowAddForm(false)
        setNewActividad('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus en input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && inputRef.current && !showAddForm) {
      inputRef.current.focus()
    }
  }, [isOpen, showAddForm])

  // Focus en input de agregar cuando se muestra
  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [showAddForm])

  // Guardar nueva actividad personalizada
  const handleSaveNewActividad = async () => {
    const trimmed = newActividad.trim()
    if (!trimmed) {
      toast.error('Ingrese una descripción válida')
      return
    }

    // Verificar que no existe ya
    const exists = actividadesData.some(
      a => a.descripcion.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) {
      toast.error('Esta actividad ya existe en la lista')
      return
    }

    setSavingNew(true)
    try {
      await axios.post(`${API_BASE}/api/actividades`, {
        codigo_pais: country,
        descripcion: trimmed
      })
      
      // Agregar a la lista local
      const newAct = { codigo: `CUSTOM_${Date.now()}`, descripcion: trimmed, descripcion_larga: '' }
      setCustomActividades(prev => [...prev, newAct])
      
      // Seleccionar la nueva actividad
      if (multiple) {
        const newValue = [...selectedActivities.map(a => a.descripcion), trimmed].join('; ')
        onChange(newValue)
      } else {
        onChange(trimmed)
      }
      
      toast.success('Actividad agregada')
      setNewActividad('')
      setShowAddForm(false)
      if (!multiple) setIsOpen(false)
    } catch (err) {
      console.error('Error al guardar actividad:', err)
      // Aunque falle el guardado en BD, permitir usar el valor
      if (multiple) {
        const newValue = [...selectedActivities.map(a => a.descripcion), trimmed].join('; ')
        onChange(newValue)
      } else {
        onChange(trimmed)
      }
      setNewActividad('')
      setShowAddForm(false)
      if (!multiple) setIsOpen(false)
      toast('Actividad aplicada (sin guardar en historial)', { icon: '⚠️' })
    } finally {
      setSavingNew(false)
    }
  }

  const handleSelect = (activity) => {
    if (multiple) {
      const isSelected = selectedActivities.some(a => a.codigo === activity.codigo)
      let newSelected
      if (isSelected) {
        newSelected = selectedActivities.filter(a => a.codigo !== activity.codigo)
      } else {
        newSelected = [...selectedActivities, activity]
      }
      // Formatear solo con descripción para que se vea limpio en el PDF
      const newValue = newSelected.map(a => a.descripcion).join('; ')
      onChange(newValue)
    } else {
      onChange(activity.descripcion)
      setIsOpen(false)
    }
    setSearch('')
  }

  const removeActivity = (activity, e) => {
    e.stopPropagation()
    const newSelected = selectedActivities.filter(a => 
      a.descripcion.toLowerCase() !== activity.descripcion.toLowerCase()
    )
    const newValue = newSelected.map(a => a.descripcion).join('; ')
    onChange(newValue)
  }

  const isSelected = (activity) => selectedActivities.some(a => 
    a.codigo === activity.codigo || 
    a.descripcion.toLowerCase() === activity.descripcion.toLowerCase()
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Campo de selección */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[42px] p-2 border rounded-md cursor-pointer flex flex-wrap items-center gap-1.5 transition-all ${
          disabled 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
            : isOpen 
              ? 'border-indigo-500 ring-2 ring-indigo-200' 
              : 'border-gray-300 hover:border-gray-400'
        } ${!value ? 'bg-amber-50 border-amber-200' : ''}`}
      >
        {selectedActivities.length > 0 ? (
          selectedActivities.map((act, idx) => (
            <span
              key={act.codigo || idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-medium cursor-help"
              title={act.descripcion_larga || act.descripcion}
            >
              {act.codigo && <span className="text-indigo-400 font-mono text-[10px]">{act.codigo}</span>}
              <span className="max-w-[250px] truncate">{act.descripcion}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeActivity(act, e)}
                  className="ml-0.5 p-0.5 hover:bg-indigo-200 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
        
        {!disabled && (
          <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
          {/* Barra de búsqueda */}
          <div className="p-2 border-b border-gray-100 bg-white shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código o descripción..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {search 
                ? `${filteredActivities.length} actividades encontradas`
                : `${actividadesData.length} actividades disponibles (escribe para buscar)`
              }
            </p>
          </div>

          {/* Lista de actividades - área scrolleable */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {filteredActivities.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">
                No se encontraron actividades
              </p>
            ) : (
              filteredActivities.map((act) => {
                const selected = isSelected(act)
                const tooltipText = act.descripcion_larga || act.descripcion
                return (
                  <div
                    key={act.codigo}
                    onClick={() => handleSelect(act)}
                    className={`px-3 py-2 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors ${
                      selected
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox visual */}
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selected 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      
                      <span 
                        className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 cursor-help"
                        title={tooltipText}
                      >
                        {act.codigo}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm text-gray-800 leading-tight truncate cursor-help"
                          title={tooltipText}
                        >
                          {act.descripcion}
                        </p>
                        {act.descripcion_larga && act.descripcion_larga !== act.descripcion && (
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight line-clamp-2">
                            {act.descripcion_larga}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Opción para agregar texto libre */}
          {search && !filteredActivities.some(a => a.descripcion.toLowerCase() === search.toLowerCase()) && !showAddForm && (
            <div
              onClick={() => {
                const customValue = multiple
                  ? [...selectedActivities.map(a => a.descripcion), search].join('; ')
                  : search
                onChange(customValue)
                setSearch('')
                if (!multiple) setIsOpen(false)
              }}
              className="px-3 py-2 border-t border-gray-100 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-600 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Agregar "{search}" como texto libre
            </div>
          )}

          {/* Formulario para agregar nueva actividad */}
          {showAddForm ? (
            <div className="p-3 border-t border-gray-100 bg-gray-50 shrink-0">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Agregar nueva actividad para {country === 'AR' ? 'Argentina' : country === 'UY' ? 'Uruguay' : country}
              </div>
              <input
                ref={addInputRef}
                type="text"
                value={newActividad}
                onChange={(e) => setNewActividad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNewActividad()
                  if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewActividad('')
                  }
                }}
                placeholder="Ej: Comercio al por menor de artículos varios"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-indigo-400 mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNewActividad}
                  disabled={savingNew || !newActividad.trim()}
                  className="flex-1 px-3 py-1.5 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingNew ? 'Guardando...' : 'Guardar y seleccionar'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewActividad('')
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Esta actividad se guardará para uso futuro (opcional)
              </p>
            </div>
          ) : (
            /* Opción "Otro" para agregar manualmente - siempre visible */
            <div className="border-t border-gray-100 bg-white shrink-0">
              <div
                className="px-3 py-2.5 cursor-pointer flex items-center gap-2 hover:bg-amber-50 text-amber-700"
                onClick={() => {
                  setShowAddForm(true)
                  setSearch('')
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Otro (agregar manualmente - opcional)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

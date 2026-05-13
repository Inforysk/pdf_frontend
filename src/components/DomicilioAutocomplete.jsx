import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Search, X, Check, Loader2, AlertCircle, Navigation, Edit3 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para el icono de Leaflet en Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Componente para actualizar la vista del mapa
function ChangeView({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 16)
    }
  }, [center, map])
  return null
}

/**
 * Componente de autocompletado de direcciones usando Photon API (OpenStreetMap)
 * 100% gratis, sin API key
 * Incluye mini-mapa visual y soporte para entrada manual
 * 
 * Props:
 * - value: string - Dirección actual
 * - onChange: (address: string) => void - Callback cuando cambia la dirección
 * - onCoordinatesChange: (coords: {lat, lng} | null) => void - Callback con coordenadas
 * - countryCode: string - Código de país para filtrar (AR, UY, BR, etc.)
 * - disabled: boolean
 * - placeholder: string
 */
export default function DomicilioAutocomplete({
  value = '',
  onChange,
  onCoordinatesChange,
  countryCode = '',
  disabled = false,
  placeholder = 'Escriba una dirección...',
  className = '',
}) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidated, setIsValidated] = useState(false)
  const [coordinates, setCoordinates] = useState(null)
  const [error, setError] = useState(null)
  const [showManualCoords, setShowManualCoords] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [showMap, setShowMap] = useState(false)
  
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Mapeo de códigos de país a nombres para Photon
  const COUNTRY_NAMES = {
    AR: 'Argentina',
    UY: 'Uruguay',
    BR: 'Brazil',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    MX: 'Mexico',
    EC: 'Ecuador',
    PY: 'Paraguay',
    VE: 'Venezuela',
    BO: 'Bolivia',
    PA: 'Panama',
    CR: 'Costa Rica',
    DO: 'Dominican Republic',
    HN: 'Honduras',
    GT: 'Guatemala',
    SV: 'El Salvador',
    NI: 'Nicaragua',
    US: 'United States',
    ES: 'Spain',
  }

  // Sincronizar valor externo
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
      // Si el valor viene de afuera y no está validado, resetear estado
      if (value && !isValidated) {
        setIsValidated(false)
        setCoordinates(null)
      }
    }
  }, [value])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar direcciones con Photon API
  const searchAddresses = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Photon API - gratuita, basada en OpenStreetMap
      // Nota: solo soporta idiomas: default, de, en, fr (no español)
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Error al buscar direcciones')
      }

      const data = await response.json()
      
      // Filtrar por país si es necesario
      let features = data.features || []
      
      if (countryCode && COUNTRY_NAMES[countryCode]) {
        const countryName = COUNTRY_NAMES[countryCode]
        features = features.filter(f => 
          f.properties?.country?.toLowerCase() === countryName.toLowerCase()
        )
      }

      // Formatear resultados
      const formatted = features.map(f => {
        const props = f.properties || {}
        const coords = f.geometry?.coordinates || []
        
        // Construir dirección formateada
        const parts = []
        if (props.name) parts.push(props.name)
        if (props.housenumber) parts.push(props.housenumber)
        if (props.street && !parts.includes(props.street)) parts.push(props.street)
        if (props.city || props.locality) parts.push(props.city || props.locality)
        if (props.state) parts.push(props.state)
        if (props.country) parts.push(props.country)

        return {
          id: `${coords[1]}-${coords[0]}`,
          address: parts.join(', ') || props.name || 'Dirección sin nombre',
          lat: coords[1],
          lng: coords[0],
          type: props.osm_type || 'place',
          details: {
            street: props.street,
            housenumber: props.housenumber,
            city: props.city || props.locality,
            state: props.state,
            country: props.country,
            postcode: props.postcode,
          }
        }
      }).filter(s => s.address && s.lat && s.lng)

      setSuggestions(formatted)
      
      if (formatted.length > 0) {
        setIsOpen(true)
      }
    } catch (err) {
      console.error('Error buscando direcciones:', err)
      setError('No se pudieron cargar sugerencias')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [countryCode])

  // Manejar cambio de input con debounce
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsValidated(false)
    setCoordinates(null)
    onChange(newValue)
    
    // Notificar que no hay coordenadas
    if (onCoordinatesChange) {
      onCoordinatesChange(null)
    }

    // Debounce de 300ms para no hacer muchas peticiones
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue)
    }, 300)
  }

  // Seleccionar una sugerencia
  const handleSelect = (suggestion) => {
    setInputValue(suggestion.address)
    onChange(suggestion.address)
    setIsValidated(true)
    setCoordinates({ lat: suggestion.lat, lng: suggestion.lng })
    setSuggestions([])
    setIsOpen(false)
    setShowMap(true)

    // Notificar coordenadas
    if (onCoordinatesChange) {
      onCoordinatesChange({
        lat: suggestion.lat,
        lng: suggestion.lng,
        details: suggestion.details
      })
    }
  }

  // Guardar coordenadas manuales
  const handleSaveManualCoords = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    
    if (isNaN(lat) || isNaN(lng)) {
      setError('Coordenadas inválidas')
      return
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Coordenadas fuera de rango')
      return
    }
    
    setCoordinates({ lat, lng })
    setIsValidated(true)
    setShowManualCoords(false)
    setShowMap(true)
    setError(null)
    
    if (onCoordinatesChange) {
      onCoordinatesChange({ lat, lng })
    }
  }

  // Usar dirección manual (sin buscar en Photon)
  const handleUseManualAddress = () => {
    if (inputValue.trim()) {
      setIsValidated(true)
      setSuggestions([])
      setIsOpen(false)
      // Mantener como válida aunque no tenga coordenadas exactas
    }
  }

  // Limpiar
  const handleClear = () => {
    setInputValue('')
    onChange('')
    setIsValidated(false)
    setCoordinates(null)
    setSuggestions([])
    if (onCoordinatesChange) {
      onCoordinatesChange(null)
    }
    inputRef.current?.focus()
  }

  // Validar dirección actual manualmente (buscar y tomar la primera)
  const handleValidate = async () => {
    if (!inputValue || inputValue.length < 3) return
    
    setIsLoading(true)
    try {
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(inputValue)}&limit=1`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const f = data.features[0]
        const coords = f.geometry?.coordinates || []
        if (coords.length >= 2) {
          setIsValidated(true)
          setCoordinates({ lat: coords[1], lng: coords[0] })
          if (onCoordinatesChange) {
            onCoordinatesChange({ lat: coords[1], lng: coords[0] })
          }
        }
      }
    } catch (err) {
      console.error('Error validando:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input principal */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="w-4 h-4" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-24 py-2.5 
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
            transition-all
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${isValidated ? 'border-green-400 bg-green-50' : 'border-gray-300'}
            ${error ? 'border-red-300' : ''}
          `}
        />

        {/* Indicadores a la derecha */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          
          {isValidated && !isLoading && (
            <div className="flex items-center gap-1 text-green-600 text-xs bg-green-100 px-1.5 py-0.5 rounded">
              <Check className="w-3 h-3" />
              <span>OK</span>
            </div>
          )}
          
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              title="Limpiar"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Botones de acción debajo del input */}
      {inputValue && !disabled && !isValidated && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleValidate}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 hover:bg-blue-50 rounded flex items-center gap-1"
            title="Buscar en OpenStreetMap"
          >
            <Search className="w-3 h-3" />
            Buscar ubicación
          </button>
          
          <button
            type="button"
            onClick={handleUseManualAddress}
            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border border-gray-200 hover:bg-gray-50 rounded flex items-center gap-1"
            title="Usar dirección sin validar"
          >
            <Check className="w-3 h-3" />
            Usar sin coords
          </button>
          
          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 border border-purple-200 hover:bg-purple-50 rounded flex items-center gap-1"
            title="Ingresar lat/lng de Google Maps"
          >
            <Navigation className="w-3 h-3" />
            Coords manuales
          </button>
        </div>
      )}

      {/* Formulario de coordenadas manuales */}
      {showManualCoords && (
        <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-purple-700 mb-2">
            📍 Copia las coordenadas de Google Maps (clic derecho → "¿Qué hay aquí?")
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Latitud</label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="-34.603722"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Longitud</label>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="-58.381592"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowManualCoords(false)}
              className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveManualCoords}
              className="text-xs px-3 py-1 bg-purple-600 text-white hover:bg-purple-700 rounded"
            >
              Guardar coordenadas
            </button>
          </div>
        </div>
      )}

      {/* Info de coordenadas + botón mapa */}
      {coordinates && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            <span>Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {showMap ? 'Ocultar mapa' : 'Ver mapa'}
          </button>
        </div>
      )}

      {/* Mini-mapa */}
      {showMap && coordinates && (
        <div className="mt-2 h-48 rounded-lg overflow-hidden border border-gray-200">
          <MapContainer
            center={[coordinates.lat, coordinates.lng]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[coordinates.lat, coordinates.lng]} />
            <ChangeView center={[coordinates.lat, coordinates.lng]} />
          </MapContainer>
        </div>
      )}

      {/* Botón para editar coordenadas existentes */}
      {coordinates && isValidated && !showManualCoords && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => {
              setManualLat(coordinates.lat.toString())
              setManualLng(coordinates.lng.toString())
              setShowManualCoords(true)
            }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Editar coordenadas
          </button>
        </div>
      )}

      {/* Dropdown de sugerencias */}
      {isOpen && suggestions.length > 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Search className="w-3 h-3" />
              <span>{suggestions.length} sugerencias encontradas</span>
              {countryCode && COUNTRY_NAMES[countryCode] && (
                <span className="ml-auto text-blue-600">
                  {COUNTRY_NAMES[countryCode]}
                </span>
              )}
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-56">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className="px-3 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-tight">
                      {suggestion.address}
                    </p>
                    {suggestion.details?.postcode && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        CP: {suggestion.details.postcode}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center">
              Datos de OpenStreetMap • Seleccione una opción
            </p>
          </div>
        </div>
      )}

      {/* Mensaje si no hay sugerencias */}
      {isOpen && suggestions.length === 0 && inputValue.length >= 3 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-sm">No se encontraron sugerencias</p>
            <p className="text-xs text-gray-400 mt-1">
              Puedes usar "Coords manuales" para ingresar lat/lng de Google Maps
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

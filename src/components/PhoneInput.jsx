import { useState, useRef, useEffect } from 'react'
import { Phone, X, AlertCircle, CheckCircle } from 'lucide-react'

// Códigos de país con banderas (usando código ISO para flagcdn)
// minDigits y maxDigits para validación
const COUNTRY_CODES = [
  { code: 'AR', dial: '+54', name: 'Argentina', format: '11 XXXX-XXXX', minDigits: 10, maxDigits: 11 },
  { code: 'UY', dial: '+598', name: 'Uruguay', format: '9X XXX XXX', minDigits: 8, maxDigits: 9 },
  { code: 'BR', dial: '+55', name: 'Brasil', format: '11 9XXXX-XXXX', minDigits: 10, maxDigits: 11 },
  { code: 'CL', dial: '+56', name: 'Chile', format: '9 XXXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: 'CO', dial: '+57', name: 'Colombia', format: '3XX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: 'PE', dial: '+51', name: 'Perú', format: '9XX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: 'MX', dial: '+52', name: 'México', format: '55 XXXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: 'EC', dial: '+593', name: 'Ecuador', format: '9X XXX XXXX', minDigits: 9, maxDigits: 10 },
  { code: 'PY', dial: '+595', name: 'Paraguay', format: '9XX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: 'VE', dial: '+58', name: 'Venezuela', format: '4XX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: 'BO', dial: '+591', name: 'Bolivia', format: '7XXX XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'PA', dial: '+507', name: 'Panamá', format: '6XXX-XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'CR', dial: '+506', name: 'Costa Rica', format: 'XXXX-XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'DO', dial: '+1809', name: 'Rep. Dominicana', format: 'XXX-XXXX', minDigits: 7, maxDigits: 10 },
  { code: 'HN', dial: '+504', name: 'Honduras', format: 'XXXX-XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'GT', dial: '+502', name: 'Guatemala', format: 'XXXX-XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'SV', dial: '+503', name: 'El Salvador', format: 'XXXX-XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'NI', dial: '+505', name: 'Nicaragua', format: 'XXXX-XXXX', minDigits: 8, maxDigits: 8 },
  { code: 'US', dial: '+1', name: 'Estados Unidos', format: '(XXX) XXX-XXXX', minDigits: 10, maxDigits: 10 },
  { code: 'ES', dial: '+34', name: 'España', format: '6XX XXX XXX', minDigits: 9, maxDigits: 9 },
]

// Validar número según país
const validatePhoneNumber = (number, country) => {
  if (!number) return { valid: true, message: '' } // Vacío es válido (no requerido)
  
  const digits = number.replace(/\D/g, '')
  const minDigits = country?.minDigits || 7
  const maxDigits = country?.maxDigits || 15
  
  if (digits.length < minDigits) {
    return { valid: false, message: `Mínimo ${minDigits} dígitos` }
  }
  if (digits.length > maxDigits) {
    return { valid: false, message: `Máximo ${maxDigits} dígitos` }
  }
  
  return { valid: true, message: '' }
}

/**
 * Componente de entrada de teléfono con código de país
 * Por defecto usa el país del informe, con opción de ingresar código manual
 */
export default function PhoneInput({
  value = '',
  onChange,
  countryCode = 'AR',
  disabled = false,
  placeholder = '',
  isPrincipal = false,
  onRemove,
  canRemove = false,
  className = '',
}) {
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [localNumber, setLocalNumber] = useState('')
  const [validation, setValidation] = useState({ valid: true, message: '' })
  
  const inputRef = useRef(null)

  // Parsear valor inicial
  useEffect(() => {
    if (value) {
      const cleanValue = value.replace(/\s/g, '')
      
      // Buscar si empieza con algún código conocido
      let found = false
      for (const country of COUNTRY_CODES) {
        if (cleanValue.startsWith(country.dial)) {
          setSelectedCountry(country)
          setLocalNumber(cleanValue.slice(country.dial.length))
          found = true
          break
        }
      }
      
      if (!found) {
        if (cleanValue.startsWith('+')) {
          const match = cleanValue.match(/^(\+\d+)(.*)$/)
          if (match) {
            setIsManualMode(true)
            setManualCode(match[1])
            setLocalNumber(match[2])
          }
        } else {
          const defaultCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
          setSelectedCountry(defaultCountry)
          setLocalNumber(cleanValue)
        }
      }
    } else {
      const defaultCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
      setSelectedCountry(defaultCountry)
      setLocalNumber('')
    }
  }, [])

  // Auto-seleccionar país cuando cambia countryCode
  useEffect(() => {
    if (!value && countryCode) {
      const country = COUNTRY_CODES.find(c => c.code === countryCode)
      if (country) {
        setSelectedCountry(country)
        setIsManualMode(false)
      }
    }
  }, [countryCode])

  const buildFullNumber = (dialCode, number) => {
    if (!number) return ''
    const cleanNumber = number.replace(/\D/g, '')
    return `${dialCode}${cleanNumber}`
  }

  const handleNumberChange = (e) => {
    // Solo permitir números
    let newNumber = e.target.value.replace(/\D/g, '')
    
    // Limitar al máximo de dígitos del país
    const country = isManualMode ? null : selectedCountry
    const maxDigits = country?.maxDigits || 15
    if (newNumber.length > maxDigits) {
      newNumber = newNumber.slice(0, maxDigits)
    }
    
    setLocalNumber(newNumber)
    
    const dialCode = isManualMode ? manualCode : (selectedCountry?.dial || '+54')
    const fullNumber = buildFullNumber(dialCode, newNumber)
    onChange(fullNumber)
    
    // Validar
    setValidation(validatePhoneNumber(newNumber, country))
  }

  const toggleManualMode = () => {
    if (isManualMode) {
      // Volver al modo normal
      const defaultCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
      setSelectedCountry(defaultCountry)
      setIsManualMode(false)
      setManualCode('')
      const fullNumber = buildFullNumber(defaultCountry.dial, localNumber)
      onChange(fullNumber)
      setValidation(validatePhoneNumber(localNumber, defaultCountry))
    } else {
      // Activar modo manual
      setIsManualMode(true)
      setSelectedCountry(null)
      setManualCode('+')
      setValidation(validatePhoneNumber(localNumber, null))
    }
  }

  const handleManualCodeChange = (e) => {
    let code = e.target.value
    if (!code.startsWith('+')) code = '+' + code
    code = '+' + code.slice(1).replace(/[^\d]/g, '')
    setManualCode(code)
    
    const fullNumber = buildFullNumber(code, localNumber)
    onChange(fullNumber)
  }

  const currentDialCode = isManualMode ? manualCode : (selectedCountry?.dial || '+54')
  const currentFormat = selectedCountry?.format || 'XXXX-XXXX'
  const currentMaxDigits = isManualMode ? 15 : (selectedCountry?.maxDigits || 15)

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2">
        {/* Código de país */}
        {isManualMode ? (
          // Modo manual: input para código
          <input
            type="text"
            value={manualCode}
            onChange={handleManualCodeChange}
            disabled={disabled}
            placeholder="+XX"
            className="w-20 px-2 py-2.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none bg-white"
          />
        ) : (
          // Modo normal: bandera y código estático
          <div className="flex items-center gap-1.5 px-2.5 py-2.5 bg-gray-100 border border-gray-300 rounded-lg min-w-[90px]">
            {selectedCountry && (
              <img 
                src={`https://flagcdn.com/24x18/${selectedCountry.code.toLowerCase()}.png`}
                alt={selectedCountry.name}
                className="w-6 h-4 object-cover rounded-sm"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <span className="text-sm font-medium text-gray-700">{currentDialCode}</span>
          </div>
        )}

        {/* Input de número */}
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Phone className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={currentMaxDigits}
            value={localNumber}
            onChange={handleNumberChange}
            disabled={disabled}
            placeholder={placeholder || currentFormat}
            className={`
              w-full pl-10 pr-20 py-2.5 
              border rounded-lg
              focus:outline-none focus:ring-2 
              transition-all
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${!validation.valid && localNumber ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'}
            `}
          />
          
          {/* Badge Principal */}
          {isPrincipal && localNumber && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
              Principal
            </span>
          )}
        </div>

        {/* Botón eliminar */}
        {canRemove && !disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar teléfono"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Link para cambiar modo y mensaje de validación */}
      <div className="flex items-center justify-between mt-1.5">
        {!disabled && (
          <button
            type="button"
            onClick={toggleManualMode}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            {isManualMode ? '← Usar código del país' : '¿Otro código? Ingresar manualmente'}
          </button>
        )}
        
        {/* Mensaje de validación */}
        {!validation.valid && localNumber && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validation.message}
          </span>
        )}
        {validation.valid && localNumber && localNumber.length >= (selectedCountry?.minDigits || 7) && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Válido ({localNumber.length}/{currentMaxDigits})
          </span>
        )}
        {validation.valid && localNumber && localNumber.length > 0 && localNumber.length < (selectedCountry?.minDigits || 7) && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            {localNumber.length}/{currentMaxDigits} dígitos
          </span>
        )}
      </div>
    </div>
  )
}

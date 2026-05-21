import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Check, ChevronDown, Copy, Info, Loader2, Plus, Search, Trash2, Users, X } from 'lucide-react'
import rolesCatalog from '../data/corporate_roles_es.json'
import ProgressModal from './ui/ProgressModal'

// Steps de búsqueda de coincidencias
const SEARCH_STEPS = [
  { time: 0, msg: 'Iniciando búsqueda de coincidencias...' },
  { time: 2, msg: 'Analizando sinopsis e historia...' },
  { time: 4, msg: 'Revisando estructuras societarias...' },
  { time: 6, msg: 'Buscando en composición de capital...' },
  { time: 8, msg: 'Verificando sociedades vinculadas...' },
  { time: 10, msg: 'Comparando relaciones bancarias...' },
  { time: 12, msg: 'Consolidando resultados...' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE PAÍSES Y DOCUMENTOS DE IDENTIDAD
// ═══════════════════════════════════════════════════════════════════════════════
const PAISES_DOCUMENTO = [
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷', tipoDoc: 'DNI', placeholder: 'Ej: 12.345.678', regex: /^\d{1,2}\.?\d{3}\.?\d{3}$/, format: 'AR' },
  { codigo: 'UY', nombre: 'Uruguay', bandera: '🇺🇾', tipoDoc: 'C.I.', placeholder: 'Ej: 1.234.567-8', regex: /^\d{1}\.?\d{3}\.?\d{3}-?\d$/, format: 'UY' },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱', tipoDoc: 'RUN', placeholder: 'Ej: 12.345.678-9', regex: /^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/, format: 'CL' },
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴', tipoDoc: 'C.C.', placeholder: 'Ej: 1.234.567.890', regex: /^\d{6,10}$/, format: 'CO' },
  { codigo: 'VE', nombre: 'Venezuela', bandera: '🇻🇪', tipoDoc: 'C.I.', placeholder: 'Ej: V-12.345.678', regex: /^[VEJGvejg]-?\d{1,2}\.?\d{3}\.?\d{3}$/, format: 'VE' },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪', tipoDoc: 'DNI', placeholder: 'Ej: 12345678', regex: /^\d{8}$/, format: 'PE' },
  { codigo: 'EC', nombre: 'Ecuador', bandera: '🇪🇨', tipoDoc: 'C.I.', placeholder: 'Ej: 1234567890', regex: /^\d{10}$/, format: 'EC' },
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽', tipoDoc: 'CURP/INE', placeholder: 'Ej: CURP o INE', regex: /^[A-Z]{4}\d{6}[A-Z]{6}\d{2}$|^\d{13}$/, format: 'MX' },
  { codigo: 'BR', nombre: 'Brasil', bandera: '🇧🇷', tipoDoc: 'CPF', placeholder: 'Ej: 123.456.789-00', regex: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, format: 'BR' },
  { codigo: 'PA', nombre: 'Panamá', bandera: '🇵🇦', tipoDoc: 'Cédula', placeholder: 'Ej: 8-123-456', regex: /^\d{1,2}-?\d{1,4}-?\d{1,6}$/, format: 'PA' },
  { codigo: 'CR', nombre: 'Costa Rica', bandera: '🇨🇷', tipoDoc: 'Cédula', placeholder: 'Ej: 1-1234-5678', regex: /^\d-?\d{4}-?\d{4}$/, format: 'CR' },
  { codigo: 'GT', nombre: 'Guatemala', bandera: '🇬🇹', tipoDoc: 'DPI', placeholder: 'Ej: 1234 56789 0101', regex: /^\d{4}\s?\d{5}\s?\d{4}$/, format: 'GT' },
  { codigo: 'HN', nombre: 'Honduras', bandera: '🇭🇳', tipoDoc: 'DNI', placeholder: 'Ej: 0801-1990-12345', regex: /^\d{4}-?\d{4}-?\d{5}$/, format: 'HN' },
  { codigo: 'NI', nombre: 'Nicaragua', bandera: '🇳🇮', tipoDoc: 'Cédula', placeholder: 'Ej: 001-010190-0001A', regex: /^\d{3}-?\d{6}-?\d{4}[A-Za-z]?$/, format: 'NI' },
  { codigo: 'SV', nombre: 'El Salvador', bandera: '🇸🇻', tipoDoc: 'DUI', placeholder: 'Ej: 12345678-9', regex: /^\d{8}-?\d$/, format: 'SV' },
  { codigo: 'DO', nombre: 'Rep. Dominicana', bandera: '🇩🇴', tipoDoc: 'Cédula', placeholder: 'Ej: 001-1234567-8', regex: /^\d{3}-?\d{7}-?\d$/, format: 'DO' },
  { codigo: 'BO', nombre: 'Bolivia', bandera: '🇧🇴', tipoDoc: 'C.I.', placeholder: 'Ej: 12345678', regex: /^\d{5,10}$/, format: 'BO' },
  { codigo: 'PY', nombre: 'Paraguay', bandera: '🇵🇾', tipoDoc: 'C.I.', placeholder: 'Ej: 1.234.567', regex: /^\d{1}\.?\d{3}\.?\d{3}$/, format: 'PY' },
  { codigo: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸', tipoDoc: 'Passport', placeholder: 'Ej: 123456789', regex: /^[A-Z0-9]{6,9}$/, format: 'US' },
  { codigo: 'DE', nombre: 'Alemania', bandera: '🇩🇪', tipoDoc: 'Passport', placeholder: 'Passport number', regex: /^[A-Z0-9]{9}$/, format: 'DE' },
  { codigo: 'ES', nombre: 'España', bandera: '🇪🇸', tipoDoc: 'DNI/NIE', placeholder: 'Ej: 12345678X', regex: /^\d{8}[A-Z]$|^[XYZ]\d{7}[A-Z]$/, format: 'ES' },
  { codigo: 'IT', nombre: 'Italia', bandera: '🇮🇹', tipoDoc: 'Codice Fiscale', placeholder: 'Ej: RSSMRA85M01H501Z', regex: /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/, format: 'IT' },
  { codigo: 'XX', nombre: 'Otro', bandera: '🌍', tipoDoc: 'Pasaporte', placeholder: 'Número de pasaporte', regex: /^.{5,20}$/, format: 'XX' },
]

const getPaisInfo = (codigo) => PAISES_DOCUMENTO.find(p => p.codigo === codigo) || PAISES_DOCUMENTO.find(p => p.codigo === 'XX')

/**
 * Formatea un número de documento según el país
 * @param {string} value - Valor sin formato
 * @param {string} pais - Código de país
 * @returns {string} Valor formateado
 */
const formatDocumento = (value, pais) => {
  if (!value) return ''
  const digits = value.replace(/[^\dA-Za-z]/g, '').toUpperCase()
  
  switch (pais) {
    case 'AR': // DNI: 12.345.678
      if (digits.length <= 8) {
        return digits.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3').replace(/^\./, '')
      }
      return digits
    
    case 'UY': // C.I.: 1.234.567-8
      if (digits.length <= 8) {
        const formatted = digits.replace(/(\d)(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4')
        return formatted.replace(/^\./, '').replace(/-$/, '')
      }
      return digits
    
    case 'CL': // RUN: 12.345.678-9
      if (digits.length <= 9) {
        const body = digits.slice(0, -1)
        const dv = digits.slice(-1)
        const formatted = body.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3')
        return digits.length > 1 ? `${formatted.replace(/^\./, '')}-${dv}` : digits
      }
      return digits
    
    case 'VE': // C.I.: V-12.345.678
      if (digits.length >= 1) {
        const letter = digits[0]
        if ('VEJG'.includes(letter)) {
          const nums = digits.slice(1)
          const formatted = nums.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3').replace(/^\./, '')
          return `${letter}-${formatted}`
        }
      }
      return digits
    
    case 'BR': // CPF: 123.456.789-00
      if (digits.length <= 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          .replace(/(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3')
          .replace(/(\d{3})(\d{3})$/, '$1.$2')
          .replace(/(\d{3})$/, '$1')
      }
      return digits
    
    case 'PA': // Cédula: 8-123-456
      if (digits.length <= 9) {
        return digits.replace(/(\d{1,2})(\d{1,4})(\d{1,6})/, '$1-$2-$3')
          .replace(/-$/, '').replace(/-$/, '')
      }
      return digits
    
    case 'CR': // Cédula: 1-1234-5678
      if (digits.length <= 9) {
        return digits.replace(/(\d)(\d{4})(\d{4})/, '$1-$2-$3')
          .replace(/-$/, '').replace(/-$/, '')
      }
      return digits
    
    case 'GT': // DPI: 1234 56789 0101
      if (digits.length <= 13) {
        return digits.replace(/(\d{4})(\d{5})(\d{4})/, '$1 $2 $3').trim()
      }
      return digits
    
    case 'HN': // DNI: 0801-1990-12345
      if (digits.length <= 13) {
        return digits.replace(/(\d{4})(\d{4})(\d{5})/, '$1-$2-$3')
          .replace(/-$/, '').replace(/-$/, '')
      }
      return digits
    
    case 'SV': // DUI: 12345678-9
      if (digits.length <= 9) {
        return digits.replace(/(\d{8})(\d)/, '$1-$2')
      }
      return digits
    
    case 'DO': // Cédula: 001-1234567-8
      if (digits.length <= 11) {
        return digits.replace(/(\d{3})(\d{7})(\d)/, '$1-$2-$3')
          .replace(/-$/, '').replace(/-$/, '')
      }
      return digits
    
    case 'PY': // C.I.: 1.234.567
      if (digits.length <= 7) {
        return digits.replace(/(\d)(\d{3})(\d{3})/, '$1.$2.$3').replace(/^\./, '')
      }
      return digits
    
    case 'ES': // DNI: 12345678X o NIE: X1234567A
      return digits.toUpperCase()
    
    case 'IT': // Codice Fiscale: RSSMRA85M01H501Z
      return digits.toUpperCase()
    
    default:
      return value
  }
}

/**
 * Valida si un documento tiene el formato correcto para el país
 * @param {string} value - Valor a validar
 * @param {string} pais - Código de país
 * @returns {boolean} true si es válido
 */
const validateDocumento = (value, pais) => {
  if (!value || !pais) return true // No validar si está vacío
  const paisInfo = getPaisInfo(pais)
  if (!paisInfo?.regex) return true
  
  // Limpiar el valor antes de validar
  const clean = value.replace(/[\s.-]/g, '').toUpperCase()
  return paisInfo.regex.test(clean) || paisInfo.regex.test(value)
}

const decodeHtml = (text = '') =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const stripHtmlToText = (html = '') => {
  if (!html) return ''
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n?/g, '\n')
  )
}

const normalize = (value = '') => value.toLowerCase().trim()
const MANUAL_ROLE_CODE = '__manual__'

const notesModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'bullet' }],
    ['clean'],
  ],
}

const notesFormats = ['bold', 'italic', 'underline', 'list', 'bullet']

const textToSimpleHtml = (text = '') => {
  const clean = String(text || '').trim()
  if (!clean) return ''
  const escaped = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`
}

const extractObservacionesHtml = (html = '') => {
  if (!html) return ''

  const match = String(html).match(
    /<p[^>]*>\s*<strong>\s*Observaciones\s*:?\s*<\/strong>\s*<\/p>\s*([\s\S]*)$/i
  )
  if (match && match[1]) return match[1].trim()

  const inlineMatch = String(html).match(
    /<p[^>]*>\s*<strong>\s*Observaciones\s*:?\s*<\/strong>\s*([\s\S]*?)<\/p>/i
  )
  return inlineMatch && inlineMatch[1] ? `<p>${inlineMatch[1].trim()}</p>` : ''
}

const roleOptions = rolesCatalog.map(r => ({
  ...r,
  searchKey: `${r.sigla || ''} ${r.cargo || ''} ${r.code || ''}`.toLowerCase(),
}))

const getRoleLabel = (role) => (role?.sigla ? `${role.sigla} - ${role.cargo}` : (role?.cargo || ''))

const findRoleByText = (text = '') => {
  const t = normalize(text)
  if (!t) return null

  return roleOptions.find(r => {
    const sigla = normalize(r.sigla || '')
    const cargo = normalize(r.cargo || '')
    return t === sigla || t === cargo || t.includes(cargo) || (sigla && t.includes(sigla))
  }) || null
}

const ROLE_FALLBACK_REGEX = /(presidente|vicepresidente|director\s+titular|director\s+suplente|director|s[ií]ndico\s+titular|s[ií]ndico\s+suplente|s[ií]ndico|apoderado|secretario\s+de\s+directorio|secretario|tesorero|gerente\s+general|board\s+member)/i

const cleanLineForParsing = (line = '') =>
  line
    .replace(/^[-*•\s]+/, '')
    .replace(/^cargo\s+no\s+especificado\s*:\s*/i, '')
    .trim()

const extractPersonAndDetail = (text = '') => {
  let personName = (text || '').trim()
  let details = ''
  let pais = ''
  let tipoDocumento = ''
  let documento = ''

  // Extraer información entre corchetes [País | Doc: 12345]
  const bracketMatch = personName.match(/\[([^\]]+)\]/)
  if (bracketMatch) {
    const bracketContent = bracketMatch[1]
    personName = personName.replace(bracketMatch[0], '').trim()
    
    // Parsear el contenido: "Argentina | DNI: 12345678" o "Argentina | Pasaporte: ABC123"
    const parts = bracketContent.split('|').map(p => p.trim())
    if (parts.length >= 1) {
      // Buscar país por bandera o nombre
      const paisPart = parts[0]
      const paisFound = PAISES_DOCUMENTO.find(p => 
        paisPart.includes(p.bandera) || 
        paisPart.toLowerCase().includes(p.nombre.toLowerCase())
      )
      if (paisFound) pais = paisFound.codigo
    }
    if (parts.length >= 2) {
      // Extraer documento: "DNI: 12345678" o "Pasaporte: ABC123"
      const docPart = parts[1]
      // Detectar si es pasaporte
      if (/pasaporte/i.test(docPart) || /passport/i.test(docPart)) {
        tipoDocumento = 'PASAPORTE'
        const docMatch = docPart.match(/(?:Pasaporte|Passport)[:\s]+(.+)/i)
        documento = docMatch ? docMatch[1].trim() : docPart.replace(/pasaporte|passport/i, '').replace(/[:\s]+/, '').trim()
      } else {
        tipoDocumento = '' // Documento local
        const docMatch = docPart.match(/(?:DNI|C\.?I\.?|RUN|C\.?C\.?|CPF|DPI|DUI|Cédula)[:\s]+(.+)/i)
        if (docMatch) {
          documento = docMatch[1].trim()
        } else {
          documento = docPart.trim()
        }
      }
    }
  }

  const detailIndex = personName.search(/\b(T\s*:|F\s*:|DNI\s*:|CUIT\s*:|mandato\b|per[ií]odo\b|titular\b|suplente\b)/i)
  if (detailIndex > 0) {
    details = personName.slice(detailIndex).trim()
    personName = personName.slice(0, detailIndex).trim()
  } else {
    const sep = personName.split(' - ')
    if (sep.length > 1) {
      personName = sep[0].trim()
      details = sep.slice(1).join(' - ').trim()
    }
  }

  personName = personName.replace(/^[:\-\s]+/, '').trim()
  return { personName, pais, tipoDocumento, documento, details }
}

const parseRoleRow = (line = '') => {
  const cleanLine = cleanLineForParsing(line)
  if (!cleanLine) return null

  if (/^(estructura\s+societaria|observaciones)\b/i.test(cleanLine)) return null

  const colonIndex = cleanLine.indexOf(':')
  const pipeMatch = cleanLine.match(/^(.{2,80})\s[-|]\s(.+)$/)

  let roleText = ''
  let personAndDetail = ''

  if (colonIndex > 1) {
    roleText = cleanLine.slice(0, colonIndex).trim()
    personAndDetail = cleanLine.slice(colonIndex + 1).trim()
  } else if (pipeMatch) {
    roleText = pipeMatch[1].trim()
    personAndDetail = pipeMatch[2].trim()
  } else {
    const fallback = cleanLine.match(ROLE_FALLBACK_REGEX)
    if (!fallback) return null
    roleText = fallback[1]
    personAndDetail = cleanLine.replace(fallback[0], '').replace(/^[:\-\s]+/, '').trim()
  }

  roleText = roleText.replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/, '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/, '').trim()
  let role = findRoleByText(roleText)

  if (!role) {
    const fallbackRole = roleText.match(ROLE_FALLBACK_REGEX)
    if (fallbackRole) role = findRoleByText(fallbackRole[1])
  }

  if (!role) {
    const { personName, pais, tipoDocumento, documento, details } = extractPersonAndDetail(personAndDetail)
    if (!personName || !roleText) return null

    return {
      roleCode: MANUAL_ROLE_CODE,
      customRole: roleText,
      personName,
      pais,
      tipoDocumento,
      documento,
      details,
    }
  }

  const normalizedRoleText = normalize(roleText)
  const roleName = normalize(role.cargo || '')
  let cleanedPersonBlock = personAndDetail
  if (normalizedRoleText && normalize(cleanedPersonBlock).startsWith(normalizedRoleText)) {
    cleanedPersonBlock = cleanedPersonBlock.slice(roleText.length).replace(/^[:\-\s]+/, '')
  }
  if (roleName && normalize(cleanedPersonBlock).startsWith(roleName)) {
    cleanedPersonBlock = cleanedPersonBlock.slice((role.cargo || '').length).replace(/^[:\-\s]+/, '')
  }

  const { personName, pais, tipoDocumento, documento, details } = extractPersonAndDetail(cleanedPersonBlock)
  if (!personName) return null

  return {
    roleCode: role.code,
    personName,
    pais,
    tipoDocumento,
    documento,
    details,
  }
}

const parseInitialValue = (value = '') => {
  const plain = stripHtmlToText(value)
  if (!plain.trim()) {
    return { rows: [{ roleCode: '', customRole: '', personName: '', pais: '', tipoDocumento: '', documento: '', details: '', roleQuery: '' }], notesHtml: '' }
  }

  // Detectar si viene del editor estructurado (tiene el marcador de estructura)
  const fromStructuredEditor = /<strong>\s*Estructura societaria\s*<\/strong>/i.test(value || '')

  // Si NO viene del editor estructurado, NO parsear automáticamente
  // Dejar todo en observaciones para que el usuario estructure manualmente
  if (!fromStructuredEditor) {
    return {
      rows: [{ roleCode: '', customRole: '', personName: '', pais: '', tipoDocumento: '', documento: '', details: '', roleQuery: '' }],
      notesHtml: textToSimpleHtml(plain.trim()),
    }
  }

  // Viene del editor estructurado - extraer SOLO los <li> como filas
  // NO parsear el texto de observaciones
  const rows = []
  
  // Extraer contenido de cada <li>
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match
  while ((match = liRegex.exec(value)) !== null) {
    const liContent = stripHtmlToText(match[1]).trim()
    if (liContent) {
      const parsedRow = parseRoleRow(liContent)
      if (parsedRow) {
        rows.push(parsedRow)
      }
    }
  }

  if (rows.length === 0) {
    rows.push({ roleCode: '', customRole: '', personName: '', pais: '', tipoDocumento: '', documento: '', details: '', roleQuery: '' })
  }

  // Extraer observaciones del HTML estructurado (NO parsearlas)
  const notesHtml = extractObservacionesHtml(value || '') || ''

  return {
    rows,
    notesHtml,
  }
}

const buildHtmlValue = (rows, notesHtml) => {
  const cleanRows = rows
    .map(r => ({
      roleCode: r.roleCode || '',
      customRole: (r.customRole || '').trim(),
      personName: (r.personName || '').trim(),
      pais: (r.pais || '').trim(),
      tipoDocumento: (r.tipoDocumento || '').trim(),
      documento: (r.documento || '').trim(),
      details: (r.details || '').trim(),
    }))
    .filter(r => r.personName && (r.roleCode !== MANUAL_ROLE_CODE || r.customRole))

  const normalizedNotesHtml = String(notesHtml || '').trim()
  const hasNotes = !!stripHtmlToText(normalizedNotesHtml).trim()

  if (!cleanRows.length && !hasNotes) return ''

  const listItems = cleanRows
    .map(r => {
      const role = roleOptions.find(opt => opt.code === r.roleCode)
      const roleLabel = r.roleCode === MANUAL_ROLE_CODE
        ? r.customRole
        : (role ? `${role.cargo}${role.sigla ? ` (${role.sigla})` : ''}` : 'Cargo no especificado')
      
      // Construir información adicional - SIN bandera para PDF/vista previa
      const paisInfo = r.pais ? getPaisInfo(r.pais) : null
      const paisLabel = paisInfo ? paisInfo.nombre : '' // Solo nombre, sin bandera
      const docTipo = r.tipoDocumento === 'PASAPORTE' ? 'Pasaporte' : (paisInfo?.tipoDoc || 'Doc')
      const docLabel = r.documento ? `${docTipo}: ${r.documento}` : ''
      const detailSuffix = r.details ? ` - ${r.details}` : ''
      
      // Formatear: Cargo: Nombre [País | Doc: 12345] - Detalle
      let extra = ''
      if (paisLabel || docLabel) {
        const parts = [paisLabel, docLabel].filter(Boolean).join(' | ')
        extra = ` [${parts}]`
      }
      
      return `<li><strong>${roleLabel}:</strong> ${r.personName}${extra}${detailSuffix}</li>`
    })
    .join('')

  // Sin títulos redundantes - la sección del PDF ya tiene su título
  const notesBlock = hasNotes ? normalizedNotesHtml : ''

  return `<ul>${listItems}</ul>${notesBlock}`
}

export default function SocietariaStructureEditor({ value, onChange, disabled, empresaId }) {
  const [rows, setRows] = useState([{ roleCode: '', customRole: '', personName: '', pais: '', tipoDocumento: '', documento: '', details: '', roleQuery: '' }])
  const [notesHtml, setNotesHtml] = useState('')
  const [openRolePickerIndex, setOpenRolePickerIndex] = useState(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [openPaisPickerIndex, setOpenPaisPickerIndex] = useState(null)
  const [paisSearch, setPaisSearch] = useState('')
  // Estados para búsqueda de coincidencias
  const [showCoincidenciasModal, setShowCoincidenciasModal] = useState(false)
  const [coincidencias, setCoincidencias] = useState([])
  const [buscandoCoincidencias, setBuscandoCoincidencias] = useState(false)
  const [personaBuscada, setPersonaBuscada] = useState(null) // null = todas, o {nombre, documento}
  const [expandedMatches, setExpandedMatches] = useState({}) // Track expanded accordions
  const [searchElapsed, setSearchElapsed] = useState(0) // Tiempo transcurrido de búsqueda
  const internalSyncRef = useRef(false)

  // Timer para el progress modal
  useEffect(() => {
    if (!buscandoCoincidencias) {
      setSearchElapsed(0)
      return
    }
    const timer = setInterval(() => {
      setSearchElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [buscandoCoincidencias])

  // Obtener el step actual de búsqueda
  const currentSearchStep = SEARCH_STEPS.filter(s => s.time <= searchElapsed).pop() || SEARCH_STEPS[0]
  const rolePickerContainerRef = useRef(null)
  const paisPickerContainerRef = useRef(null)

  // Toggle accordion
  const toggleExpanded = (key) => {
    setExpandedMatches(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    if (internalSyncRef.current) {
      internalSyncRef.current = false
      return
    }

    const parsed = parseInitialValue(value || '')
    setRows(parsed.rows.map((row) => {
      const role = roleOptions.find(r => r.code === row.roleCode)
      return {
        ...row,
        roleQuery: row.roleQuery || (row.roleCode === MANUAL_ROLE_CODE
          ? (row.customRole || '')
          : (role ? getRoleLabel(role) : '')),
      }
    }))
    setNotesHtml(parsed.notesHtml)
  }, [value])

  useEffect(() => {
    const html = buildHtmlValue(rows, notesHtml)
    if (html !== (value || '')) {
      internalSyncRef.current = true
      onChange(html)
    }
  }, [rows, notesHtml, onChange, value])

  useEffect(() => {
    if (openRolePickerIndex === null) return undefined

    const handleClickOutside = (event) => {
      if (!rolePickerContainerRef.current) return
      if (!rolePickerContainerRef.current.contains(event.target)) {
        setOpenRolePickerIndex(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openRolePickerIndex])

  useEffect(() => {
    if (disabled) setOpenRolePickerIndex(null)
  }, [disabled])

  // Cerrar dropdown de país al hacer clic fuera
  useEffect(() => {
    if (openPaisPickerIndex === null) return undefined

    const handleClickOutside = (event) => {
      if (!paisPickerContainerRef.current) return
      if (!paisPickerContainerRef.current.contains(event.target)) {
        setOpenPaisPickerIndex(null)
        setPaisSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openPaisPickerIndex])

  useEffect(() => {
    if (disabled) setOpenPaisPickerIndex(null)
  }, [disabled])

  const groupedRoles = useMemo(() => {
    const groups = {}
    roleOptions.forEach(role => {
      const key = role.categoria || 'Otros'
      if (!groups[key]) groups[key] = []
      groups[key].push(role)
    })
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map(category => ({
        category,
        options: groups[category].sort((a, b) => (a.cargo || '').localeCompare(b.cargo || '', 'es')),
      }))
  }, [])

  const getFilteredGroups = (query = '') => {
    const q = normalize(query)
    if (!q) return groupedRoles

    return groupedRoles
      .map(group => ({
        ...group,
        options: group.options.filter(opt => opt.searchKey.includes(q)),
      }))
      .filter(group => group.options.length > 0)
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BÚSQUEDA DE COINCIDENCIAS DE PERSONAS
  // ═══════════════════════════════════════════════════════════════════════════════
  const buscarCoincidencias = async (personasABuscar = null) => {
    // Si no se especifica, buscar todas las personas con nombre
    const personas = personasABuscar || rows
      .filter(r => r.personName && r.personName.trim().length >= 3)
      .map(r => ({
        nombre: r.personName.trim(),
        documento: r.documento || '',
        pais: r.pais || ''
      }))
    
    if (personas.length === 0) {
      toast.error('No hay personas válidas para buscar')
      return
    }
    
    setBuscandoCoincidencias(true)
    setPersonaBuscada(personasABuscar?.length === 1 ? personasABuscar[0] : null)
    
    try {
      const response = await axios.post('/api/buscar-personas', {
        personas,
        empresa_id: empresaId || null
      })
      
      if (response.data.success) {
        setCoincidencias(response.data.coincidencias || [])
        setShowCoincidenciasModal(true)
        if (response.data.coincidencias?.length === 0) {
          toast('No se encontraron coincidencias', { icon: 'ℹ️' })
        }
      } else {
        toast.error(response.data.error || 'Error en la búsqueda')
      }
    } catch (err) {
      console.error('Error buscando coincidencias:', err)
      toast.error('Error al buscar coincidencias')
    } finally {
      setBuscandoCoincidencias(false)
    }
  }

  const buscarCoincidenciaPersona = (row) => {
    if (!row.personName || row.personName.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres')
      return
    }
    buscarCoincidencias([{
      nombre: row.personName.trim(),
      documento: row.documento || '',
      pais: row.pais || ''
    }])
  }

  const updateRow = (index, patch) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setRows(prev => [...prev, { roleCode: '', customRole: '', personName: '', pais: '', tipoDocumento: '', documento: '', details: '', roleQuery: '' }])
  }

  const removeRow = (index) => {
    setRows(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : [{ roleCode: '', customRole: '', personName: '', pais: '', tipoDocumento: '', documento: '', details: '', roleQuery: '' }]
    })
    setOpenRolePickerIndex(prev => {
      if (prev === null) return null
      if (prev === index) return null
      if (prev > index) return prev - 1
      return prev
    })
  }

  const selectRole = (index, roleCode) => {
    const selectedRole = roleOptions.find(r => r.code === roleCode)
    updateRow(index, {
      roleCode,
      customRole: roleCode === MANUAL_ROLE_CODE ? '' : '',
      roleQuery: selectedRole ? getRoleLabel(selectedRole) : '',
    })
    setOpenRolePickerIndex(null)
    setHighlightedIndex(0)
  }

  const selectManualRole = (index) => {
    updateRow(index, {
      roleCode: MANUAL_ROLE_CODE,
      customRole: rows[index]?.customRole || '',
      roleQuery: rows[index]?.customRole || '',
    })
    setOpenRolePickerIndex(null)
    setHighlightedIndex(0)
  }

  return (
    <>
      {/* Modal de loading para búsqueda de coincidencias */}
      <ProgressModal
        isOpen={buscandoCoincidencias}
        title={personaBuscada ? "Buscando persona" : "Buscando coincidencias"}
        message={currentSearchStep.msg}
        elapsed={searchElapsed}
        progressMaxSeconds={15}
        accent="violet"
        subtitle={personaBuscada 
          ? `Buscando: ${personaBuscada.nombre}` 
          : `Analizando ${rows.filter(r => r.personName?.trim().length >= 3).length} persona(s) en la base de datos`}
        footer="Por favor espera mientras se completa la búsqueda"
      />

      <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Selecciona el cargo y escribe solo los datos de la persona. La sigla muestra definición al pasar el mouse.
          </p>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => buscarCoincidencias()}
            disabled={disabled || buscandoCoincidencias || rows.filter(r => r.personName?.trim().length >= 3).length === 0}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
            title="Buscar coincidencias de todas las personas en otras empresas"
          >
            {buscandoCoincidencias ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            Buscar coincidencias
          </button>
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar cargo
          </button>
        </div>
      </div>

      {rows.map((row, index) => {
        const role = roleOptions.find(r => r.code === row.roleCode)
        const filteredGroups = getFilteredGroups(row.roleQuery || '')
        const filteredOptions = filteredGroups.flatMap(group => group.options)
        const siglaTitle = role
          ? `${role.sigla || role.cargo}: ${role.definicion}`
          : row.roleCode === MANUAL_ROLE_CODE
            ? 'Cargo manual: define un cargo no listado en el catálogo'
            : 'Selecciona un cargo del catálogo'

        return (
          <div key={`row-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-white border border-gray-200 rounded p-2">
            <div className="md:col-span-3">
              <label className="field-label">Cargo</label>
              <div
                className="relative"
                ref={openRolePickerIndex === index ? rolePickerContainerRef : null}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setOpenRolePickerIndex(prev => {
                      const next = prev === index ? null : index
                      if (next !== null) setHighlightedIndex(0)
                      return next
                    })
                  }}
                  className="field-input flex items-center justify-between text-left"
                >
                  <span className={row.roleCode ? 'text-gray-900' : 'text-gray-400'}>
                    {row.roleCode === MANUAL_ROLE_CODE
                      ? (row.customRole || 'Otro (agregar manualmente - opcional)')
                      : (role ? getRoleLabel(role) : 'Seleccionar cargo...')}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openRolePickerIndex === index ? 'rotate-180' : ''}`} />
                </button>

                {openRolePickerIndex === index && !disabled && (
                  <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-white shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={row.roleQuery || ''}
                          onChange={(e) => updateRow(index, { roleQuery: e.target.value })}
                          onKeyDown={(e) => {
                            const totalItems = filteredOptions.length + 1
                            if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              setHighlightedIndex(prev => (prev + 1) % Math.max(totalItems, 1))
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              setHighlightedIndex(prev => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1))
                            } else if (e.key === 'Enter') {
                              e.preventDefault()
                              if (highlightedIndex < filteredOptions.length) {
                                selectRole(index, filteredOptions[highlightedIndex].code)
                              } else {
                                selectManualRole(index)
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              setOpenRolePickerIndex(null)
                            }
                          }}
                          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                          placeholder="Buscar cargo (ej: Pre, Dir, Síndico...)"
                          autoFocus
                        />
                        {(row.roleQuery || '') && (
                          <button
                            type="button"
                            onClick={() => updateRow(index, { roleQuery: '' })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                            title="Limpiar"
                          >
                            <X className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {filteredGroups.reduce((acc, g) => acc + g.options.length, 0)} cargos encontrados
                      </p>
                    </div>

                    <div className="overflow-y-auto max-h-52">
                      {filteredGroups.length === 0 ? (
                        <p className="p-3 text-sm text-gray-500 text-center">No se encontraron cargos</p>
                      ) : (
                        (() => {
                          let optionPosition = 0
                          return filteredGroups.map(group => (
                            <div key={group.category}>
                              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 border-y border-gray-100">
                                {group.category}
                              </div>
                              {group.options.map(opt => {
                                const selected = row.roleCode === opt.code
                                const isHighlighted = highlightedIndex === optionPosition
                                const currentPosition = optionPosition
                                optionPosition += 1

                                return (
                                  <button
                                    key={opt.code}
                                    type="button"
                                    onMouseEnter={() => setHighlightedIndex(currentPosition)}
                                    onClick={() => selectRole(index, opt.code)}
                                    className={`w-full px-3 py-2 text-left text-sm border-b border-gray-50 flex items-center gap-2 ${selected ? 'bg-indigo-50' : isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                    title={`${opt.sigla || opt.cargo}: ${opt.definicion}`}
                                  >
                                    <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
                                      {selected && <Check className="h-3 w-3 text-white" />}
                                    </span>
                                    <span className="text-indigo-600 text-xs font-mono bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                                      {opt.sigla || opt.code}
                                    </span>
                                    <span className="text-gray-800 truncate">{opt.cargo}</span>
                                  </button>
                                )
                              })}
                            </div>
                          ))
                        })()
                      )}
                    </div>

                    <div className="border-t border-gray-100 bg-white shrink-0">
                      <button
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                        onClick={() => selectManualRole(index)}
                        className={`w-full px-3 py-2.5 text-left flex items-center gap-2 text-amber-700 ${highlightedIndex === filteredOptions.length ? 'bg-amber-50' : 'hover:bg-amber-50'}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Otro (agregar manualmente - opcional)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {row.roleCode === MANUAL_ROLE_CODE && (
                <input
                  type="text"
                  value={row.customRole || ''}
                  onChange={(e) => updateRow(index, { customRole: e.target.value, roleQuery: e.target.value })}
                  disabled={disabled}
                  className="field-input mt-1"
                  placeholder="Ej: Miembro comité especial"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="field-label">Persona</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={row.personName}
                  onChange={(e) => updateRow(index, { personName: e.target.value })}
                  disabled={disabled}
                  className="field-input flex-1"
                  placeholder="Nombre y apellido"
                />
                <button
                  type="button"
                  onClick={() => buscarCoincidenciaPersona(row)}
                  disabled={disabled || buscandoCoincidencias || !row.personName || row.personName.trim().length < 3}
                  className="px-1.5 py-1 rounded border border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Buscar esta persona en otras empresas"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="md:col-span-2 relative" ref={openPaisPickerIndex === index ? paisPickerContainerRef : null}>
              <label className="field-label">País</label>
              <button
                type="button"
                onClick={() => {
                  if (disabled) return
                  setOpenPaisPickerIndex(openPaisPickerIndex === index ? null : index)
                  setPaisSearch('')
                }}
                disabled={disabled}
                className="field-input text-sm w-full flex items-center justify-between"
                title={row.pais ? getPaisInfo(row.pais)?.nombre : 'Seleccionar país'}
              >
                {row.pais ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="text-base leading-none">{getPaisInfo(row.pais)?.bandera}</span>
                    <span className="truncate">{getPaisInfo(row.pais)?.nombre}</span>
                  </span>
                ) : (
                  <span className="text-gray-400 truncate">Seleccionar</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${openPaisPickerIndex === index ? 'rotate-180' : ''}`} />
              </button>
              {openPaisPickerIndex === index && (
                <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-hidden left-0">
                  <div className="p-1.5 border-b">
                    <input
                      type="text"
                      placeholder="Buscar país..."
                      value={paisSearch}
                      onChange={(e) => setPaisSearch(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {PAISES_DOCUMENTO
                      .filter(p => !paisSearch || p.nombre.toLowerCase().includes(paisSearch.toLowerCase()) || p.codigo.toLowerCase().includes(paisSearch.toLowerCase()))
                      .map(p => (
                      <button
                        key={p.codigo}
                        type="button"
                        onClick={() => {
                          const newPais = p.codigo
                          const newDoc = row.documento && row.tipoDocumento !== 'PASAPORTE' 
                            ? formatDocumento(row.documento, newPais) 
                            : row.documento
                          updateRow(index, { pais: newPais, documento: newDoc })
                          setOpenPaisPickerIndex(null)
                          setPaisSearch('')
                        }}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left text-sm ${row.pais === p.codigo ? 'bg-blue-50 font-semibold' : ''}`}
                      >
                        <span className="text-lg leading-none">{p.bandera}</span>
                        <span className="flex-1 truncate">
                          <span className="text-gray-400 font-mono text-xs mr-1">{p.codigo}</span>
                          {p.nombre}
                        </span>
                        {row.pais === p.codigo && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <label className="field-label">Tipo</label>
              <select
                value={row.tipoDocumento || ''}
                onChange={(e) => {
                  const newTipo = e.target.value
                  // Limpiar documento al cambiar tipo
                  updateRow(index, { tipoDocumento: newTipo, documento: '' })
                }}
                disabled={disabled}
                className="field-input text-xs px-1"
              >
                <option value="">{row.pais ? getPaisInfo(row.pais)?.tipoDoc || 'Local' : 'Doc'}</option>
                <option value="PASAPORTE">Pasap.</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="field-label">
                {row.tipoDocumento === 'PASAPORTE' 
                  ? 'Pasaporte' 
                  : (row.pais ? getPaisInfo(row.pais)?.tipoDoc || 'Documento' : 'DNI/Pasaporte')}
              </label>
              <input
                type="text"
                value={row.documento || ''}
                onChange={(e) => {
                  // Formatear automáticamente solo si no es pasaporte
                  const formatted = row.tipoDocumento === 'PASAPORTE'
                    ? e.target.value.toUpperCase()
                    : (row.pais ? formatDocumento(e.target.value, row.pais) : e.target.value)
                  updateRow(index, { documento: formatted })
                }}
                disabled={disabled}
                className={`field-input ${row.documento && row.pais && row.tipoDocumento !== 'PASAPORTE' && !validateDocumento(row.documento, row.pais) ? 'border-red-400 bg-red-50' : ''}`}
                placeholder={row.tipoDocumento === 'PASAPORTE' 
                  ? 'Ej: AB1234567' 
                  : (row.pais ? getPaisInfo(row.pais)?.placeholder || 'Número' : 'Ej: 12345678')}
              />
              {row.documento && row.pais && row.tipoDocumento !== 'PASAPORTE' && !validateDocumento(row.documento, row.pais) && (
                <p className="text-[10px] text-red-500 mt-0.5">Formato inválido</p>
              )}
            </div>

            <div className="md:col-span-1">
              <label className="field-label">Detalle</label>
              <input
                type="text"
                value={row.details}
                onChange={(e) => updateRow(index, { details: e.target.value })}
                disabled={disabled}
                className="field-input"
                placeholder="Titular..."
              />
            </div>

            <div className="md:col-span-1 flex md:flex-col items-center gap-1 pt-0 md:pt-6">
              <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200" title={siglaTitle}>
                <Info className="h-3 w-3" />
                {role?.sigla || 'Info'}
              </span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                title="Eliminar fila"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}

      <div>
        <label className="field-label">Observaciones generales (opcional)</label>
        <div className={`quill-wrapper ${disabled ? 'quill-disabled' : ''}`}>
          <ReactQuill
            theme="snow"
            value={notesHtml || ''}
            onChange={setNotesHtml}
            modules={!disabled ? notesModules : { toolbar: false }}
            formats={notesFormats}
            readOnly={disabled}
            placeholder="Ej: Mandato hasta 2027, firma conjunta con CFO, etc."
          />
        </div>
      </div>

      {/* Modal de Coincidencias */}
      {showCoincidenciasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Coincidencias encontradas
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {personaBuscada 
                    ? `Buscando: ${personaBuscada.nombre}`
                    : `${coincidencias.length} coincidencia(s) en otras empresas`}
                </p>
              </div>
              <button
                onClick={() => setShowCoincidenciasModal(false)}
                className="p-2 hover:bg-white/80 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {coincidencias.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No se encontraron coincidencias</p>
                  <p className="text-sm mt-1">Las personas no aparecen en otras empresas de la base de datos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Agrupar por persona buscada */}
                  {Object.entries(
                    coincidencias.reduce((acc, c) => {
                      const key = c.persona_buscada
                      if (!acc[key]) acc[key] = []
                      acc[key].push(c)
                      return acc
                    }, {})
                  ).map(([persona, matches]) => (
                    <div key={persona} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <span className="font-medium text-gray-900">{persona}</span>
                        <span className="text-gray-500 text-sm ml-2">({matches.length} empresa{matches.length > 1 ? 's' : ''})</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {matches.map((match, idx) => {
                          const accordionKey = `${persona}-${idx}`
                          const isExpanded = expandedMatches[accordionKey]
                          const camposEncontrados = match.campos_encontrados || []
                          return (
                            <div key={idx} className="border-b border-gray-100 last:border-b-0">
                              {/* Header clickeable */}
                              <button
                                onClick={() => toggleExpanded(accordionKey)}
                                className="w-full px-4 py-3 hover:bg-blue-50/50 flex items-center justify-between gap-3 text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-900 truncate">{match.empresa_razon_social}</span>
                                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">
                                      {match.empresa_tipo_id || 'ID'}: {match.empresa_cuit}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {match.cargo_encontrado && (
                                      <span className="text-purple-600 font-medium text-sm">{match.cargo_encontrado}</span>
                                    )}
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      match.tipo_match === 'nombre_exacto' ? 'bg-green-100 text-green-700' :
                                      match.tipo_match === 'documento' ? 'bg-blue-100 text-blue-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>
                                      {match.tipo_match === 'nombre_exacto' ? '✓ Nombre exacto' :
                                       match.tipo_match === 'documento' ? '✓ Documento' :
                                       `~${match.confianza}% similar`}
                                    </span>
                                    {/* Mostrar en cuántos campos se encontró */}
                                    <span className="text-xs text-gray-500">
                                      en {camposEncontrados.length} sección{camposEncontrados.length > 1 ? 'es' : ''}
                                    </span>
                                  </div>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {/* Contenido expandible - Todos los campos donde se encontró */}
                              {isExpanded && (
                                <div className="px-4 pb-4 bg-slate-50 border-t border-gray-100">
                                  <div className="pt-3">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Información de {match.empresa_razon_social}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          navigator.clipboard.writeText(match.empresa_cuit)
                                          toast.success(`${match.empresa_tipo_id || 'ID'} copiado: ${match.empresa_cuit}`, { duration: 2000 })
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                        title="Copiar ID para buscar en la lista de empresas"
                                      >
                                        <Copy className="h-3 w-3" />
                                        Copiar ID
                                      </button>
                                    </div>
                                    
                                    {/* Acordeones por cada sección donde se encontró */}
                                    <div className="space-y-2">
                                      {camposEncontrados.map((campo, campoIdx) => {
                                        const campoKey = `${accordionKey}-${campo.campo}`
                                        const isCampoExpanded = expandedMatches[campoKey]
                                        return (
                                          <div key={campoIdx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                toggleExpanded(campoKey)
                                              }}
                                              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700">{campo.campo_nombre}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                  campo.tipo_match === 'nombre_exacto' ? 'bg-green-100 text-green-700' :
                                                  campo.tipo_match === 'documento' ? 'bg-blue-100 text-blue-700' :
                                                  'bg-amber-100 text-amber-700'
                                                }`}>
                                                  {campo.tipo_match === 'nombre_exacto' ? '✓ Exacto' :
                                                   campo.tipo_match === 'documento' ? '✓ Doc' :
                                                   `${campo.confianza}%`}
                                                </span>
                                              </div>
                                              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isCampoExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isCampoExpanded && (
                                              <div 
                                                className="px-3 py-2 border-t border-gray-100 text-sm text-gray-700 max-h-48 overflow-y-auto prose prose-sm prose-gray"
                                                dangerouslySetInnerHTML={{ 
                                                  __html: campo.contenido || '<p class="text-gray-400 italic">Sin información</p>' 
                                                }}
                                              />
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
              <p className="text-xs text-gray-500">
                💡 Haz clic en una empresa para ver todas las secciones donde aparece la persona
              </p>
              <button
                onClick={() => setShowCoincidenciasModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { 
  Save, 
  Edit3, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Building2,
  FileText,
  Phone,
  Calendar,
  DollarSign,
  Loader2,
  Eye,
  Plus,
  Trash2,
  AlignJustify,
  XCircle,
  Globe,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import ValidationPanel from './ValidationPanel'
import OsintPanel from './OsintPanel'
import BoletinValidationPanel from './BoletinValidationPanel'

// ── Validación de identificador fiscal ──
function validateTaxId(taxId, tipo) {
  if (!taxId) return { valid: false, error: 'Requerido' }
  const clean = taxId.replace(/[-.\s/]/g, '')
  if (!clean) return { valid: false, error: 'Requerido' }

  if (tipo === 'CUIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 11) return { valid: false, error: 'Debe tener 11 dígitos' }
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const suma = mult.reduce((s, m, i) => s + parseInt(clean[i]) * m, 0)
    const resto = 11 - (suma % 11)
    const dv = resto === 11 ? 0 : resto === 10 ? 9 : resto
    if (parseInt(clean[10]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RUT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 12) return { valid: false, error: 'Debe tener 12 dígitos' }
    // Validación dígito verificador módulo 11
    const rest = clean.slice(0, 11)
    let total = 0, factor = 2
    for (let i = 10; i >= 0; i--) {
      total += factor * parseInt(rest[i])
      factor = factor === 9 ? 2 : factor + 1
    }
    let dv = 11 - (total % 11)
    if (dv === 11) dv = 0
    else if (dv === 10) dv = 1
    if (parseInt(clean[11]) !== dv) return { valid: false, error: 'Dígito verificador inválido' }
    return { valid: true }
  }
  if (tipo === 'RNC') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 7 || clean.length > 16) return { valid: false, error: '7-16 dígitos' }
    return { valid: true }
  }
  if (tipo === 'NIT') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (tipo === 'RUC') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 20) return { valid: false, error: '5-20 dígitos' }
    return { valid: true }
  }
  if (tipo === 'RTN') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 9 || clean.length > 20) return { valid: false, error: '9-20 dígitos' }
    return { valid: true }
  }
  if (tipo === 'CEDULA JURIDICA') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length < 5 || clean.length > 15) return { valid: false, error: '5-15 dígitos' }
    return { valid: true }
  }
  if (tipo === 'EIN') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 9) return { valid: false, error: 'Debe tener 9 dígitos' }
    return { valid: true }
  }
  if (tipo === 'CNPJ') {
    if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
    if (clean.length !== 14) return { valid: false, error: 'Debe tener 14 dígitos' }
    return { valid: true }
  }
  if (tipo === 'HRB') {
    if (clean.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' }
    return { valid: true }
  }
  if (['RFC', 'VAT', 'TAXPAYER ID', 'ID'].includes(tipo)) {
    const alnum = taxId.replace(/[^a-zA-Z0-9]/g, '')
    if (alnum.length < 4 || alnum.length > 20) return { valid: false, error: '4-20 caracteres' }
    if (!/\d/.test(alnum)) return { valid: false, error: 'Debe contener dígitos' }
    return { valid: true }
  }
  // Genérico
  if (!/^\d+$/.test(clean)) return { valid: false, error: 'Solo dígitos' }
  if (clean.length < 5 || clean.length > 20) return { valid: false, error: '5-20 dígitos' }
  return { valid: true }
}

const RICH_TEXT_FIELDS = new Set([
  'sinopsis',
  'objeto_social',
  'estructura_societaria',
  'composicion_capital',
  'datos_directivos',
  'historia',
  'situacion_economica_financiera',
  'bienes_uso',
  'evolucion_resultados',
  'sociedades_vinculadas',
  'cumplimiento_concepto',
  'sucursales',
  'relaciones_bancarias_riesgo',
  'conclusion',
])

const hasHtmlTags = (value) => /<[^>]+>/.test(value || '')

const escapeHtml = (value) =>
  (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** Detecta lineas tipo "Etiqueta  1,234,567" de estados financieros/contables */
const looksLikeValueLine = (line) => {
  if (!line || line.length > 100) return false
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\s+[\d]{1,3}(?:[,.\s]\d{3})+(?:[,.]\d{1,2})?\s*$/.test(line.trim())
}

const plainTextToQuillHtml = (value) => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  if (!paragraphs.length) return ''

  return paragraphs
    .map(p => {
      const lines = p.split('\n')
      // Si el bloque tiene lineas con formato "Etiqueta Valor", cada linea es su propio <p>
      const hasValueLines = lines.some(l => looksLikeValueLine(l.trim()))
      if (hasValueLines && lines.length > 1) {
        return lines
          .map(l => l.trim())
          .filter(Boolean)
          .map(l => `<p>${escapeHtml(l)}</p>`)
          .join('')
      }
      return `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
    })
    .join('')
}

const normalizeForEditor = (raw = {}) => {
  const next = { ...raw }

  for (const field of RICH_TEXT_FIELDS) {
    const current = next[field]
    if (typeof current !== 'string' || !current.trim()) continue
    if (!hasHtmlTags(current)) {
      next[field] = plainTextToQuillHtml(current)
    }
  }

  // Mostrar emails_contacto como secundarios (sin repetir el principal)
  if (next.email || next.emails_contacto) {
    const principal = String(next.email || '').trim().toLowerCase()
    const secundarios = parseEmailListFromInput(next.emails_contacto)
      .filter(em => !principal || em !== principal)
    next.emails_contacto = secundarios
  }

  if (!Array.isArray(next.extra_fields)) {
    next.extra_fields = []
  }

  return next
}

const EXTRA_FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
]

// Configuración del editor Quill
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['clean']
  ],
  clipboard: {
    matchVisual: false,
  },
}

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'indent',
  'color', 'background',
  'align'
]

// Definición de campos con sus grupos y descripciones
const FIELD_GROUPS = {
  informe: {
    title: 'Datos del Informe',
    icon: Calendar,
    description: 'Información del documento analizado'
  },
  principal: {
    title: 'Datos Principales',
    icon: Building2,
    description: 'Información básica de la empresa'
  },
  contacto: {
    title: 'Datos de Contacto',
    icon: Phone,
    description: 'Dirección, teléfonos y email'
  },
  texto: {
    title: 'Información Detallada',
    icon: FileText,
    description: 'Bloques de texto extraídos del documento'
  }
}

const formatEmailListForInput = (value) => {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  return ''
}

const parseEmailListFromInput = (value) => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []
  return value
    .split(/[;,\n]+/)
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
}

const inferDisplayedTaxType = (tipoIdentificacion, taxId) => {
  const tipo = String(tipoIdentificacion || '').toUpperCase()
  const digits = String(taxId || '').replace(/\D/g, '')

  if (tipo !== 'CUIT') return tipo || 'ID'
  if (digits.length === 12) return 'RUT'
  if (digits.length === 11) return 'CUIT'
  if (digits.length === 9 || digits.length === 10) return 'NIT'
  return 'CUIT'
}

const FIELDS = [
  // Informe
  { name: 'abonado', label: 'Abonado', type: 'text', group: 'informe', description: 'Número de abonado Inforysk' },
  { name: 'expediente', label: 'Expediente', type: 'text', group: 'informe', description: 'Número de expediente' },
  { name: 'referencia', label: 'Referencia', type: 'text', group: 'informe', description: 'Código de referencia' },
  { name: 'fecha_informe', label: 'Fecha del Informe', type: 'date', group: 'informe', description: 'Fecha de emisión del informe' },
  
  // Principal
  { name: 'razon_social', label: 'Razón Social', type: 'text', group: 'principal', required: true, description: 'Nombre legal de la empresa' },
  { name: 'cuit', label: 'ID Fiscal', type: 'text', group: 'principal', required: true, description: 'Identificación tributaria (CUIT/NIT/RUC/Cédula Jurídica/RNC/RUT/RTN)', dynamicLabel: true },
  { name: 'tipo_identificacion', label: 'Tipo ID', type: 'text', group: 'principal', description: 'Tipo de identificación fiscal', hidden: true },
  { name: 'ingresos_brutos', label: 'Ingresos Brutos', type: 'text', group: 'principal', description: 'Número de Ingresos Brutos' },
  { name: 'actividad_principal', label: 'Actividad Principal', type: 'text', group: 'principal', description: 'Rubro o actividad comercial' },
  { name: 'forma_legal', label: 'Forma Legal', type: 'text', group: 'principal', description: 'Tipo societario (SRL, SA, SAS, etc.)' },
  { name: 'fecha_contrato_social', label: 'Fecha Contrato Social', type: 'date', group: 'principal', description: 'Fecha de constitución' },
  { name: 'fecha_inscripcion_afip', label: 'Fecha Inscripción AFIP', type: 'date', group: 'principal', description: 'Fecha de alta en AFIP' },
  { name: 'duracion_anios', label: 'Duración', type: 'text', group: 'principal', description: 'Plazo de duración de la sociedad (ej: 99 años, Ilimitada)' },
  { name: 'cierre_ejercicio', label: 'Cierre de Ejercicio', type: 'text', group: 'principal', description: 'Fecha de cierre del ejercicio fiscal' },
  { name: 'capital_social', label: 'Capital Social ($)', type: 'number', group: 'principal', description: 'Capital social en pesos argentinos' },
  
  // Contacto
  { name: 'domicilio', label: 'Domicilio', type: 'textarea', group: 'contacto', description: 'Dirección legal de la empresa' },
  { name: 'telefono_1', label: 'Teléfono 1', type: 'text', group: 'contacto', description: 'Teléfono principal' },
  { name: 'telefono_2', label: 'Teléfono 2', type: 'text', group: 'contacto', description: 'Teléfono secundario' },
  { name: 'email', label: 'Email', type: 'email', group: 'contacto', description: 'Correo electrónico de contacto' },
  { name: 'emails_contacto', label: 'Emails adicionales', type: 'email_list', group: 'contacto', description: 'Lista de correos separados por coma o salto de línea' },
  
  // Texto
  { name: 'sinopsis', label: 'Sinopsis', type: 'textarea', group: 'texto', description: 'Resumen general del informe' },
  { name: 'objeto_social', label: 'Objeto Social', type: 'textarea', group: 'texto', description: 'Actividades autorizadas de la empresa' },
  { name: 'estructura_societaria', label: 'Estructura Societaria', type: 'textarea', group: 'texto', description: 'Organización interna de la sociedad' },
  { name: 'composicion_capital', label: 'Composición del Capital', type: 'textarea', group: 'texto', description: 'Distribución del capital social' },
  { name: 'datos_directivos', label: 'Datos de Directivos', type: 'textarea', group: 'texto', description: 'Información de los directivos' },
  { name: 'historia', label: 'Historia', type: 'textarea', group: 'texto', description: 'Antecedentes e historia de la empresa' },
  { name: 'situacion_economica_financiera', label: 'Situación Económica-Financiera', type: 'textarea', group: 'texto', description: 'Estado financiero actual' },
  { name: 'bienes_uso', label: 'Bienes de Uso', type: 'textarea', group: 'texto', description: 'Activos y propiedades' },
  { name: 'evolucion_resultados', label: 'Evolución y Resultados', type: 'textarea', group: 'texto', description: 'Desempeño y productos/servicios' },
  { name: 'sociedades_vinculadas', label: 'Sociedades Vinculadas/Relacionadas', type: 'textarea', group: 'texto', description: 'Empresas relacionadas o vinculadas' },
  { name: 'cumplimiento_concepto', label: 'Cumplimiento y Concepto', type: 'textarea', group: 'texto', description: 'Evaluación de cumplimiento y concepto comercial' },
  { name: 'sucursales', label: 'Sucursales', type: 'textarea', group: 'texto', description: 'Plantas, oficinas o sucursales declaradas' },
  { name: 'relaciones_bancarias_riesgo', label: 'Relaciones Bancarias y Riesgo Crediticio', type: 'textarea', group: 'texto', description: 'Bancos con los que opera y evaluación de riesgo' },
  { name: 'conclusion', label: 'Conclusión', type: 'textarea', group: 'texto', description: 'Conclusión y recomendación final' },
]
const COUNTRY_FLAGS = {
  AR: '🇦🇷', UY: '🇺🇾', CR: '🇨🇷', GT: '🇬🇹', CO: '🇨🇴',
  PE: '🇵🇪', EC: '🇪🇨', PA: '🇵🇦', NI: '🇳🇮', DO: '🇩🇴',
  CL: '🇨🇱', SV: '🇸🇻', DE: '🇩🇪', US: '🇺🇸', BR: '🇧🇷',
  MX: '🇲🇽', HN: '🇭🇳', BO: '🇧🇴', PY: '🇵🇾', VE: '🇻🇪',
}

// ══════════════════════════════════════════════════════════════════════
// ══ SISTEMA DE RECUPERACIÓN DE DATOS (Autosave) ══════════════════════
// ══════════════════════════════════════════════════════════════════════
const DRAFT_PREFIX = 'inforysk_draft_'
const DRAFT_INTERVAL_MS = 5000 // Autosave cada 5 segundos

// Campos importantes para detectar cambios en borrador
const DRAFT_IMPORTANT_FIELDS = [
  'razon_social', 'cuit', 'tipo_identificacion', 'actividad_principal',
  'domicilio', 'telefono_1', 'telefono_2', 'email', 'capital_social',
  'sinopsis', 'objeto_social', 'estructura_societaria', 'composicion_capital',
  'datos_directivos', 'historia', 'situacion_economica_financiera',
  'bienes_uso', 'evolucion_resultados', 'sociedades_vinculadas',
  'cumplimiento_concepto', 'sucursales', 'relaciones_bancarias_riesgo',
  'conclusion', 'ingresos_brutos', 'forma_legal', 'fecha_contrato_social',
  'fecha_inscripcion_afip', 'duracion_anios', 'cierre_ejercicio'
]

const FIELD_LABELS = {
  razon_social: 'Razón Social', cuit: 'ID Fiscal', tipo_identificacion: 'Tipo ID',
  actividad_principal: 'Actividad Principal', domicilio: 'Domicilio',
  telefono_1: 'Teléfono 1', telefono_2: 'Teléfono 2', email: 'Email',
  capital_social: 'Capital Social', sinopsis: 'Sinopsis', objeto_social: 'Objeto Social',
  estructura_societaria: 'Estructura Societaria', composicion_capital: 'Composición Capital',
  datos_directivos: 'Datos Directivos', historia: 'Historia',
  situacion_economica_financiera: 'Situación Económica', bienes_uso: 'Bienes de Uso',
  evolucion_resultados: 'Evolución y Resultados', sociedades_vinculadas: 'Sociedades Vinculadas',
  cumplimiento_concepto: 'Cumplimiento', sucursales: 'Sucursales',
  relaciones_bancarias_riesgo: 'Relaciones Bancarias', conclusion: 'Conclusión',
  ingresos_brutos: 'Ingresos Brutos', forma_legal: 'Forma Legal',
  fecha_contrato_social: 'Fecha Contrato', fecha_inscripcion_afip: 'Fecha AFIP',
  duracion_anios: 'Duración', cierre_ejercicio: 'Cierre Ejercicio'
}

/** Normaliza un valor para comparación (elimina HTML, espacios extra, etc.) */
function normalizeValueForCompare(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') {
    // Quitar HTML y normalizar espacios
    return val.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  }
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) return JSON.stringify(val)
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

/** Detecta cambios entre datos originales y datos actuales */
function detectDraftChanges(originalData, currentData) {
  const changes = []
  for (const field of DRAFT_IMPORTANT_FIELDS) {
    const origVal = normalizeValueForCompare(originalData?.[field])
    const currVal = normalizeValueForCompare(currentData?.[field])
    if (origVal !== currVal) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: originalData?.[field],
        newValue: currentData?.[field],
        type: !origVal && currVal ? 'added' : (origVal && !currVal ? 'removed' : 'modified')
      })
    }
  }
  return changes
}

/** Genera una clave única para el borrador basada en CUIT o empresaId */
function getDraftKey(cuit, empresaId) {
  if (cuit) {
    const clean = cuit.replace(/[-.\s/]/g, '')
    return `${DRAFT_PREFIX}cuit_${clean}`
  }
  if (empresaId) return `${DRAFT_PREFIX}id_${empresaId}`
  return `${DRAFT_PREFIX}new`
}

/** Guarda un borrador en localStorage (solo si hay cambios) */
function saveDraft(key, data, selectedPais, originalData = null, changes = null) {
  try {
    const draft = {
      data,
      selectedPais,
      savedAt: new Date().toISOString(),
      version: 2,
      originalData, // Guardar datos originales para referencia
      changes // Cambios detectados
    }
    localStorage.setItem(key, JSON.stringify(draft))
    return true
  } catch (e) {
    console.warn('Error guardando borrador:', e)
    return false
  }
}

/** Carga un borrador desde localStorage */
function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw)
    // Verificar que tenga la estructura esperada
    if (!draft.data || !draft.savedAt) return null
    return draft
  } catch (e) {
    console.warn('Error cargando borrador:', e)
    return null
  }
}

/** Elimina un borrador de localStorage */
function clearDraft(key) {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn('Error eliminando borrador:', e)
  }
}

/** Elimina borradores antiguos (más de 7 días) */
function cleanOldDrafts() {
  try {
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 días
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DRAFT_PREFIX)) {
        const raw = localStorage.getItem(key)
        try {
          const draft = JSON.parse(raw)
          if (draft.savedAt) {
            const savedTime = new Date(draft.savedAt).getTime()
            if (now - savedTime > maxAge) {
              localStorage.removeItem(key)
            }
          }
        } catch {}
      }
    }
  } catch {}
}

/** Formatea fecha para mostrar */
function formatDraftDate(isoString) {
  try {
    const d = new Date(isoString)
    return d.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return isoString
  }
}

// Limpiar borradores antiguos al cargar
cleanOldDrafts()

function DataEditor({ data, filename, empresaId, mode = 'edit', onSave, onBack, sinopsisInfo, countryConfig, isNewBlank, onNewReportReady, fromSolicitud, isFromPdfUpload = false }) {
  const { isAdmin } = useAuth()
  const isNewReport = !data && !empresaId && !!countryConfig
  const afipData = countryConfig?.afipData || {}
  const afipLocked = !!afipData._afip_validated // Campos traídos de AFIP son de solo lectura
  const initialData = isNewReport
    ? {
        tipo_identificacion: countryConfig.tipo_id_fiscal || 'CUIT',
        cuit: afipData.cuit || '',
        razon_social: afipData.razon_social || '',
        domicilio: afipData.domicilio || '',
        actividad_principal: afipData.actividad_principal || '',
        ingresos_brutos: afipData.ingresos_brutos || '',
      }
    : (data || {})
  const [formData, setFormData] = useState(normalizeForEditor(initialData))
  const [editMode, setEditMode] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!empresaId)
  const [expandedGroups, setExpandedGroups] = useState(['principal', 'texto'])
  const [highlightedField, setHighlightedField] = useState(null)
  const highlightTimerRef = useRef(null)
  const [taxIdError, setTaxIdError] = useState(null)
  const [existingEmpresa, setExistingEmpresa] = useState(null)
  const [existingSolicitud, setExistingSolicitud] = useState(null)
  const checkCuitTimerRef = useRef(null)
  const countryDropdownRef = useRef(null)

  // ── Nuevo Informe en blanco: selector de país inline ──
  const [paisesDisponibles, setPaisesDisponibles] = useState([])
  const [selectedPais, setSelectedPais] = useState(null)
  const [loadingPaises, setLoadingPaises] = useState(!!isNewBlank)
  const [countryDDOpen, setCountryDDOpen] = useState(false)
  const [countryDDSearch, setCountryDDSearch] = useState('')
  const countrySelected = !isNewBlank || !!selectedPais
  
  // ── Modal "Otro país" ──
  const [showOtrosPaisesModal, setShowOtrosPaisesModal] = useState(false)
  const [otrosPaises, setOtrosPaises] = useState([])
  const [loadingOtros, setLoadingOtros] = useState(false)
  const [otrosSearch, setOtrosSearch] = useState('')
  const [addingCountry, setAddingCountry] = useState(null)

  // ── Sistema de Recuperación/Autosave ──
  const [draftKey, setDraftKey] = useState(null)
  const [pendingDraft, setPendingDraft] = useState(null) // Borrador detectado al cargar
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const autosaveTimerRef = useRef(null)
  const formDataRef = useRef(formData) // Para acceder a formData actual en el timer
  const selectedPaisRef = useRef(selectedPais)
  const originalDataRef = useRef(null) // Datos originales para comparar cambios

  // Mantener refs actualizados
  useEffect(() => { formDataRef.current = formData }, [formData])
  useEffect(() => { selectedPaisRef.current = selectedPais }, [selectedPais])

  useEffect(() => {
    if (isNewBlank) {
      axios.get('/api/country-patterns').then(res => {
        if (res.data.paises) {
          setPaisesDisponibles(res.data.paises)
          // Si viene de solicitud, auto-seleccionar país y pre-llenar datos
          if (fromSolicitud) {
            const cuitDigits = (fromSolicitud.cuit || '').replace(/\D/g, '')
            let codigoPais = 'AR' // default
            if (cuitDigits.length === 12) codigoPais = 'UY'
            else if (cuitDigits.length === 9 || cuitDigits.length === 10) codigoPais = 'CO'
            const paisMatch = res.data.paises.find(p => p.codigo_pais === codigoPais)
            if (paisMatch) {
              setSelectedPais(paisMatch)
              setFormData(normalizeForEditor({
                tipo_identificacion: paisMatch.tipo_id_fiscal || 'CUIT',
                cuit: fromSolicitud.cuit || '',
                razon_social: fromSolicitud.razon_social || '',
                domicilio: fromSolicitud.domicilio || '',
                actividad_principal: fromSolicitud.actividad_principal || '',
                // Datos del pedido (correlativo, referencia, etc.)
                abonado: fromSolicitud.abonado ? String(fromSolicitud.abonado) : '',
                expediente: fromSolicitud.expediente ? String(fromSolicitud.expediente) : '',
                referencia: fromSolicitud.referencia || '',
                fecha_informe: fromSolicitud.fecha_informe || new Date().toISOString().split('T')[0],
              }))
              setEditMode(true)
              setExpandedGroups(['principal', 'texto', 'informe'])
            }
          }
        }
      }).catch(() => {}).finally(() => setLoadingPaises(false))
    }
  }, [isNewBlank])

  // Cerrar dropdown país al clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDDOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Inicializar draftKey, datos originales y detectar borradores existentes ──
  useEffect(() => {
    const cuit = formData?.cuit || data?.cuit || ''
    const key = getDraftKey(cuit, empresaId)
    setDraftKey(key)

    // Guardar datos originales para comparar cambios
    const originalData = data || initialData || {}
    originalDataRef.current = { ...originalData }

    // Si viene de subir un PDF, limpiar borrador existente y NO mostrar modal
    if (isFromPdfUpload) {
      clearDraft(key)
      return
    }

    // Detectar si hay un borrador guardado (solo si NO es subida de PDF)
    const existingDraft = loadDraft(key)
    if (existingDraft && existingDraft.data) {
      // Verificar si el borrador es diferente a los datos actuales
      const draftCuit = existingDraft.data.cuit || ''
      const currentCuit = formData?.cuit || data?.cuit || ''
      if (draftCuit.replace(/[-.\s/]/g, '') === currentCuit.replace(/[-.\s/]/g, '') || !currentCuit) {
        // Verificar si el borrador tiene cambios reales respecto a los datos originales
        const changes = existingDraft.changes || detectDraftChanges(originalDataRef.current, existingDraft.data)
        if (changes && changes.length > 0) {
          // Guardar los cambios en el borrador si no estaban
          if (!existingDraft.changes) {
            existingDraft.changes = changes
          }
          setPendingDraft(existingDraft)
          setShowDraftModal(true)
        } else {
          // No hay cambios reales, limpiar el borrador
          clearDraft(key)
        }
      }
    }
  }, [isFromPdfUpload]) // Solo al montar o cuando cambia isFromPdfUpload

  // ── Autosave: guardar borrador cada N segundos SOLO si hay cambios ──
  useEffect(() => {
    if (!draftKey || !editMode) return

    const saveCurrentDraft = () => {
      const currentData = formDataRef.current
      if (!currentData || (!currentData.cuit && !currentData.razon_social)) return

      // Detectar cambios respecto a los datos originales
      const changes = detectDraftChanges(originalDataRef.current, currentData)
      
      // Solo guardar si hay cambios reales
      if (changes.length > 0) {
        const saved = saveDraft(draftKey, currentData, selectedPaisRef.current, originalDataRef.current, changes)
        if (saved) {
          setLastSavedAt(new Date().toISOString())
        }
      }
    }

    // Configurar intervalo de autosave (no guardar inmediatamente, esperar cambios)
    autosaveTimerRef.current = setInterval(saveCurrentDraft, DRAFT_INTERVAL_MS)

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current)
      }
    }
  }, [draftKey, editMode])

  // ── Limpiar timer al desmontar ──
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current)
    }
  }, [])

  // ── Estados para modal de borrador mejorado ──
  const [draftSelectedFields, setDraftSelectedFields] = useState({})
  const [draftExpandedFields, setDraftExpandedFields] = useState({})

  // Inicializar campos seleccionados cuando se detecta borrador
  useEffect(() => {
    if (pendingDraft?.changes) {
      const initial = {}
      pendingDraft.changes.forEach(c => { initial[c.field] = true })
      setDraftSelectedFields(initial)
      setDraftExpandedFields({})
    }
  }, [pendingDraft])

  // ── Función para recuperar borrador (solo campos seleccionados) ──
  const handleRecoverDraft = () => {
    if (pendingDraft && pendingDraft.data) {
      // Si hay campos seleccionados, recuperar solo esos
      const selectedCount = Object.values(draftSelectedFields).filter(Boolean).length
      if (selectedCount > 0 && pendingDraft.changes) {
        // Recuperar parcialmente: empezar con datos originales y aplicar solo seleccionados
        const baseData = originalDataRef.current || formData
        const mergedData = { ...baseData }
        pendingDraft.changes.forEach(change => {
          if (draftSelectedFields[change.field]) {
            mergedData[change.field] = pendingDraft.data[change.field]
          }
        })
        setFormData(normalizeForEditor(mergedData))
        toast.success(`${selectedCount} campo(s) recuperado(s) del borrador`)
      } else {
        // Recuperar todo
        setFormData(normalizeForEditor(pendingDraft.data))
        toast.success('Datos recuperados del borrador')
      }
      if (pendingDraft.selectedPais) {
        setSelectedPais(pendingDraft.selectedPais)
      }
      setEditMode(true)
      // ⚠️ NO limpiamos el borrador aquí - se limpia solo al GUARDAR exitosamente
      // Así si el usuario no guarda, al volver verá el modal de nuevo
    }
    setShowDraftModal(false)
    setPendingDraft(null)
  }

  // ── Función para descartar borrador ──
  const handleDiscardDraft = () => {
    if (draftKey) {
      clearDraft(draftKey)
    }
    setShowDraftModal(false)
    setPendingDraft(null)
    toast('Borrador descartado', { icon: '🗑️' })
  }

  // ── Toggle selección de campo en borrador ──
  const toggleDraftField = (field) => {
    setDraftSelectedFields(prev => ({ ...prev, [field]: !prev[field] }))
  }

  // ── Toggle expandir campo en borrador ──
  const toggleDraftExpand = (field) => {
    setDraftExpandedFields(prev => ({ ...prev, [field]: !prev[field] }))
  }

  // ── Seleccionar/deseleccionar todos los campos ──
  const toggleAllDraftFields = (selectAll) => {
    if (pendingDraft?.changes) {
      const updated = {}
      pendingDraft.changes.forEach(c => { updated[c.field] = selectAll })
      setDraftSelectedFields(updated)
    }
  }

  // ── Formatear valor para mostrar en modal ──
  const formatDraftValue = (value) => {
    if (value === null || value === undefined || value === '') return '(vacío)'
    if (typeof value === 'string') {
      // Limpiar HTML y truncar
      const clean = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      return clean.length > 150 ? clean.substring(0, 150) + '...' : clean
    }
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const handlePaisChange = (codigo) => {
    const pais = paisesDisponibles.find(p => p.codigo_pais === codigo)
    setSelectedPais(pais || null)
    // Limpiar todo al cambiar/deseleccionar país
    setFormData(normalizeForEditor({
      tipo_identificacion: pais ? (pais.tipo_id_fiscal || 'CUIT') : '',
    }))
    setTaxIdError(null)
    setExistingEmpresa(null)
    setExistingSolicitud(null)
    if (checkCuitTimerRef.current) clearTimeout(checkCuitTimerRef.current)
    if (pais) {
      setEditMode(true)
      setExpandedGroups(['principal', 'texto'])
    }
  }

  // ── Funciones para "Otro país" ──
  const openOtrosPaisesModal = async () => {
    setCountryDDOpen(false)
    setShowOtrosPaisesModal(true)
    setOtrosSearch('')
    setLoadingOtros(true)
    try {
      const res = await axios.get('/api/countries/available')
      setOtrosPaises(res.data.paises || [])
    } catch (err) {
      toast.error('Error al cargar países disponibles')
      setOtrosPaises([])
    } finally {
      setLoadingOtros(false)
    }
  }

  const handleAddOtroPais = async (pais) => {
    setAddingCountry(pais.codigo)
    try {
      const res = await axios.post('/api/countries/add', { codigo: pais.codigo })
      if (res.data.success) {
        toast.success(`${pais.nombre} agregado. Validación pendiente de configuración.`)
        // Refrescar países disponibles
        const patRes = await axios.get('/api/country-patterns')
        if (patRes.data.paises) {
          setPaisesDisponibles(patRes.data.paises)
          // Auto-seleccionar el nuevo país
          const nuevoPais = patRes.data.paises.find(p => p.codigo_pais === pais.codigo)
          if (nuevoPais) {
            setSelectedPais(nuevoPais)
            setFormData(normalizeForEditor({
              tipo_identificacion: nuevoPais.tipo_id_fiscal || 'ID',
            }))
            setEditMode(true)
            setExpandedGroups(['principal', 'texto'])
          }
        }
        setShowOtrosPaisesModal(false)
      } else {
        toast.error(res.data.error || 'Error al agregar país')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar país')
    } finally {
      setAddingCountry(null)
    }
  }

  // Cargar datos si se proporciona empresaId
  useEffect(() => {
    if (empresaId) {
      loadEmpresa()
    }
  }, [empresaId])

  useEffect(() => {
    if (!empresaId && !isNewReport) {
      setFormData(normalizeForEditor(data || {}))
    }
  }, [data, empresaId])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
      }
      if (checkCuitTimerRef.current) {
        clearTimeout(checkCuitTimerRef.current)
      }
    }
  }, [])

  const loadEmpresa = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/empresas/${empresaId}`)
      if (response.data.success) {
        const empresaData = normalizeForEditor(response.data.empresa || {})
        // Actualizar datos originales para comparación de borradores
        originalDataRef.current = { ...empresaData }
        // Si viene de solicitud, aplicar datos del pedido sobre los de la empresa
        if (fromSolicitud) {
          if (fromSolicitud.abonado) {
            empresaData.abonado = String(fromSolicitud.abonado)
          }
          if (fromSolicitud.expediente) {
            empresaData.expediente = String(fromSolicitud.expediente)
          }
          if (fromSolicitud.referencia) {
            empresaData.referencia = fromSolicitud.referencia
          }
          if (fromSolicitud.fecha_informe) {
            empresaData.fecha_informe = fromSolicitud.fecha_informe
          }
          // Expandir grupo informe para mostrar los datos del pedido
          setExpandedGroups(prev => [...new Set([...prev, 'informe'])])
        }
        setFormData(empresaData)
      }
    } catch (err) {
      toast.error('Error al cargar empresa')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name, value) => {
    if (editMode) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      // Validar ID fiscal en tiempo real (excepto para tipo 'ID' genérico)
      if (name === 'cuit' || name === 'tipo_identificacion') {
        const taxId = name === 'cuit' ? value : formData.cuit
        const tipo = name === 'tipo_identificacion' ? value : formData.tipo_identificacion
        
        // Para tipo 'ID' genérico, no validar formato
        if (tipo === 'ID') {
          setTaxIdError(null)
          setExistingEmpresa(null)
          return
        }
        
        if (taxId && taxId.trim()) {
          const result = validateTaxId(taxId, tipo)
          setTaxIdError(result.valid ? null : result.error)

          // Si formato válido, verificar existencia en BD (debounce 500ms)
          if (result.valid) {
            if (checkCuitTimerRef.current) clearTimeout(checkCuitTimerRef.current)
            checkCuitTimerRef.current = setTimeout(async () => {
              try {
                const res = await axios.get(`/api/check-cuit/${encodeURIComponent(taxId.trim())}`)
                if (res.data.exists && res.data.empresa) {
                  setExistingEmpresa(res.data.empresa)
                } else {
                  setExistingEmpresa(null)
                }
                if (res.data.solicitud) {
                  setExistingSolicitud(res.data.solicitud)
                  // Auto-fill desde solicitud si no hay empresa existente
                  if (!res.data.exists) {
                    const sol = res.data.solicitud
                    const datos = sol.datos_externos || {}
                    
                    setFormData(prev => {
                      const updated = { ...prev }
                      
                      // Razón social
                      if (sol.razon_social && !prev.razon_social) {
                        updated.razon_social = sol.razon_social
                      }
                      
                      // Domicilio fiscal (concatenado)
                      if (sol.domicilio && !prev.domicilio) {
                        updated.domicilio = sol.domicilio
                      }
                      
                      // Datos desde datos_externos JSON
                      if (datos.tipo_societario && !prev.forma_legal) {
                        updated.forma_legal = datos.tipo_societario
                      }
                      
                      // Fecha contrato social - normalizar a YYYY-MM-DD
                      if (datos.fecha_contrato_social && !prev.fecha_contrato_social) {
                        updated.fecha_contrato_social = datos.fecha_contrato_social
                      }
                      
                      // Domicilio legal como domicilio alternativo o adicional
                      if (datos.domicilio_legal && !prev.domicilio) {
                        const dl = datos.domicilio_legal
                        const parts = []
                        if (dl.calle) parts.push(dl.calle)
                        if (dl.numero) parts.push(dl.numero)
                        if (dl.piso) parts.push(`Piso ${dl.piso}`)
                        if (dl.departamento) parts.push(`Depto ${dl.departamento}`)
                        if (dl.localidad) parts.push(dl.localidad)
                        if (dl.provincia) parts.push(dl.provincia)
                        if (dl.cp) parts.push(`CP ${dl.cp}`)
                        if (parts.length > 0 && !updated.domicilio) {
                          updated.domicilio = parts.join(', ')
                        }
                      }
                      
                      return updated
                    })
                  }
                } else {
                  setExistingSolicitud(null)
                }
              } catch (_) {
                setExistingEmpresa(null)
                setExistingSolicitud(null)
              }
            }, 500)
          } else {
            setExistingEmpresa(null)
            setExistingSolicitud(null)
          }
        } else {
          setTaxIdError(null)
          setExistingEmpresa(null)
          setExistingSolicitud(null)
        }
      }
    }
  }

  const normalizeAppliedValue = (campo, valor) => {
    if (valor === null || valor === undefined) return ''
    const raw = String(valor).trim()

    // Inputs date de HTML requieren formato YYYY-MM-DD.
    const dateFields = new Set(['fecha_contrato_social', 'fecha_inscripcion_afip', 'fecha_informe'])
    if (dateFields.has(campo)) {
      const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (dmy) {
        const dd = dmy[1].padStart(2, '0')
        const mm = dmy[2].padStart(2, '0')
        const yyyy = dmy[3]
        return `${yyyy}-${mm}-${dd}`
      }
      const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (iso) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`
      }
    }

    // Limpiar espacios repetidos en domicilio y otros textos cortos.
    if (campo === 'domicilio') {
      return raw.replace(/\s+/g, ' ').trim()
    }

    return raw
  }

  const toggleGroup = (group) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    )
  }

  const handleExtraFieldChange = (fieldId, patch) => {
    setFormData(prev => ({
      ...prev,
      extra_fields: (prev.extra_fields || []).map(field =>
        field.id === fieldId ? { ...field, ...patch } : field
      )
    }))
  }

  const handleAddExtraField = (group) => {
    if (!editMode) return
    const newField = {
      id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      group,
      label: 'Nuevo campo',
      type: 'text',
      value: '',
    }

    setFormData(prev => ({
      ...prev,
      extra_fields: [...(prev.extra_fields || []), newField]
    }))
  }

  const handleRemoveExtraField = (fieldId) => {
    if (!editMode) return
    setFormData(prev => ({
      ...prev,
      extra_fields: (prev.extra_fields || []).filter(field => field.id !== fieldId)
    }))
  }

  const isFieldJustified = (fieldName) => {
    return (formData.justify_fields || []).includes(fieldName)
  }

  const toggleJustifyField = (fieldName) => {
    setFormData(prev => {
      const current = prev.justify_fields || []
      const next = current.includes(fieldName)
        ? current.filter(f => f !== fieldName)
        : [...current, fieldName]
      return { ...prev, justify_fields: next }
    })
  }

  const handleSave = async () => {
    // Validar país primero (solo nuevo informe en blanco)
    if (isNewBlank && !selectedPais) {
      toast.error('Debes seleccionar un país antes de guardar')
      return
    }
    // Bloquear si ya existe en empresas y es nuevo informe
    if (isNewBlank && existingEmpresa) {
      toast.error(`Ya existe un informe para este identificador (${existingEmpresa.razon_social}). Búscalo en Registros para editarlo.`)
      return
    }
    // Validar campos obligatorios
    if (!formData.razon_social || !formData.razon_social.trim()) {
      toast.error('Razón Social es obligatorio')
      return
    }
    
    // Validar ID fiscal (flexible para tipo 'ID' genérico)
    const tipoId = formData.tipo_identificacion
    if (tipoId === 'ID') {
      // Para tipo 'ID' genérico (informes internacionales), el campo puede estar vacío o tener cualquier valor
      // No se requiere validación de formato
    } else {
      // Para tipos específicos (CUIT, RUT, RNC, etc.), validar normalmente
      if (!formData.cuit || !formData.cuit.trim()) {
        toast.error(`${inferDisplayedTaxType(formData.tipo_identificacion, formData.cuit) || 'Identificador fiscal'} es obligatorio`)
        return
      }
      const taxValidation = validateTaxId(formData.cuit, formData.tipo_identificacion)
      if (!taxValidation.valid) {
        toast.error(`${inferDisplayedTaxType(formData.tipo_identificacion, formData.cuit)}: ${taxValidation.error}`)
        return
      }
    }

    setSaving(true)
    try {
      // Incluir país si está seleccionado (nuevo informe)
      const dataToSave = { ...formData }
      if (isNewBlank && selectedPais) {
        dataToSave.pais = selectedPais.nombre_pais
        dataToSave.codigo_pais = selectedPais.codigo_pais
      }
      const response = await axios.post('/api/save', dataToSave)
      
      if (response.data.success) {
        const msg = response.data.action === 'updated' 
          ? 'Registro actualizado correctamente'
          : 'Registro guardado correctamente'
        toast.success(msg)

        // ✅ Limpiar borrador al guardar exitosamente
        if (draftKey) {
          clearDraft(draftKey)
          setLastSavedAt(null)
        }

        // Recargar datos frescos del servidor
        const newId = response.data.id
        if (newId) {
          // Actualizar draftKey con el nuevo ID
          setDraftKey(getDraftKey(formData.cuit, newId))
          try {
            const fresh = await axios.get(`/api/empresas/${newId}`, {
              headers: { 'Cache-Control': 'no-cache' }
            })
            if (fresh.data.success) {
              setFormData(normalizeForEditor(fresh.data.empresa || {}))
            }
          } catch (_) {
            // Si falla reload, al menos actualizar con lo que tenemos
          }
        }
      } else {
        toast.error(response.data.error || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error:', err)
      // ⚠️ Al fallar, el borrador se mantiene para recuperación
      toast.error(err.response?.data?.error || 'Error de conexión. Tus cambios están guardados localmente.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewPDF = async () => {
    try {
      toast.loading('Generando vista previa...', { id: 'pdf-preview' })
      const response = await axios.post('/api/preview-pdf', { ...formData, _lang: 'es' }, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      toast.success('Vista previa generada', { id: 'pdf-preview' })
    } catch (err) {
      console.error('Error preview:', err)
      toast.error('Error al generar vista previa', { id: 'pdf-preview' })
    }
  }

  const getFieldValue = (name) => {
    const value = formData[name]
    if (value === null || value === undefined) return ''
    if (name === 'emails_contacto') return formatEmailListForInput(value)
    return value
  }

  // Obtener label dinámico para campos como CUIT/RUT/RNC
  const getDynamicLabel = (field) => {
    if (field.name === 'cuit') {
      return inferDisplayedTaxType(formData.tipo_identificacion, formData.cuit)
    }
    return field.label
  }

  // Campos bloqueados por datos AFIP validados
  const AFIP_LOCKED_FIELDS = new Set(['cuit', 'razon_social', 'domicilio', 'actividad_principal', 'ingresos_brutos'])
  const isFieldLocked = (fieldName) => {
    if (afipLocked && AFIP_LOCKED_FIELDS.has(fieldName) && !!getFieldValue(fieldName)) return true
    // CUIT bloqueado para no-admin cuando viene de solicitud
    if (fromSolicitud && fieldName === 'cuit' && !isAdmin) return true
    return false
  }

  const renderField = (field) => {
    // No renderizar campos ocultos
    if (field.hidden) return null
    
    const value = getFieldValue(field.name)
    const isEmpty = !value || value === ''
    const displayLabel = field.dynamicLabel ? getDynamicLabel(field) : field.label
    const locked = isFieldLocked(field.name)
    const fieldDisabled = !editMode || locked

    return (
      <div
        key={field.name}
        className={`mb-4 transition-all ${highlightedField === field.name ? 'rounded-md ring-2 ring-green-400 ring-offset-1' : ''}`}
      >
        <label className="field-label">
          <span className="flex items-center gap-2">
            {displayLabel}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            {field.type === 'textarea' && (
              <button
                type="button"
                onClick={() => toggleJustifyField(field.name)}
                title={isFieldJustified(field.name) ? 'Texto justificado en PDF (clic para desactivar)' : 'Justificar texto en PDF'}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  isFieldJustified(field.name)
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200 hover:text-gray-600'
                }`}
              >
                <AlignJustify className="h-3 w-3" />
                {isFieldJustified(field.name) ? 'Justificado' : 'Justificar'}
              </button>
            )}
          </span>
        </label>
        
        {field.description && (
          <p className="text-xs text-gray-500 mb-1">{field.description}{locked && <span className="ml-1 text-blue-500 font-medium">(dato validado por AFIP)</span>}</p>
        )}
        
        {field.type === 'textarea' ? (
          <div className={`quill-wrapper ${fieldDisabled ? 'quill-disabled' : ''} ${isEmpty ? 'quill-empty' : ''}`}>
            <ReactQuill
              theme="snow"
              value={value || ''}
              onChange={(content) => handleChange(field.name, content)}
              modules={!fieldDisabled ? quillModules : { toolbar: false }}
              formats={quillFormats}
              readOnly={fieldDisabled}
              placeholder="Sin contenido..."
            />
          </div>
        ) : field.type === 'email_list' ? (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.name, parseEmailListFromInput(e.target.value))}
            disabled={fieldDisabled}
            rows={3}
            className={`field-input ${isEmpty ? 'bg-amber-50 border-amber-200' : ''}`}
            placeholder="ej: correo1@empresa.com, correo2@empresa.com"
          />
        ) : (
          <>
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={fieldDisabled}
            className={`field-input ${isEmpty ? 'bg-amber-50 border-amber-200' : ''} ${locked ? 'bg-blue-50 border-blue-200' : ''} ${
              field.name === 'cuit' && taxIdError ? 'border-red-400 bg-red-50' : ''
            } ${
              field.name === 'cuit' && value && !taxIdError ? 'border-green-400' : ''
            }`}
          />
          {field.name === 'cuit' && taxIdError && (
            <p className="text-xs text-red-600 flex items-center mt-1">
              <XCircle className="h-3 w-3 mr-1" />
              {taxIdError}
            </p>
          )}
          {field.name === 'cuit' && value && !taxIdError && (
            <p className="text-xs text-green-600 flex items-center mt-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              Formato válido
            </p>
          )}
          {field.name === 'cuit' && existingEmpresa && !taxIdError && (
            <div className={`mt-1.5 p-2 rounded-md border ${isNewBlank ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-300'}`}>
              <p className={`text-xs font-medium flex items-center ${isNewBlank ? 'text-red-800' : 'text-amber-800'}`}>
                <XCircle className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                {isNewBlank
                  ? 'Este identificador ya tiene un informe registrado'
                  : 'Ya existe un informe con este identificador'}
              </p>
              <p className={`text-xs mt-0.5 ml-4.5 ${isNewBlank ? 'text-red-700' : 'text-amber-700'}`}>
                <strong>{existingEmpresa.razon_social}</strong>
                {existingEmpresa.actividad_principal ? ` — ${existingEmpresa.actividad_principal}` : ''}
              </p>
              {isNewBlank ? (
                <p className="text-[10px] text-red-600 mt-0.5 ml-4.5">
                  No se puede crear un informe duplicado. Busca el registro existente para editarlo.
                </p>
              ) : (
                <p className="text-[10px] text-amber-600 mt-0.5 ml-4.5">
                  Si guardas, se creará una nueva versión del registro existente.
                </p>
              )}
            </div>
          )}
          {field.name === 'cuit' && !existingEmpresa && existingSolicitud && !taxIdError && (
            <div className="mt-1.5 p-2 bg-blue-50 border border-blue-300 rounded-md">
              <p className="text-xs text-blue-800 font-medium flex items-center">
                <AlertTriangle className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                Existe una solicitud de investigación con este identificador
              </p>
              <p className="text-xs text-blue-700 mt-0.5 ml-4.5">
                <strong>{existingSolicitud.razon_social || 'Sin razón social'}</strong>
                {` — Estado: ${existingSolicitud.estado || 'desconocido'}`}
              </p>
            </div>
          )}
          </>
        )}

        {isEmpty && (
          <p className="text-xs text-amber-600 flex items-center mt-1">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Sin datos
          </p>
        )}
      </div>
    )
  }

  const renderExtraField = (field) => {
    const value = field?.value ?? ''
    const label = field?.label || 'Campo extra'
    const isTextarea = field?.type === 'textarea'
    const inputType = ['url', 'email', 'number', 'date'].includes(field?.type) ? field.type : 'text'

    return (
      <div key={field.id} className="mb-4 rounded-lg border border-dashed border-gray-300 p-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Etiqueta</label>
              <input
                type="text"
                value={label}
                onChange={(e) => handleExtraFieldChange(field.id, { label: e.target.value })}
                disabled={!editMode}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Tipo</label>
              <select
                value={field?.type || 'text'}
                onChange={(e) => handleExtraFieldChange(field.id, { type: e.target.value, value: '' })}
                disabled={!editMode}
                className="field-input"
              >
                {EXTRA_FIELD_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          {editMode && (
            <button
              type="button"
              onClick={() => handleRemoveExtraField(field.id)}
              className="mt-6 inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar
            </button>
          )}
        </div>

        {isTextarea ? (
          <textarea
            rows={4}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleExtraFieldChange(field.id, { value: e.target.value })}
            disabled={!editMode}
            className="field-input"
          />
        ) : (
          <input
            type={inputType}
            value={value ?? ''}
            onChange={(e) => handleExtraFieldChange(field.id, { value: e.target.value })}
            disabled={!editMode}
            className="field-input"
          />
        )}
      </div>
    )
  }

  const groupedFields = FIELDS.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = []
    acc[field.group].push(field)
    return acc
  }, {})

  const groupedExtraFields = (formData.extra_fields || []).reduce((acc, field) => {
    const group = field?.group || 'principal'
    if (!acc[group]) acc[group] = []
    acc[group].push(field)
    return acc
  }, {})

  const tipoIdentificacion = inferDisplayedTaxType(formData.tipo_identificacion, formData.cuit)
  const idSoloDigitos = (formData.cuit || '').replace(/\D/g, '')
  const habilitaValidacionArgentina = tipoIdentificacion === 'CUIT' && idSoloDigitos.length === 11
  const habilitaValidacionUruguay = tipoIdentificacion === 'RUT' && (idSoloDigitos.length === 9 || idSoloDigitos.length === 12)
  const habilitaValidacionExterna = habilitaValidacionArgentina || habilitaValidacionUruguay
  // OSINT disponible para cualquier país con ID fiscal y razón social
  const habilitaOsint = !!(formData.cuit && formData.razon_social)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-3" />
          <span className="text-gray-600">Cargando datos...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {formData.razon_social || (isNewReport || isNewBlank ? 'Nuevo Informe' : 'Datos Extraídos')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                  {isNewBlank && selectedPais ? `País: ${selectedPais.nombre_pais} | ` : ''}
                  {isNewReport && countryConfig ? `País: ${countryConfig.nombre_pais} | ` : ''}{filename ? `Archivo: ${filename} | ` : ''}{inferDisplayedTaxType(formData.tipo_identificacion, formData.cuit)}: {formData.cuit || 'No detectado'} {mode === 'view' && '(Lectura)'}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={onBack}
                  className="btn-secondary flex items-center text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  Volver
                </button>
                
                {mode === 'edit' && (
                  <>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`flex items-center px-3 sm:px-4 py-2 rounded-md transition-colors text-sm ${
                        editMode 
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Edit3 className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{editMode ? 'Modo Edición ON' : 'Habilitar Edición'}</span>
                      <span className="sm:hidden">{editMode ? 'Edición ON' : 'Editar'}</span>
                    </button>

                    <button
                      onClick={handlePreviewPDF}
                      className="flex items-center px-3 sm:px-4 py-2 rounded-md transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm"
                      title="Vista previa del PDF"
                    >
                      <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Vista Previa</span>
                      <span className="sm:hidden">PDF</span>
                    </button>

                    {/* Indicador de autosave */}
                    {editMode && lastSavedAt && (
                      <span className="hidden lg:flex items-center gap-1 text-xs text-gray-400" title="Borrador guardado automáticamente">
                        <Clock className="w-3 h-3" />
                        Borrador {formatDraftDate(lastSavedAt).split(' ')[1]}
                      </span>
                    )}

                    {editMode && (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center text-sm"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info Banner - Solo mostrar en modo edición, no en modo lectura */}
          {mode !== 'view' && !isNewBlank && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {isNewReport ? 'Nuevo informe — completa los datos' : 'Revisa los datos extraídos antes de guardar'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {isNewReport 
                      ? formData.tipo_identificacion === 'ID'
                        ? <>El campo <strong>Razón Social</strong> es obligatorio. El identificador es opcional para informes internacionales.</>
                        : <>Los campos <strong>Razón Social</strong> y <strong>{inferDisplayedTaxType(formData.tipo_identificacion, formData.cuit)}</strong> son obligatorios.</>
                      : <>Los campos marcados en amarillo no tienen datos. Puedes{' '}
                        <strong>habilitar edición</strong> para modificarlos antes de guardar.</>
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

      {/* Selector de País — Solo para nuevo informe en blanco */}
      {isNewBlank && (
        <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">País</label>
              </div>
              {fromSolicitud && selectedPais ? (
                /* Viene de solicitud: solo mostrar país como referencia */
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <img src={`https://flagcdn.com/20x15/${selectedPais.codigo_pais.toLowerCase()}.png`} alt={selectedPais.nombre_pais} className="inline-block" />
                  {selectedPais.nombre_pais}
                </span>
              ) : loadingPaises ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                </div>
              ) : (
                <div className="relative w-full sm:w-96" ref={countryDropdownRef}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setCountryDDOpen(!countryDDOpen); setCountryDDSearch('') }}
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 transition-colors bg-white flex items-center justify-between"
                    >
                      {selectedPais ? (
                        <span className="flex items-center gap-2">
                          <img src={`https://flagcdn.com/24x18/${selectedPais.codigo_pais.toLowerCase()}.png`} alt="" className="w-6 h-4 object-cover rounded-sm" />
                          <span>{selectedPais.nombre_pais} — {selectedPais.tipo_id_fiscal}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Selecciona un país para comenzar...</span>
                      )}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${countryDDOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {selectedPais && (
                      <button
                        type="button"
                        onClick={() => { handlePaisChange(''); setCountryDDOpen(false) }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Limpiar selección"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {countryDDOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden">
                      <div className="p-2 border-b">
                        <input
                          type="text"
                          placeholder="Buscar país..."
                          value={countryDDSearch}
                          onChange={(e) => setCountryDDSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto max-h-64">
                        {paisesDisponibles
                          .filter(p => !countryDDSearch || p.nombre_pais.toLowerCase().includes(countryDDSearch.toLowerCase()) || p.codigo_pais.toLowerCase().includes(countryDDSearch.toLowerCase()))
                          .map(p => (
                          <button
                            key={p.codigo_pais}
                            type="button"
                            onClick={() => { handlePaisChange(p.codigo_pais); setCountryDDOpen(false) }}
                            className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${selectedPais?.codigo_pais === p.codigo_pais ? 'bg-blue-50 font-semibold' : ''}`}
                          >
                            <img src={`https://flagcdn.com/24x18/${p.codigo_pais.toLowerCase()}.png`} alt="" className="w-6 h-4 object-cover rounded-sm" />
                            <span className="text-sm">
                              <span className="text-gray-400 font-mono text-xs mr-1">{p.codigo_pais}</span>
                              {p.nombre_pais} — <span className="text-blue-600">{p.tipo_id_fiscal}</span>
                            </span>
                          </button>
                        ))}
                        {/* Separador y opción "Otro país" */}
                        {!countryDDSearch && (
                          <>
                            <div className="border-t my-1" />
                            <button
                              type="button"
                              onClick={openOtrosPaisesModal}
                              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left text-purple-700"
                            >
                              <span className="w-6 h-4 flex items-center justify-center text-lg">🌍</span>
                              <span className="text-sm font-medium">
                                Otro país...
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {selectedPais && !fromSolicitud && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {selectedPais.nombre_pais} seleccionado
                </span>
              )}
            </div>
            {!selectedPais && !fromSolicitud && (
              <p className="text-xs text-gray-400 mt-2 ml-7">
                Todos los campos se habilitarán al seleccionar un país
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══ Modal de Recuperación de Borrador ══ */}
      {showDraftModal && pendingDraft && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDraftModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-full">
                  <RotateCcw className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Borrador con cambios detectado</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Guardado: {formatDraftDate(pendingDraft.savedAt)}
                  </p>
                </div>
              </div>

              {/* Info del registro */}
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {pendingDraft.data.razon_social && (
                    <div className="flex gap-2">
                      <span className="text-gray-400">Razón Social:</span>
                      <span className="font-medium text-gray-700">{pendingDraft.data.razon_social}</span>
                    </div>
                  )}
                  {pendingDraft.data.cuit && (
                    <div className="flex gap-2">
                      <span className="text-gray-400">ID Fiscal:</span>
                      <span className="font-medium text-gray-700">{pendingDraft.data.cuit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de campos modificados con checkboxes */}
            {pendingDraft.changes && pendingDraft.changes.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Header de lista con seleccionar todo */}
                <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Campos modificados ({pendingDraft.changes.length})
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => toggleAllDraftFields(true)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => toggleAllDraftFields(false)}
                      className="text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {/* Lista scrolleable */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-2">
                    {pendingDraft.changes.map((change, idx) => {
                      const isSelected = draftSelectedFields[change.field]
                      const isExpanded = draftExpandedFields[change.field]
                      const newValue = formatDraftValue(change.newValue)
                      const oldValue = formatDraftValue(change.oldValue)

                      return (
                        <div 
                          key={idx} 
                          className={`rounded-lg border transition-all ${
                            isSelected 
                              ? 'border-blue-300 bg-blue-50/50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {/* Fila principal */}
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            {/* Checkbox */}
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleDraftField(change.field)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </label>

                            {/* Icono de tipo */}
                            {change.type === 'added' && (
                              <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">+</span>
                            )}
                            {change.type === 'removed' && (
                              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold flex-shrink-0">−</span>
                            )}
                            {change.type === 'modified' && (
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">✎</span>
                            )}

                            {/* Nombre del campo y badge */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-800">{change.label}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  change.type === 'added' ? 'bg-green-100 text-green-700' :
                                  change.type === 'removed' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {change.type === 'added' ? 'nuevo' : change.type === 'removed' ? 'eliminado' : 'modificado'}
                                </span>
                              </div>
                              {/* Preview del valor (colapsado) */}
                              {!isExpanded && change.type !== 'removed' && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {newValue}
                                </p>
                              )}
                            </div>

                            {/* Botón expandir */}
                            <button
                              onClick={() => toggleDraftExpand(change.field)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                              title={isExpanded ? 'Colapsar' : 'Ver detalles'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Contenido expandido */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-100 ml-7">
                              {change.type === 'modified' && (
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-xs font-medium text-gray-400 uppercase">Valor anterior:</span>
                                    <p className="text-gray-500 bg-gray-50 rounded p-2 mt-1 text-xs break-words">
                                      {oldValue}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-blue-500 uppercase">Nuevo valor:</span>
                                    <p className="text-gray-700 bg-blue-50 rounded p-2 mt-1 text-xs break-words">
                                      {newValue}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {change.type === 'added' && (
                                <div className="text-sm">
                                  <span className="text-xs font-medium text-green-500 uppercase">Valor agregado:</span>
                                  <p className="text-gray-700 bg-green-50 rounded p-2 mt-1 text-xs break-words">
                                    {newValue}
                                  </p>
                                </div>
                              )}
                              {change.type === 'removed' && (
                                <div className="text-sm">
                                  <span className="text-xs font-medium text-red-500 uppercase">Valor eliminado:</span>
                                  <p className="text-gray-500 bg-red-50 rounded p-2 mt-1 text-xs break-words line-through">
                                    {oldValue}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer con botones */}
            <div className="p-5 border-t flex-shrink-0 bg-gray-50">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Selecciona los campos que deseas recuperar o usa los botones para aplicar todos o descartar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDiscardDraft}
                  className="flex-1 px-4 py-2.5 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                >
                  Descartar todo
                </button>
                <button
                  onClick={handleRecoverDraft}
                  disabled={Object.values(draftSelectedFields).filter(Boolean).length === 0}
                  className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Recuperar ({Object.values(draftSelectedFields).filter(Boolean).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Otros Países */}
      {showOtrosPaisesModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOtrosPaisesModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-xl">🌍</span> Seleccionar otro país
              </h3>
              <button
                onClick={() => setShowOtrosPaisesModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 border-b">
              <input
                type="text"
                placeholder="Buscar país por nombre..."
                value={otrosSearch}
                onChange={(e) => setOtrosSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingOtros ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando países...
                </div>
              ) : otrosPaises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay más países disponibles para agregar
                </div>
              ) : (
                <div className="space-y-1">
                  {otrosPaises
                    .filter(p => !otrosSearch || p.nombre.toLowerCase().includes(otrosSearch.toLowerCase()))
                    .map(p => (
                    <button
                      key={p.codigo}
                      type="button"
                      onClick={() => handleAddOtroPais(p)}
                      disabled={addingCountry === p.codigo}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left rounded-xl disabled:opacity-50"
                    >
                      <span className="text-xl">{p.bandera}</span>
                      <span className="flex-1">
                        <span className="font-medium text-gray-800">{p.nombre}</span>
                        <span className="text-gray-400 text-xs ml-2">{p.codigo}</span>
                      </span>
                      {addingCountry === p.codigo ? (
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      ) : (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Agregar</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500 text-center">
                ⚠️ Los países agregados quedan pendientes de configuración por el administrador
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido del formulario — disabled si no hay país seleccionado */}
      <div className={!countrySelected ? 'opacity-40 pointer-events-none' : ''}>

      {/* Validación AFIP/ARCA — Solo Argentina (CUIT) */}
      {habilitaValidacionArgentina && mode !== 'view' && (
        <div className="mb-4 sm:mb-6">
          <ValidationPanel
            cuit={formData.cuit}
            tipoId={tipoIdentificacion}
            onApplyField={editMode ? (campo, valor, append = false) => {
              let nuevoValor = normalizeAppliedValue(campo, valor)
              // Si append es true, agregar al valor existente
              if (append && formData[campo]) {
                const valorActual = formData[campo]
                nuevoValor = valorActual + '<br/><br/>' + nuevoValor
              }
              handleChange(campo, nuevoValor)
              setHighlightedField(campo)
              if (highlightTimerRef.current) {
                clearTimeout(highlightTimerRef.current)
              }
              highlightTimerRef.current = setTimeout(() => {
                setHighlightedField(null)
              }, 2000)
              toast.success(`Campo "${campo}" actualizado`)
            } : null}
          />
        </div>
      )}

      {/* OSINT Panel — disponible para todos los países con ID fiscal y razón social */}
      {habilitaOsint && (
        <div className="mb-4 sm:mb-6">
          <OsintPanel
            cuit={formData.cuit}
            razonSocial={formData.razon_social}
            email={formData.email_empresa || formData.emails_contacto}
          />
        </div>
      )}

      {/* Boletín Oficial — Solo Argentina (CUIT) */}
      {habilitaValidacionArgentina && mode !== 'view' && (
        <div className="mb-4 sm:mb-6">
          <BoletinValidationPanel
            cuit={formData.cuit}
            razonSocial={formData.razon_social}
            onApplyField={editMode ? (campo, valor) => {
              handleChange(campo, normalizeAppliedValue(campo, valor))
              setHighlightedField(campo)
              if (highlightTimerRef.current) {
                clearTimeout(highlightTimerRef.current)
              }
              highlightTimerRef.current = setTimeout(() => {
                setHighlightedField(null)
              }, 2000)
            } : null}
          />
        </div>
      )}

      {/* Form Groups */}
      {Object.entries(FIELD_GROUPS).map(([groupKey, groupInfo]) => {
        const GroupIcon = groupInfo.icon
        const isExpanded = expandedGroups.includes(groupKey)
        const fields = groupedFields[groupKey] || []
        const extraFields = groupedExtraFields[groupKey] || []
        
        return (
          <div key={groupKey} className="bg-white rounded-lg shadow-sm border mb-4 overflow-hidden">
            <button
              onClick={() => toggleGroup(groupKey)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <GroupIcon className="h-5 w-5 text-gray-500 mr-3" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{groupInfo.title}</h3>
                  <p className="text-xs text-gray-500">{groupInfo.description}</p>
                </div>
              </div>
              <span className="text-gray-400">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
            
            {isExpanded && (
              <div className="p-3 sm:p-6">
                {mode === 'edit' && (
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddExtraField(groupKey)}
                      disabled={!editMode}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar campo extra
                    </button>
                  </div>
                )}
                <div className={groupKey === 'texto' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'}>
                  {fields.map(renderField)}
                  {extraFields.map(renderExtraField)}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Action Buttons */}
      {mode === 'edit' && (
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mt-4 sm:mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">
                {editMode 
                  ? '✏️ Modo edición habilitado'
                  : '👁️ Modo visualización'
                }
              </p>
            </div>
            
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onBack}
                className="btn-secondary flex-1 sm:flex-none"
              >
                Cancelar
              </button>

              <button
                onClick={handlePreviewPDF}
                className="btn-secondary flex items-center flex-1 sm:flex-none"
                title="Vista previa del PDF"
              >
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </button>
              
              {editMode && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-success flex items-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>{/* cierre div countrySelected wrapper */}
        </>
      )}
    </div>
  )
}

export default DataEditor

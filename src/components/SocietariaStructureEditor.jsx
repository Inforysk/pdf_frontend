import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import { Check, ChevronDown, Info, Plus, Search, Trash2, X } from 'lucide-react'
import rolesCatalog from '../data/corporate_roles_es.json'

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
  return { personName, details }
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
    const { personName, details } = extractPersonAndDetail(personAndDetail)
    if (!personName || !roleText) return null

    return {
      roleCode: MANUAL_ROLE_CODE,
      customRole: roleText,
      personName,
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

  const { personName, details } = extractPersonAndDetail(cleanedPersonBlock)
  if (!personName) return null

  return {
    roleCode: role.code,
    personName,
    details,
  }
}

const parseInitialValue = (value = '') => {
  const plain = stripHtmlToText(value)
  if (!plain.trim()) {
    return { rows: [{ roleCode: '', customRole: '', personName: '', details: '', roleQuery: '' }], notesHtml: '' }
  }

  const fromStructuredEditor = /<strong>\s*Estructura societaria\s*<\/strong>/i.test(value || '')

  const lines = plain
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const rows = []
  const noteLines = []

  lines.forEach(line => {
    const parsedRow = parseRoleRow(line)
    if (parsedRow) {
      rows.push(parsedRow)
    } else {
      const cleanLine = cleanLineForParsing(line)
      if (cleanLine && !/^(estructura\s+societaria|observaciones)\b/i.test(cleanLine)) {
        noteLines.push(cleanLine)
      }
    }
  })

  if (rows.length === 0) rows.push({ roleCode: '', customRole: '', personName: '', details: '', roleQuery: '' })

  // Si el contenido venía del formato anterior (texto libre), conservar TODO en observaciones
  // para que el usuario pueda distribuir manualmente cada persona por cargo.
  const extractedNotesHtml = extractObservacionesHtml(value || '')
  const notesHtml = fromStructuredEditor
    ? (extractedNotesHtml || textToSimpleHtml(noteLines.join('\n')))
    : textToSimpleHtml(plain.trim())

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
      const detailSuffix = r.details ? ` - ${r.details}` : ''
      return `<li><strong>${roleLabel}:</strong> ${r.personName}${detailSuffix}</li>`
    })
    .join('')

  const notesBlock = hasNotes
    ? `<p><strong>Observaciones:</strong></p>${normalizedNotesHtml}`
    : ''

  return `<p><strong>Estructura societaria</strong></p><ul>${listItems}</ul>${notesBlock}`
}

export default function SocietariaStructureEditor({ value, onChange, disabled }) {
  const [rows, setRows] = useState([{ roleCode: '', customRole: '', personName: '', details: '', roleQuery: '' }])
  const [notesHtml, setNotesHtml] = useState('')
  const [openRolePickerIndex, setOpenRolePickerIndex] = useState(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const internalSyncRef = useRef(false)
  const rolePickerContainerRef = useRef(null)

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

  const updateRow = (index, patch) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setRows(prev => [...prev, { roleCode: '', customRole: '', personName: '', details: '', roleQuery: '' }])
  }

  const removeRow = (index) => {
    setRows(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : [{ roleCode: '', customRole: '', personName: '', details: '', roleQuery: '' }]
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
    <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Selecciona el cargo y escribe solo los datos de la persona. La sigla muestra definición al pasar el mouse.
        </p>
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
            <div className="md:col-span-5">
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

            <div className="md:col-span-4">
              <label className="field-label">Persona</label>
              <input
                type="text"
                value={row.personName}
                onChange={(e) => updateRow(index, { personName: e.target.value })}
                disabled={disabled}
                className="field-input"
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label">Detalle</label>
              <input
                type="text"
                value={row.details}
                onChange={(e) => updateRow(index, { details: e.target.value })}
                disabled={disabled}
                className="field-input"
                placeholder="Titular, suplente..."
              />
            </div>

            <div className="md:col-span-1 flex md:flex-col items-center gap-2 pt-0 md:pt-6">
              <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200" title={siglaTitle}>
                <Info className="h-3 w-3" />
                {role?.sigla || 'Info'}
              </span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
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
    </div>
  )
}

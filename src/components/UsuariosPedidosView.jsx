import { useState, useEffect } from 'react'
import {
  Loader2, Search, Users, ChevronLeft, ChevronRight, RefreshCw,
  Plus, X, Eye, EyeOff, User, Building2, Globe, Phone, Shield, Hash
} from 'lucide-react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

const ROLES_CLIENTE = [
  { value: 'cliente_admin', label: 'Admin Cliente' },
  { value: 'cliente_usuario', label: 'Usuario Cliente' },
  { value: 'cliente_presentacion', label: 'Presentación' },
  { value: 'usuario', label: 'Usuario' }
]

// Lista completa de países con códigos de teléfono
const PAISES = [
  { code: 'AF', name: 'Afganistán', phoneCode: '93' },
  { code: 'AL', name: 'Albania', phoneCode: '355' },
  { code: 'DE', name: 'Alemania', phoneCode: '49' },
  { code: 'AD', name: 'Andorra', phoneCode: '376' },
  { code: 'AO', name: 'Angola', phoneCode: '244' },
  { code: 'AG', name: 'Antigua y Barbuda', phoneCode: '1268' },
  { code: 'SA', name: 'Arabia Saudita', phoneCode: '966' },
  { code: 'DZ', name: 'Argelia', phoneCode: '213' },
  { code: 'AR', name: 'Argentina', phoneCode: '54' },
  { code: 'AM', name: 'Armenia', phoneCode: '374' },
  { code: 'AU', name: 'Australia', phoneCode: '61' },
  { code: 'AT', name: 'Austria', phoneCode: '43' },
  { code: 'AZ', name: 'Azerbaiyán', phoneCode: '994' },
  { code: 'BS', name: 'Bahamas', phoneCode: '1242' },
  { code: 'BD', name: 'Bangladés', phoneCode: '880' },
  { code: 'BB', name: 'Barbados', phoneCode: '1246' },
  { code: 'BH', name: 'Baréin', phoneCode: '973' },
  { code: 'BE', name: 'Bélgica', phoneCode: '32' },
  { code: 'BZ', name: 'Belice', phoneCode: '501' },
  { code: 'BJ', name: 'Benín', phoneCode: '229' },
  { code: 'BY', name: 'Bielorrusia', phoneCode: '375' },
  { code: 'BO', name: 'Bolivia', phoneCode: '591' },
  { code: 'BA', name: 'Bosnia y Herzegovina', phoneCode: '387' },
  { code: 'BW', name: 'Botsuana', phoneCode: '267' },
  { code: 'BR', name: 'Brasil', phoneCode: '55' },
  { code: 'BN', name: 'Brunéi', phoneCode: '673' },
  { code: 'BG', name: 'Bulgaria', phoneCode: '359' },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '226' },
  { code: 'BI', name: 'Burundi', phoneCode: '257' },
  { code: 'BT', name: 'Bután', phoneCode: '975' },
  { code: 'CV', name: 'Cabo Verde', phoneCode: '238' },
  { code: 'KH', name: 'Camboya', phoneCode: '855' },
  { code: 'CM', name: 'Camerún', phoneCode: '237' },
  { code: 'CA', name: 'Canadá', phoneCode: '1' },
  { code: 'QA', name: 'Catar', phoneCode: '974' },
  { code: 'TD', name: 'Chad', phoneCode: '235' },
  { code: 'CL', name: 'Chile', phoneCode: '56' },
  { code: 'CN', name: 'China', phoneCode: '86' },
  { code: 'CY', name: 'Chipre', phoneCode: '357' },
  { code: 'CO', name: 'Colombia', phoneCode: '57' },
  { code: 'KM', name: 'Comoras', phoneCode: '269' },
  { code: 'KP', name: 'Corea del Norte', phoneCode: '850' },
  { code: 'KR', name: 'Corea del Sur', phoneCode: '82' },
  { code: 'CI', name: 'Costa de Marfil', phoneCode: '225' },
  { code: 'CR', name: 'Costa Rica', phoneCode: '506' },
  { code: 'HR', name: 'Croacia', phoneCode: '385' },
  { code: 'CU', name: 'Cuba', phoneCode: '53' },
  { code: 'DK', name: 'Dinamarca', phoneCode: '45' },
  { code: 'DM', name: 'Dominica', phoneCode: '1767' },
  { code: 'EC', name: 'Ecuador', phoneCode: '593' },
  { code: 'EG', name: 'Egipto', phoneCode: '20' },
  { code: 'SV', name: 'El Salvador', phoneCode: '503' },
  { code: 'AE', name: 'Emiratos Árabes Unidos', phoneCode: '971' },
  { code: 'ER', name: 'Eritrea', phoneCode: '291' },
  { code: 'SK', name: 'Eslovaquia', phoneCode: '421' },
  { code: 'SI', name: 'Eslovenia', phoneCode: '386' },
  { code: 'ES', name: 'España', phoneCode: '34' },
  { code: 'US', name: 'Estados Unidos', phoneCode: '1' },
  { code: 'EE', name: 'Estonia', phoneCode: '372' },
  { code: 'SZ', name: 'Esuatini', phoneCode: '268' },
  { code: 'ET', name: 'Etiopía', phoneCode: '251' },
  { code: 'PH', name: 'Filipinas', phoneCode: '63' },
  { code: 'FI', name: 'Finlandia', phoneCode: '358' },
  { code: 'FJ', name: 'Fiyi', phoneCode: '679' },
  { code: 'FR', name: 'Francia', phoneCode: '33' },
  { code: 'GA', name: 'Gabón', phoneCode: '241' },
  { code: 'GM', name: 'Gambia', phoneCode: '220' },
  { code: 'GE', name: 'Georgia', phoneCode: '995' },
  { code: 'GH', name: 'Ghana', phoneCode: '233' },
  { code: 'GD', name: 'Granada', phoneCode: '1473' },
  { code: 'GR', name: 'Grecia', phoneCode: '30' },
  { code: 'GT', name: 'Guatemala', phoneCode: '502' },
  { code: 'GN', name: 'Guinea', phoneCode: '224' },
  { code: 'GQ', name: 'Guinea Ecuatorial', phoneCode: '240' },
  { code: 'GW', name: 'Guinea-Bisáu', phoneCode: '245' },
  { code: 'GY', name: 'Guyana', phoneCode: '592' },
  { code: 'HT', name: 'Haití', phoneCode: '509' },
  { code: 'HN', name: 'Honduras', phoneCode: '504' },
  { code: 'HU', name: 'Hungría', phoneCode: '36' },
  { code: 'IN', name: 'India', phoneCode: '91' },
  { code: 'ID', name: 'Indonesia', phoneCode: '62' },
  { code: 'IQ', name: 'Irak', phoneCode: '964' },
  { code: 'IR', name: 'Irán', phoneCode: '98' },
  { code: 'IE', name: 'Irlanda', phoneCode: '353' },
  { code: 'IS', name: 'Islandia', phoneCode: '354' },
  { code: 'IL', name: 'Israel', phoneCode: '972' },
  { code: 'IT', name: 'Italia', phoneCode: '39' },
  { code: 'JM', name: 'Jamaica', phoneCode: '1876' },
  { code: 'JP', name: 'Japón', phoneCode: '81' },
  { code: 'JO', name: 'Jordania', phoneCode: '962' },
  { code: 'KZ', name: 'Kazajistán', phoneCode: '7' },
  { code: 'KE', name: 'Kenia', phoneCode: '254' },
  { code: 'KG', name: 'Kirguistán', phoneCode: '996' },
  { code: 'KI', name: 'Kiribati', phoneCode: '686' },
  { code: 'KW', name: 'Kuwait', phoneCode: '965' },
  { code: 'LA', name: 'Laos', phoneCode: '856' },
  { code: 'LS', name: 'Lesoto', phoneCode: '266' },
  { code: 'LV', name: 'Letonia', phoneCode: '371' },
  { code: 'LB', name: 'Líbano', phoneCode: '961' },
  { code: 'LR', name: 'Liberia', phoneCode: '231' },
  { code: 'LY', name: 'Libia', phoneCode: '218' },
  { code: 'LI', name: 'Liechtenstein', phoneCode: '423' },
  { code: 'LT', name: 'Lituania', phoneCode: '370' },
  { code: 'LU', name: 'Luxemburgo', phoneCode: '352' },
  { code: 'MK', name: 'Macedonia del Norte', phoneCode: '389' },
  { code: 'MG', name: 'Madagascar', phoneCode: '261' },
  { code: 'MY', name: 'Malasia', phoneCode: '60' },
  { code: 'MW', name: 'Malaui', phoneCode: '265' },
  { code: 'MV', name: 'Maldivas', phoneCode: '960' },
  { code: 'ML', name: 'Malí', phoneCode: '223' },
  { code: 'MT', name: 'Malta', phoneCode: '356' },
  { code: 'MA', name: 'Marruecos', phoneCode: '212' },
  { code: 'MU', name: 'Mauricio', phoneCode: '230' },
  { code: 'MR', name: 'Mauritania', phoneCode: '222' },
  { code: 'MX', name: 'México', phoneCode: '52' },
  { code: 'FM', name: 'Micronesia', phoneCode: '691' },
  { code: 'MD', name: 'Moldavia', phoneCode: '373' },
  { code: 'MC', name: 'Mónaco', phoneCode: '377' },
  { code: 'MN', name: 'Mongolia', phoneCode: '976' },
  { code: 'ME', name: 'Montenegro', phoneCode: '382' },
  { code: 'MZ', name: 'Mozambique', phoneCode: '258' },
  { code: 'MM', name: 'Myanmar', phoneCode: '95' },
  { code: 'NA', name: 'Namibia', phoneCode: '264' },
  { code: 'NR', name: 'Nauru', phoneCode: '674' },
  { code: 'NP', name: 'Nepal', phoneCode: '977' },
  { code: 'NI', name: 'Nicaragua', phoneCode: '505' },
  { code: 'NE', name: 'Níger', phoneCode: '227' },
  { code: 'NG', name: 'Nigeria', phoneCode: '234' },
  { code: 'NO', name: 'Noruega', phoneCode: '47' },
  { code: 'NZ', name: 'Nueva Zelanda', phoneCode: '64' },
  { code: 'OM', name: 'Omán', phoneCode: '968' },
  { code: 'NL', name: 'Países Bajos', phoneCode: '31' },
  { code: 'PK', name: 'Pakistán', phoneCode: '92' },
  { code: 'PW', name: 'Palaos', phoneCode: '680' },
  { code: 'PA', name: 'Panamá', phoneCode: '507' },
  { code: 'PG', name: 'Papúa Nueva Guinea', phoneCode: '675' },
  { code: 'PY', name: 'Paraguay', phoneCode: '595' },
  { code: 'PE', name: 'Perú', phoneCode: '51' },
  { code: 'PL', name: 'Polonia', phoneCode: '48' },
  { code: 'PT', name: 'Portugal', phoneCode: '351' },
  { code: 'GB', name: 'Reino Unido', phoneCode: '44' },
  { code: 'CF', name: 'República Centroafricana', phoneCode: '236' },
  { code: 'CZ', name: 'República Checa', phoneCode: '420' },
  { code: 'CG', name: 'República del Congo', phoneCode: '242' },
  { code: 'CD', name: 'República Democrática del Congo', phoneCode: '243' },
  { code: 'DO', name: 'República Dominicana', phoneCode: '1809' },
  { code: 'RW', name: 'Ruanda', phoneCode: '250' },
  { code: 'RO', name: 'Rumania', phoneCode: '40' },
  { code: 'RU', name: 'Rusia', phoneCode: '7' },
  { code: 'WS', name: 'Samoa', phoneCode: '685' },
  { code: 'KN', name: 'San Cristóbal y Nieves', phoneCode: '1869' },
  { code: 'SM', name: 'San Marino', phoneCode: '378' },
  { code: 'VC', name: 'San Vicente y las Granadinas', phoneCode: '1784' },
  { code: 'LC', name: 'Santa Lucía', phoneCode: '1758' },
  { code: 'ST', name: 'Santo Tomé y Príncipe', phoneCode: '239' },
  { code: 'SN', name: 'Senegal', phoneCode: '221' },
  { code: 'RS', name: 'Serbia', phoneCode: '381' },
  { code: 'SC', name: 'Seychelles', phoneCode: '248' },
  { code: 'SL', name: 'Sierra Leona', phoneCode: '232' },
  { code: 'SG', name: 'Singapur', phoneCode: '65' },
  { code: 'SY', name: 'Siria', phoneCode: '963' },
  { code: 'SO', name: 'Somalia', phoneCode: '252' },
  { code: 'LK', name: 'Sri Lanka', phoneCode: '94' },
  { code: 'ZA', name: 'Sudáfrica', phoneCode: '27' },
  { code: 'SD', name: 'Sudán', phoneCode: '249' },
  { code: 'SS', name: 'Sudán del Sur', phoneCode: '211' },
  { code: 'SE', name: 'Suecia', phoneCode: '46' },
  { code: 'CH', name: 'Suiza', phoneCode: '41' },
  { code: 'SR', name: 'Surinam', phoneCode: '597' },
  { code: 'TH', name: 'Tailandia', phoneCode: '66' },
  { code: 'TW', name: 'Taiwán', phoneCode: '886' },
  { code: 'TZ', name: 'Tanzania', phoneCode: '255' },
  { code: 'TJ', name: 'Tayikistán', phoneCode: '992' },
  { code: 'TL', name: 'Timor Oriental', phoneCode: '670' },
  { code: 'TG', name: 'Togo', phoneCode: '228' },
  { code: 'TO', name: 'Tonga', phoneCode: '676' },
  { code: 'TT', name: 'Trinidad y Tobago', phoneCode: '1868' },
  { code: 'TN', name: 'Túnez', phoneCode: '216' },
  { code: 'TM', name: 'Turkmenistán', phoneCode: '993' },
  { code: 'TR', name: 'Turquía', phoneCode: '90' },
  { code: 'TV', name: 'Tuvalu', phoneCode: '688' },
  { code: 'UA', name: 'Ucrania', phoneCode: '380' },
  { code: 'UG', name: 'Uganda', phoneCode: '256' },
  { code: 'UY', name: 'Uruguay', phoneCode: '598' },
  { code: 'UZ', name: 'Uzbekistán', phoneCode: '998' },
  { code: 'VU', name: 'Vanuatu', phoneCode: '678' },
  { code: 'VA', name: 'Vaticano', phoneCode: '379' },
  { code: 'VE', name: 'Venezuela', phoneCode: '58' },
  { code: 'VN', name: 'Vietnam', phoneCode: '84' },
  { code: 'YE', name: 'Yemen', phoneCode: '967' },
  { code: 'DJ', name: 'Yibuti', phoneCode: '253' },
  { code: 'ZM', name: 'Zambia', phoneCode: '260' },
  { code: 'ZW', name: 'Zimbabue', phoneCode: '263' }
]

export default function UsuariosPedidosView() {
  const { t } = useTranslation()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 10

  // Modal nuevo cliente
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState([])
  const [formErrors, setFormErrors] = useState({})
  const [form, setForm] = useState({
    nombre_completo: '',
    username: '',
    email: '',
    password: '',
    rol: 'cliente_usuario',
    razon_social_cliente: '',
    cuit_cliente: '',
    pais_cliente: 'AR',
    codigo_telefono: '54',
    telefono: '',
    id_interno: ''
  })

  // Tabs
  const [activeTab, setActiveTab] = useState('proveedores')

  // Modal nuevo cliente proveedor
  const [showProveedorModal, setShowProveedorModal] = useState(false)
  const [savingProveedor, setSavingProveedor] = useState(false)
  const [showPasswordProv, setShowPasswordProv] = useState(false)
  const [passwordErrorsProv, setPasswordErrorsProv] = useState([])
  const [formErrorsProv, setFormErrorsProv] = useState({})
  const [proveedores, setProveedores] = useState([])
  const [formProv, setFormProv] = useState({
    nombre_completo: '',
    username: '',
    email: '',
    password: '',
    razon_social_cliente: '',
    cuit_cliente: '',
    pais_cliente: 'AR',
    codigo_telefono: '54',
    telefono: '',
    id_interno: ''
  })

  const loadData = async (pageNum = 1, searchTerm = '') => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/usuarios-pedidos', {
        params: { page: 1, per_page: 500, search: searchTerm }
      })
      if (res.data.success) {
        setUsuarios(res.data.usuarios)
        setTotal(res.data.total)
      }
    } catch (err) {
      console.error('Error loading usuarios-pedidos:', err)
    }
    setLoading(false)
  }

  const loadProveedores = async () => {
    try {
      const res = await axios.get('/api/admin/usuarios-pedidos', {
        params: { page: 1, per_page: 500, search: '' }
      })
      if (res.data.success) {
        const provs = res.data.usuarios.filter(u => u.rol === 'cliente_presentacion' && u.numero_abono)
        setProveedores(provs)
      }
    } catch (err) {
      console.error('Error loading proveedores:', err)
    }
  }

  useEffect(() => {
    loadData(1, '')
    loadProveedores()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    loadData(1, search)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatPhone = (codigo, telefono) => {
    if (!telefono) return '-'
    return codigo ? `+${codigo} ${telefono}` : telefono
  }

  const resetForm = () => {
    setForm({
      nombre_completo: '',
      username: '',
      email: '',
      password: '',
      rol: 'cliente_usuario',
      razon_social_cliente: '',
      cuit_cliente: '',
      pais_cliente: 'AR',
      codigo_telefono: '54',
      telefono: '',
      id_interno: ''
    })
    setShowPassword(false)
    setPasswordErrors([])
    setFormErrors({})
  }

  const handlePaisChange = (code) => {
    const pais = PAISES.find(p => p.code === code)
    setForm({ ...form, pais_cliente: code, codigo_telefono: pais?.phoneCode || '' })
  }

  // Validar contraseña localmente
  const validatePasswordLocal = (pwd) => {
    const errors = []
    if (pwd.length < 8) errors.push('Mínimo 8 caracteres')
    if (!/[A-Z]/.test(pwd)) errors.push('Una mayúscula')
    if (!/[a-z]/.test(pwd)) errors.push('Una minúscula')
    if (!/[0-9]/.test(pwd)) errors.push('Un número')
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) errors.push('Un símbolo (!@#$...)')
    return errors
  }

  const handlePasswordChange = (pwd) => {
    setForm({ ...form, password: pwd })
    setPasswordErrors(validatePasswordLocal(pwd))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setPasswordErrors([])
    const errors = {}

    if (!form.nombre_completo.trim()) errors.nombre_completo = 'Nombre es obligatorio'
    if (!form.username.trim()) errors.username = 'Username es obligatorio'
    if (!form.email.trim()) errors.email = 'Email es obligatorio'
    if (!form.password) errors.password = 'Contraseña es obligatoria'
    if (['cliente_admin', 'cliente_usuario'].includes(form.rol) && !form.cuit_cliente?.trim()) {
      errors.cuit_cliente = 'CUIT / ID Fiscal es obligatorio para este rol'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      const missing = Object.values(errors)
      toast.error(missing[0])
      return
    }
    
    // Validar contraseña antes de enviar
    const pwdErrors = validatePasswordLocal(form.password)
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors)
      toast.error('La contraseña no cumple los requisitos')
      return
    }

    setSaving(true)
    try {
      const res = await axios.post('/api/admin/usuarios', {
        username: form.username,
        email: form.email,
        password: form.password,
        nombre_completo: form.nombre_completo,
        rol: form.rol,
        razon_social_cliente: form.razon_social_cliente || null,
        cuit_cliente: form.cuit_cliente || null,
        pais_cliente: form.pais_cliente || null,
        codigo_telefono: form.codigo_telefono || null,
        telefono: form.telefono || null,
        id_interno: form.id_interno || null
      })
      
      if (res.data.success) {
        toast.success('Cliente creado exitosamente')
        setShowModal(false)
        resetForm()
        loadData(1, search)
      } else {
        // Mostrar errores de contraseña si vienen del backend
        if (res.data.password_errors) {
          setPasswordErrors(res.data.password_errors)
        }
        toast.error(res.data.error || 'Error al crear cliente')
      }
    } catch (err) {
      const errData = err.response?.data
      if (errData?.password_errors) {
        setPasswordErrors(errData.password_errors)
      }
      toast.error(errData?.error || 'Error al crear cliente')
    }
    setSaving(false)
  }

  // --- Proveedor helpers ---
  const resetFormProv = () => {
    setFormProv({
      nombre_completo: '',
      username: '',
      email: '',
      password: '',
      razon_social_cliente: '',
      cuit_cliente: '',
      pais_cliente: 'AR',
      codigo_telefono: '54',
      telefono: '',
      id_interno: ''
    })
    setShowPasswordProv(false)
    setPasswordErrorsProv([])
    setFormErrorsProv({})
  }

  const handlePaisChangeProv = (code) => {
    const pais = PAISES.find(p => p.code === code)
    setFormProv({ ...formProv, pais_cliente: code, codigo_telefono: pais?.phoneCode || '' })
  }

  const handlePasswordChangeProv = (pwd) => {
    setFormProv({ ...formProv, password: pwd })
    setPasswordErrorsProv(validatePasswordLocal(pwd))
  }

  const handleSubmitProveedor = async (e) => {
    e.preventDefault()
    setPasswordErrorsProv([])
    const errors = {}

    if (!formProv.nombre_completo.trim()) errors.nombre_completo = 'Nombre es obligatorio'
    if (!formProv.username.trim()) errors.username = 'Username es obligatorio'
    if (!formProv.email.trim()) errors.email = 'Email es obligatorio'
    if (!formProv.password) errors.password = 'Contraseña es obligatoria'
    if (!formProv.id_interno.trim()) errors.id_interno = 'Nº Abono es obligatorio'
    if (!formProv.razon_social_cliente?.trim()) errors.razon_social_cliente = 'Razón Social es obligatoria'

    setFormErrorsProv(errors)
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0])
      return
    }

    const pwdErrors = validatePasswordLocal(formProv.password)
    if (pwdErrors.length > 0) {
      setPasswordErrorsProv(pwdErrors)
      toast.error('La contraseña no cumple los requisitos')
      return
    }

    setSavingProveedor(true)
    try {
      const res = await axios.post('/api/admin/usuarios', {
        username: formProv.username,
        email: formProv.email,
        password: formProv.password,
        nombre_completo: formProv.nombre_completo,
        rol: 'cliente_presentacion',
        razon_social_cliente: formProv.razon_social_cliente || null,
        cuit_cliente: formProv.cuit_cliente || null,
        pais_cliente: formProv.pais_cliente || null,
        codigo_telefono: formProv.codigo_telefono || null,
        telefono: formProv.telefono || null,
        id_interno: formProv.id_interno
      })

      if (res.data.success) {
        toast.success('Cliente Proveedor creado exitosamente')
        setShowProveedorModal(false)
        resetFormProv()
        loadData(1, search)
        loadProveedores()
      } else {
        if (res.data.password_errors) {
          setPasswordErrorsProv(res.data.password_errors)
        }
        toast.error(res.data.error || 'Error al crear cliente proveedor')
      }
    } catch (err) {
      const errData = err.response?.data
      if (errData?.password_errors) {
        setPasswordErrorsProv(errData.password_errors)
      }
      toast.error(errData?.error || 'Error al crear cliente proveedor')
    }
    setSavingProveedor(false)
  }

  const filteredAll = usuarios.filter(u =>
    activeTab === 'proveedores'
      ? u.rol === 'cliente_presentacion'
      : u.rol !== 'cliente_presentacion'
  )
  const tabTotalPages = Math.ceil(filteredAll.length / perPage) || 1
  const filteredUsuarios = filteredAll.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="w-full space-y-4 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Usuarios Clientes
          </h2>
          <p className="text-sm text-gray-500">
            {total} usuarios registrados
          </p>
        </div>

        {/* Search + Refresh + Action button — single row */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex flex-1 sm:flex-none gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, abono..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Buscar
            </button>
          </form>
          <button
            type="button"
            onClick={() => { setSearch(''); loadData(1, '') }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refrescar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {activeTab === 'proveedores' ? (
            <button
              onClick={() => setShowProveedorModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Nuevo Cliente Proveedor
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          <button
            onClick={() => { setActiveTab('proveedores'); setPage(1) }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'proveedores'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Proveedores
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'proveedores' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {usuarios.filter(u => u.rol === 'cliente_presentacion').length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('usuarios'); setPage(1) }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'usuarios'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Usuarios
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'usuarios' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {usuarios.filter(u => u.rol !== 'cliente_presentacion').length}
            </span>
          </button>
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {activeTab === 'proveedores' ? 'No se encontraron proveedores' : 'No se encontraron usuarios'}
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {filteredUsuarios.map((u) => (
                <div key={u.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.nombre_completo || '-'}</p>
                      <p className="text-[11px] text-gray-400">@{u.username}</p>
                    </div>
                    <span className={`inline-flex w-2.5 h-2.5 rounded-full ${
                      u.activo ? 'bg-green-500' : 'bg-red-400'
                    }`} title={u.activo ? 'Activo' : 'Inactivo'} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">ID</p>
                      <p className="font-mono text-gray-600">{u.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Abono</p>
                      {u.numero_abono ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          {u.numero_abono}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Empresa</p>
                      <p className="text-gray-700 truncate" title={u.razon_social_cliente}>{u.razon_social_cliente || '-'}</p>
                      {u.cuit_cliente && <p className="text-[10px] text-gray-400">{u.cuit_cliente}</p>}
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Email</p>
                      <p className="text-gray-700 truncate" title={u.email}>{u.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">País</p>
                      <p className="text-gray-700">{u.pais_cliente || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Pedidos</p>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        u.total_pedidos > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {u.total_pedidos}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-400">Teléfono</p>
                      <p className="text-gray-700">{formatPhone(u.codigo_telefono, u.telefono)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Rol</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        u.rol === 'cliente_admin' ? 'bg-purple-100 text-purple-700' :
                        u.rol === 'cliente_usuario' ? 'bg-blue-100 text-blue-700' :
                        u.rol === 'cliente_presentacion' ? 'bg-teal-100 text-teal-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.rol?.replace('cliente_', '') || u.rol}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-gray-100 text-[11px] text-gray-500">
                    Ult. pedido: {formatDate(u.ultimo_pedido)}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                    Abono
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                    Empresa
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Teléfono
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-14">
                    País
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Rol
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                    Pedidos
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    Últ. Pedido
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-500">{u.id}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {u.numero_abono ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          {u.numero_abono}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]" title={u.nombre_completo}>{u.nombre_completo || '-'}</p>
                      <p className="text-[10px] text-gray-400">@{u.username}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm text-gray-900 truncate max-w-[140px]" title={u.razon_social_cliente}>{u.razon_social_cliente || '-'}</p>
                      {u.cuit_cliente && <p className="text-[10px] text-gray-400">{u.cuit_cliente}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-600 truncate block max-w-[180px]" title={u.email}>{u.email || '-'}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{formatPhone(u.codigo_telefono, u.telefono)}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{u.pais_cliente || '-'}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        u.rol === 'cliente_admin' ? 'bg-purple-100 text-purple-700' :
                        u.rol === 'cliente_usuario' ? 'bg-blue-100 text-blue-700' :
                        u.rol === 'cliente_presentacion' ? 'bg-teal-100 text-teal-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.rol?.replace('cliente_', '') || u.rol}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        u.total_pedidos > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {u.total_pedidos}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{formatDate(u.ultimo_pedido)}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className={`inline-flex w-2 h-2 rounded-full ${
                        u.activo ? 'bg-green-500' : 'bg-red-400'
                      }`} title={u.activo ? 'Activo' : 'Inactivo'} />
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {tabTotalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs sm:text-sm text-gray-500">
              Página {page} de {tabTotalPages} ({filteredAll.length} registros)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= tabTotalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header con gradiente verde */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Nuevo Cliente</h3>
                      <p className="text-green-100 text-xs">Crear usuario afiliado a un proveedor</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowModal(false); resetForm() }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Sección: Datos de acceso */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Datos de acceso</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.nombre_completo}
                        onChange={(e) => { setForm({ ...form, nombre_completo: e.target.value }); setFormErrors(prev => ({...prev, nombre_completo: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${formErrors.nombre_completo ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="Juan Pérez"
                      />
                      {formErrors.nombre_completo && <p className="mt-1 text-[10px] text-red-500">{formErrors.nombre_completo}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Username <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => { setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') }); setFormErrors(prev => ({...prev, username: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${formErrors.username ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="jperez"
                      />
                      {formErrors.username && <p className="mt-1 text-[10px] text-red-500">{formErrors.username}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors(prev => ({...prev, email: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="email@empresa.com"
                      />
                      {formErrors.email && <p className="mt-1 text-[10px] text-red-500">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => { handlePasswordChange(e.target.value); setFormErrors(prev => ({...prev, password: ''})) }}
                          className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${
                            (passwordErrors.length > 0 && form.password) || formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="Ej: Clave@123"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {form.password && passwordErrors.length > 0 && (
                        <div className="mt-1 text-[10px] text-red-500">Falta: {passwordErrors.join(', ')}</div>
                      )}
                      {!form.password && (
                        <div className="mt-1 text-[10px] text-gray-400">8+ chars, mayúscula, minúscula, número, símbolo</div>
                      )}
                      {form.password && passwordErrors.length === 0 && (
                        <div className="mt-1 text-[10px] text-green-600 font-medium">✓ Contraseña válida</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección: Empresa */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Empresa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Razón Social</label>
                      <input
                        type="text"
                        value={form.razon_social_cliente}
                        onChange={(e) => setForm({ ...form, razon_social_cliente: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        placeholder="Empresa S.A."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        CUIT / ID Fiscal {['cliente_admin', 'cliente_usuario'].includes(form.rol) && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={form.cuit_cliente}
                        onChange={(e) => { setForm({ ...form, cuit_cliente: e.target.value }); setFormErrors(prev => ({...prev, cuit_cliente: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${formErrors.cuit_cliente ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="30-12345678-9"
                      />
                      {formErrors.cuit_cliente && <p className="mt-1 text-[10px] text-red-500">{formErrors.cuit_cliente}</p>}
                    </div>
                  </div>
                </div>

                {/* Sección: Contacto */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Contacto</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
                      <select
                        value={form.pais_cliente}
                        onChange={(e) => handlePaisChange(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      >
                        {PAISES.map(p => (
                          <option key={p.code} value={p.code}>{p.name} (+{p.phoneCode})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2.5 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-600 font-medium">
                          +{form.codigo_telefono}
                        </span>
                        <input
                          type="text"
                          value={form.telefono}
                          onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '') })}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                          placeholder="1155551234"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Configuración */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Configuración</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                      <select
                        value={form.rol}
                        onChange={(e) => setForm({ ...form, rol: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      >
                        {ROLES_CLIENTE.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nº Abono (Proveedor)</label>
                      <select
                        value={form.id_interno}
                        onChange={(e) => setForm({ ...form, id_interno: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      >
                        <option value="">— Seleccionar proveedor —</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.numero_abono}>
                            {p.numero_abono} - {p.nombre_completo || p.razon_social_cliente || p.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg shadow-green-200 transition-all"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Crear Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente Proveedor */}
      {showProveedorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProveedorModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header con gradiente azul */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Nuevo Cliente Proveedor</h3>
                      <p className="text-blue-100 text-xs">Crear proveedor con número de abono propio</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowProveedorModal(false); resetFormProv() }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitProveedor} className="p-6 space-y-5">
                {/* Sección: Datos de acceso */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Datos de acceso</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formProv.nombre_completo}
                        onChange={(e) => { setFormProv({ ...formProv, nombre_completo: e.target.value }); setFormErrorsProv(prev => ({...prev, nombre_completo: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${formErrorsProv.nombre_completo ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="Nombre Proveedor"
                      />
                      {formErrorsProv.nombre_completo && <p className="mt-1 text-[10px] text-red-500">{formErrorsProv.nombre_completo}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Username <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formProv.username}
                        onChange={(e) => { setFormProv({ ...formProv, username: e.target.value.toLowerCase().replace(/\s/g, '') }); setFormErrorsProv(prev => ({...prev, username: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${formErrorsProv.username ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="proveedor1"
                      />
                      {formErrorsProv.username && <p className="mt-1 text-[10px] text-red-500">{formErrorsProv.username}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={formProv.email}
                        onChange={(e) => { setFormProv({ ...formProv, email: e.target.value }); setFormErrorsProv(prev => ({...prev, email: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${formErrorsProv.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="email@proveedor.com"
                      />
                      {formErrorsProv.email && <p className="mt-1 text-[10px] text-red-500">{formErrorsProv.email}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input
                          type={showPasswordProv ? 'text' : 'password'}
                          value={formProv.password}
                          onChange={(e) => { handlePasswordChangeProv(e.target.value); setFormErrorsProv(prev => ({...prev, password: ''})) }}
                          className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            (passwordErrorsProv.length > 0 && formProv.password) || formErrorsProv.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="Ej: Clave@123"
                        />
                        <button type="button" onClick={() => setShowPasswordProv(!showPasswordProv)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPasswordProv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {formProv.password && passwordErrorsProv.length > 0 && (
                        <div className="mt-1 text-[10px] text-red-500">Falta: {passwordErrorsProv.join(', ')}</div>
                      )}
                      {!formProv.password && (
                        <div className="mt-1 text-[10px] text-gray-400">8+ chars, mayúscula, minúscula, número, símbolo</div>
                      )}
                      {formProv.password && passwordErrorsProv.length === 0 && (
                        <div className="mt-1 text-[10px] text-green-600 font-medium">✓ Contraseña válida</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección: Empresa */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Empresa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Razón Social <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formProv.razon_social_cliente}
                        onChange={(e) => { setFormProv({ ...formProv, razon_social_cliente: e.target.value }); setFormErrorsProv(prev => ({...prev, razon_social_cliente: ''})) }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${formErrorsProv.razon_social_cliente ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        placeholder="Proveedor S.A."
                      />
                      {formErrorsProv.razon_social_cliente && <p className="mt-1 text-[10px] text-red-500">{formErrorsProv.razon_social_cliente}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CUIT / ID Fiscal</label>
                      <input
                        type="text"
                        value={formProv.cuit_cliente}
                        onChange={(e) => setFormProv({ ...formProv, cuit_cliente: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="30-12345678-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Nº Abono destacado */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Número de abono</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formProv.id_interno}
                      onChange={(e) => { setFormProv({ ...formProv, id_interno: e.target.value }); setFormErrorsProv(prev => ({...prev, id_interno: ''})) }}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-base font-semibold bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-sm ${formErrorsProv.id_interno ? 'border-red-400 bg-red-50' : 'border-blue-200'}`}
                      placeholder="Ej: 9001"
                    />
                  </div>
                  {formErrorsProv.id_interno ? (
                    <p className="mt-1.5 text-[11px] text-red-500">{formErrorsProv.id_interno}</p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-blue-500 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-blue-400" />
                      Este número identifica al proveedor y sus clientes afiliados
                    </p>
                  )}
                </div>

                {/* Sección: Contacto */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Contacto</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
                      <select
                        value={formProv.pais_cliente}
                        onChange={(e) => handlePaisChangeProv(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        {PAISES.map(p => (
                          <option key={p.code} value={p.code}>{p.name} (+{p.phoneCode})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2.5 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-600 font-medium">
                          +{formProv.codigo_telefono}
                        </span>
                        <input
                          type="text"
                          value={formProv.telefono}
                          onChange={(e) => setFormProv({ ...formProv, telefono: e.target.value.replace(/\D/g, '') })}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="1155551234"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setShowProveedorModal(false); resetFormProv() }}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingProveedor}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all"
                  >
                    {savingProveedor && <Loader2 className="h-4 w-4 animate-spin" />}
                    Crear Cliente Proveedor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

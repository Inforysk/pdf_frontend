import { useState, useEffect } from 'react'
import {
  Loader2, Search, Users, ChevronLeft, ChevronRight, RefreshCw,
  Plus, X, Eye, EyeOff
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
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25

  // Modal nuevo cliente
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState([])
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

  const loadData = async (pageNum = 1, searchTerm = '') => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/usuarios-pedidos', {
        params: { page: pageNum, per_page: perPage, search: searchTerm }
      })
      if (res.data.success) {
        setUsuarios(res.data.usuarios)
        setTotal(res.data.total)
        setTotalPages(res.data.total_pages)
        setPage(res.data.page)
      }
    } catch (err) {
      console.error('Error loading usuarios-pedidos:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData(1, '')
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
    
    if (!form.nombre_completo || !form.username || !form.email || !form.password) {
      toast.error('Completá los campos obligatorios')
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Usuarios Clientes
          </h2>
          <p className="text-sm text-gray-500">
            {total} usuarios registrados
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, abono..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron usuarios
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                {usuarios.map((u) => (
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Página {page} de {totalPages} ({total} registros)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(page - 1, search)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => loadData(page + 1, search)}
                disabled={page >= totalPages}
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
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Cliente</h3>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Datos personales */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input
                      type="text"
                      value={form.nombre_completo}
                      onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="jperez"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${
                          passwordErrors.length > 0 && form.password ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Clave@123"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Requisitos de contraseña */}
                    {form.password && passwordErrors.length > 0 && (
                      <div className="mt-1 text-[10px] text-red-500">
                        Falta: {passwordErrors.join(', ')}
                      </div>
                    )}
                    {!form.password && (
                      <div className="mt-1 text-[10px] text-gray-400">
                        8+ chars, mayúscula, minúscula, número, símbolo
                      </div>
                    )}
                    {form.password && passwordErrors.length === 0 && (
                      <div className="mt-1 text-[10px] text-green-600">
                        ✓ Contraseña válida
                      </div>
                    )}
                  </div>
                </div>

                {/* Empresa */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Empresa / Razón Social</label>
                    <input
                      type="text"
                      value={form.razon_social_cliente}
                      onChange={(e) => setForm({ ...form, razon_social_cliente: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Empresa S.A."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CUIT / ID Fiscal</label>
                    <input
                      type="text"
                      value={form.cuit_cliente}
                      onChange={(e) => setForm({ ...form, cuit_cliente: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="30-12345678-9"
                    />
                  </div>
                </div>

                {/* País y Teléfono */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
                    <select
                      value={form.pais_cliente}
                      onChange={(e) => handlePaisChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {PAISES.map(p => (
                        <option key={p.code} value={p.code}>{p.name} (+{p.phoneCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-2.5 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600">
                        +{form.codigo_telefono}
                      </span>
                      <input
                        type="text"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '') })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="1155551234"
                      />
                    </div>
                  </div>
                </div>

                {/* Rol y Nº Abono */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      value={form.rol}
                      onChange={(e) => setForm({ ...form, rol: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {ROLES_CLIENTE.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nº Abono (interno)</label>
                    <input
                      type="text"
                      value={form.id_interno}
                      onChange={(e) => setForm({ ...form, id_interno: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="9001"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
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
    </div>
  )
}

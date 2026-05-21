import { useState, useEffect, useRef } from 'react'
import ReactQuill from 'react-quill'
import { Search, Plus, Trash2, ChevronDown, Building2, Info } from 'lucide-react'
import 'react-quill/dist/quill.snow.css'

// ══════════════════════════════════════════════════════════════════════
// ══ LISTA DE BANCOS POR PAÍS ══════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════

const BANCOS_POR_PAIS = {
  AR: {
    nombre: 'Argentina',
    bandera: '🇦🇷',
    bancos: [
      // Bancos Públicos
      { codigo: 'AR_NACION', nombre: 'Banco de la Nación Argentina', sigla: 'BNA', tipo: 'publico' },
      { codigo: 'AR_PROVINCIA', nombre: 'Banco de la Provincia de Buenos Aires', sigla: 'BPBA', tipo: 'publico' },
      { codigo: 'AR_CIUDAD', nombre: 'Banco de la Ciudad de Buenos Aires', sigla: 'BCBA', tipo: 'publico' },
      { codigo: 'AR_CORDOBA', nombre: 'Banco de Córdoba', sigla: 'BANCOR', tipo: 'publico' },
      { codigo: 'AR_SANTA_FE', nombre: 'Nuevo Banco de Santa Fe', sigla: 'NBSF', tipo: 'publico' },
      { codigo: 'AR_ENTRE_RIOS', nombre: 'Nuevo Banco de Entre Ríos', sigla: 'NBER', tipo: 'publico' },
      { codigo: 'AR_SAN_JUAN', nombre: 'Banco de San Juan', sigla: 'BSJ', tipo: 'publico' },
      { codigo: 'AR_CHUBUT', nombre: 'Banco del Chubut', sigla: 'BCH', tipo: 'publico' },
      { codigo: 'AR_CORRIENTES', nombre: 'Banco de Corrientes', sigla: 'BC', tipo: 'publico' },
      { codigo: 'AR_FORMOSA', nombre: 'Banco de Formosa', sigla: 'BF', tipo: 'publico' },
      { codigo: 'AR_LA_PAMPA', nombre: 'Banco de La Pampa', sigla: 'BLP', tipo: 'publico' },
      { codigo: 'AR_TUCUMAN', nombre: 'Banco del Tucumán', sigla: 'BT', tipo: 'publico' },
      { codigo: 'AR_SANTIAGO', nombre: 'Banco de Santiago del Estero', sigla: 'BSE', tipo: 'publico' },
      { codigo: 'AR_CHACO', nombre: 'Nuevo Banco del Chaco', sigla: 'NBC', tipo: 'publico' },
      { codigo: 'AR_ROSARIO', nombre: 'Banco Municipal de Rosario', sigla: 'BMR', tipo: 'publico' },
      // Bancos Privados Nacionales
      { codigo: 'AR_GALICIA', nombre: 'Banco de Galicia y Buenos Aires', sigla: 'GALICIA', tipo: 'privado' },
      { codigo: 'AR_MACRO', nombre: 'Banco Macro', sigla: 'MACRO', tipo: 'privado' },
      { codigo: 'AR_SUPERVIELLE', nombre: 'Banco Supervielle', sigla: 'SUPERVIELLE', tipo: 'privado' },
      { codigo: 'AR_HIPOTECARIO', nombre: 'Banco Hipotecario', sigla: 'HIPOTECARIO', tipo: 'privado' },
      { codigo: 'AR_CREDICOOP', nombre: 'Banco Credicoop', sigla: 'CREDICOOP', tipo: 'privado' },
      { codigo: 'AR_COMAFI', nombre: 'Banco Comafi', sigla: 'COMAFI', tipo: 'privado' },
      { codigo: 'AR_PATAGONIA', nombre: 'Banco Patagonia', sigla: 'PATAGONIA', tipo: 'privado' },
      { codigo: 'AR_INDUSTRIAL', nombre: 'Banco Industrial', sigla: 'BIND', tipo: 'privado' },
      { codigo: 'AR_PIANO', nombre: 'Banco Piano', sigla: 'PIANO', tipo: 'privado' },
      { codigo: 'AR_MARIVA', nombre: 'Banco Mariva', sigla: 'MARIVA', tipo: 'privado' },
      { codigo: 'AR_ROELA', nombre: 'Banco Roela', sigla: 'ROELA', tipo: 'privado' },
      { codigo: 'AR_MERIDIAN', nombre: 'Banco Meridian', sigla: 'MERIDIAN', tipo: 'privado' },
      { codigo: 'AR_CMF', nombre: 'Banco CMF', sigla: 'CMF', tipo: 'privado' },
      { codigo: 'AR_COINAG', nombre: 'Banco Coinag', sigla: 'COINAG', tipo: 'privado' },
      { codigo: 'AR_COLUMBIA', nombre: 'Banco Columbia', sigla: 'COLUMBIA', tipo: 'privado' },
      { codigo: 'AR_BICA', nombre: 'Banco Bica', sigla: 'BICA', tipo: 'privado' },
      { codigo: 'AR_JULIO', nombre: 'Banco Julio', sigla: 'JULIO', tipo: 'privado' },
      { codigo: 'AR_DINO', nombre: 'Banco Dino', sigla: 'DINO', tipo: 'privado' },
      { codigo: 'AR_VOII', nombre: 'Banco Voii', sigla: 'VOII', tipo: 'privado' },
      { codigo: 'AR_MASVENTAS', nombre: 'Banco Masventas', sigla: 'MASVENTAS', tipo: 'privado' },
      { codigo: 'AR_VALORES', nombre: 'Banco de Valores', sigla: 'BVAL', tipo: 'privado' },
      { codigo: 'AR_SAENZ', nombre: 'Banco Saenz', sigla: 'SAENZ', tipo: 'privado' },
      { codigo: 'AR_BISEL', nombre: 'Banco Bisel', sigla: 'BISEL', tipo: 'privado' },
      { codigo: 'AR_BST', nombre: 'Banco BST', sigla: 'BST', tipo: 'privado' },
      // Bancos Extranjeros
      { codigo: 'AR_SANTANDER', nombre: 'Banco Santander Río', sigla: 'SANTANDER', tipo: 'extranjero' },
      { codigo: 'AR_BBVA', nombre: 'BBVA Argentina', sigla: 'BBVA', tipo: 'extranjero' },
      { codigo: 'AR_HSBC', nombre: 'HSBC Bank Argentina', sigla: 'HSBC', tipo: 'extranjero' },
      { codigo: 'AR_ICBC', nombre: 'Industrial and Commercial Bank of China', sigla: 'ICBC', tipo: 'extranjero' },
      { codigo: 'AR_CITI', nombre: 'Citibank Argentina', sigla: 'CITI', tipo: 'extranjero' },
      { codigo: 'AR_ITAU', nombre: 'Banco Itaú Argentina', sigla: 'ITAU', tipo: 'extranjero' },
      // Bancos Digitales / Fintech
      { codigo: 'AR_BRUBANK', nombre: 'Brubank', sigla: 'BRUBANK', tipo: 'digital' },
      { codigo: 'AR_UALA', nombre: 'Ualá', sigla: 'UALA', tipo: 'digital' },
      { codigo: 'AR_MERCADOPAGO', nombre: 'Mercado Pago', sigla: 'MP', tipo: 'digital' },
      { codigo: 'AR_NARANJA_X', nombre: 'Naranja X', sigla: 'NX', tipo: 'digital' },
      { codigo: 'AR_REBA', nombre: 'Rebanking', sigla: 'REBA', tipo: 'digital' },
    ]
  },
  UY: {
    nombre: 'Uruguay',
    bandera: '🇺🇾',
    bancos: [
      // Bancos Públicos
      { codigo: 'UY_BROU', nombre: 'Banco de la República Oriental del Uruguay', sigla: 'BROU', tipo: 'publico' },
      { codigo: 'UY_BHU', nombre: 'Banco Hipotecario del Uruguay', sigla: 'BHU', tipo: 'publico' },
      // Bancos Privados
      { codigo: 'UY_SANTANDER', nombre: 'Banco Santander Uruguay', sigla: 'SANTANDER', tipo: 'privado' },
      { codigo: 'UY_ITAU', nombre: 'Banco Itaú Uruguay', sigla: 'ITAU', tipo: 'privado' },
      { codigo: 'UY_SCOTIABANK', nombre: 'Scotiabank Uruguay', sigla: 'SCOTIA', tipo: 'privado' },
      { codigo: 'UY_BBVA', nombre: 'BBVA Uruguay', sigla: 'BBVA', tipo: 'privado' },
      { codigo: 'UY_HSBC', nombre: 'HSBC Bank Uruguay', sigla: 'HSBC', tipo: 'privado' },
      { codigo: 'UY_HERITAGE', nombre: 'Banco Heritage', sigla: 'HERITAGE', tipo: 'privado' },
      { codigo: 'UY_BANDES', nombre: 'Bandes Uruguay', sigla: 'BANDES', tipo: 'privado' },
      { codigo: 'UY_CITIBANK', nombre: 'Citibank Uruguay', sigla: 'CITI', tipo: 'privado' },
    ]
  },
  CL: {
    nombre: 'Chile',
    bandera: '🇨🇱',
    bancos: [
      { codigo: 'CL_ESTADO', nombre: 'BancoEstado', sigla: 'BCOESTADO', tipo: 'publico' },
      { codigo: 'CL_CHILE', nombre: 'Banco de Chile', sigla: 'BCH', tipo: 'privado' },
      { codigo: 'CL_SANTANDER', nombre: 'Banco Santander Chile', sigla: 'SANTANDER', tipo: 'privado' },
      { codigo: 'CL_BCI', nombre: 'Banco de Crédito e Inversiones', sigla: 'BCI', tipo: 'privado' },
      { codigo: 'CL_SCOTIABANK', nombre: 'Scotiabank Chile', sigla: 'SCOTIA', tipo: 'privado' },
      { codigo: 'CL_ITAU', nombre: 'Banco Itaú Chile', sigla: 'ITAU', tipo: 'privado' },
      { codigo: 'CL_SECURITY', nombre: 'Banco Security', sigla: 'SECURITY', tipo: 'privado' },
      { codigo: 'CL_FALABELLA', nombre: 'Banco Falabella', sigla: 'FALABELLA', tipo: 'privado' },
      { codigo: 'CL_BICE', nombre: 'Banco BICE', sigla: 'BICE', tipo: 'privado' },
      { codigo: 'CL_CONSORCIO', nombre: 'Banco Consorcio', sigla: 'CONSORCIO', tipo: 'privado' },
      { codigo: 'CL_RIPLEY', nombre: 'Banco Ripley', sigla: 'RIPLEY', tipo: 'privado' },
      { codigo: 'CL_INTERNACIONAL', nombre: 'Banco Internacional', sigla: 'BINT', tipo: 'privado' },
    ]
  },
  MX: {
    nombre: 'México',
    bandera: '🇲🇽',
    bancos: [
      { codigo: 'MX_BBVA', nombre: 'BBVA México', sigla: 'BBVA', tipo: 'privado' },
      { codigo: 'MX_BANORTE', nombre: 'Banorte', sigla: 'BANORTE', tipo: 'privado' },
      { codigo: 'MX_SANTANDER', nombre: 'Santander México', sigla: 'SANTANDER', tipo: 'privado' },
      { codigo: 'MX_CITIBANAMEX', nombre: 'Citibanamex', sigla: 'BANAMEX', tipo: 'privado' },
      { codigo: 'MX_HSBC', nombre: 'HSBC México', sigla: 'HSBC', tipo: 'privado' },
      { codigo: 'MX_SCOTIABANK', nombre: 'Scotiabank México', sigla: 'SCOTIA', tipo: 'privado' },
      { codigo: 'MX_INBURSA', nombre: 'Banco Inbursa', sigla: 'INBURSA', tipo: 'privado' },
      { codigo: 'MX_AZTECA', nombre: 'Banco Azteca', sigla: 'AZTECA', tipo: 'privado' },
      { codigo: 'MX_BAJIO', nombre: 'Banco del Bajío', sigla: 'BAJIO', tipo: 'privado' },
      { codigo: 'MX_AFIRME', nombre: 'Banco Afirme', sigla: 'AFIRME', tipo: 'privado' },
      { codigo: 'MX_BANREGIO', nombre: 'Banregio', sigla: 'BANREGIO', tipo: 'privado' },
      { codigo: 'MX_MIFEL', nombre: 'Banco Mifel', sigla: 'MIFEL', tipo: 'privado' },
      { codigo: 'MX_MULTIVA', nombre: 'Banco Multiva', sigla: 'MULTIVA', tipo: 'privado' },
      { codigo: 'MX_INTERACCIONES', nombre: 'Banco Interacciones', sigla: 'INTERACCIONES', tipo: 'privado' },
    ]
  },
  CO: {
    nombre: 'Colombia',
    bandera: '🇨🇴',
    bancos: [
      { codigo: 'CO_REPUBLICA', nombre: 'Banco de la República', sigla: 'BANREP', tipo: 'publico' },
      { codigo: 'CO_BOGOTA', nombre: 'Banco de Bogotá', sigla: 'BBOG', tipo: 'privado' },
      { codigo: 'CO_BANCOLOMBIA', nombre: 'Bancolombia', sigla: 'BANCOLOMBIA', tipo: 'privado' },
      { codigo: 'CO_DAVIVIENDA', nombre: 'Davivienda', sigla: 'DAVIVIENDA', tipo: 'privado' },
      { codigo: 'CO_BBVA', nombre: 'BBVA Colombia', sigla: 'BBVA', tipo: 'privado' },
      { codigo: 'CO_OCCIDENTE', nombre: 'Banco de Occidente', sigla: 'OCCIDENTE', tipo: 'privado' },
      { codigo: 'CO_POPULAR', nombre: 'Banco Popular', sigla: 'POPULAR', tipo: 'privado' },
      { codigo: 'CO_AVVILLAS', nombre: 'Banco AV Villas', sigla: 'AVVILLAS', tipo: 'privado' },
      { codigo: 'CO_SCOTIABANK', nombre: 'Scotiabank Colpatria', sigla: 'COLPATRIA', tipo: 'privado' },
      { codigo: 'CO_ITAU', nombre: 'Itaú Colombia', sigla: 'ITAU', tipo: 'privado' },
      { codigo: 'CO_GNB', nombre: 'GNB Sudameris', sigla: 'GNB', tipo: 'privado' },
      { codigo: 'CO_CITIBANK', nombre: 'Citibank Colombia', sigla: 'CITI', tipo: 'privado' },
      { codigo: 'CO_NEQUI', nombre: 'Nequi', sigla: 'NEQUI', tipo: 'digital' },
      { codigo: 'CO_DAVIPLATA', nombre: 'Daviplata', sigla: 'DAVIPLATA', tipo: 'digital' },
    ]
  },
  PE: {
    nombre: 'Perú',
    bandera: '🇵🇪',
    bancos: [
      { codigo: 'PE_BCP', nombre: 'Banco de Crédito del Perú', sigla: 'BCP', tipo: 'privado' },
      { codigo: 'PE_BBVA', nombre: 'BBVA Perú', sigla: 'BBVA', tipo: 'privado' },
      { codigo: 'PE_INTERBANK', nombre: 'Interbank', sigla: 'IBK', tipo: 'privado' },
      { codigo: 'PE_SCOTIABANK', nombre: 'Scotiabank Perú', sigla: 'SCOTIA', tipo: 'privado' },
      { codigo: 'PE_BANBIF', nombre: 'BanBif', sigla: 'BANBIF', tipo: 'privado' },
      { codigo: 'PE_PICHINCHA', nombre: 'Banco Pichincha', sigla: 'PICHINCHA', tipo: 'privado' },
      { codigo: 'PE_GNB', nombre: 'Banco GNB Perú', sigla: 'GNB', tipo: 'privado' },
      { codigo: 'PE_COMERCIO', nombre: 'Banco de Comercio', sigla: 'COMERCIO', tipo: 'privado' },
      { codigo: 'PE_SANTANDER', nombre: 'Banco Santander Perú', sigla: 'SANTANDER', tipo: 'privado' },
      { codigo: 'PE_CITIBANK', nombre: 'Citibank Perú', sigla: 'CITI', tipo: 'privado' },
      { codigo: 'PE_NACION', nombre: 'Banco de la Nación', sigla: 'BNDP', tipo: 'publico' },
    ]
  },
  HN: {
    nombre: 'Honduras',
    bandera: '🇭🇳',
    bancos: [
      { codigo: 'HN_ATLANTIDA', nombre: 'Banco Atlántida', sigla: 'ATLANTIDA', tipo: 'privado' },
      { codigo: 'HN_FICOHSA', nombre: 'Banco Ficohsa', sigla: 'FICOHSA', tipo: 'privado' },
      { codigo: 'HN_BAC', nombre: 'BAC Honduras', sigla: 'BAC', tipo: 'privado' },
      { codigo: 'HN_OCCIDENTE', nombre: 'Banco de Occidente Honduras', sigla: 'OCCIDENTE', tipo: 'privado' },
      { codigo: 'HN_HONDURAS', nombre: 'Banco de Honduras', sigla: 'BANHON', tipo: 'privado' },
      { codigo: 'HN_DAVIVIENDA', nombre: 'Davivienda Honduras', sigla: 'DAVIVIENDA', tipo: 'privado' },
      { codigo: 'HN_PROMERICA', nombre: 'Banco Promerica Honduras', sigla: 'PROMERICA', tipo: 'privado' },
      { codigo: 'HN_BANPAIS', nombre: 'Banpais', sigla: 'BANPAIS', tipo: 'privado' },
      { codigo: 'HN_LAFISE', nombre: 'Banco Lafise Honduras', sigla: 'LAFISE', tipo: 'privado' },
    ]
  },
  CR: {
    nombre: 'Costa Rica',
    bandera: '🇨🇷',
    bancos: [
      { codigo: 'CR_NACIONAL', nombre: 'Banco Nacional de Costa Rica', sigla: 'BNCR', tipo: 'publico' },
      { codigo: 'CR_COSTA_RICA', nombre: 'Banco de Costa Rica', sigla: 'BCR', tipo: 'publico' },
      { codigo: 'CR_BAC', nombre: 'BAC San José', sigla: 'BAC', tipo: 'privado' },
      { codigo: 'CR_SCOTIABANK', nombre: 'Scotiabank Costa Rica', sigla: 'SCOTIA', tipo: 'privado' },
      { codigo: 'CR_DAVIVIENDA', nombre: 'Davivienda Costa Rica', sigla: 'DAVIVIENDA', tipo: 'privado' },
      { codigo: 'CR_PROMERICA', nombre: 'Banco Promerica Costa Rica', sigla: 'PROMERICA', tipo: 'privado' },
      { codigo: 'CR_LAFISE', nombre: 'Banco Lafise', sigla: 'LAFISE', tipo: 'privado' },
      { codigo: 'CR_POPULAR', nombre: 'Banco Popular y de Desarrollo Comunal', sigla: 'BP', tipo: 'publico' },
      { codigo: 'CR_CITIBANK', nombre: 'Citibank Costa Rica', sigla: 'CITI', tipo: 'privado' },
    ]
  },
  BR: {
    nombre: 'Brasil',
    bandera: '🇧🇷',
    bancos: [
      { codigo: 'BR_BRASIL', nombre: 'Banco do Brasil', sigla: 'BB', tipo: 'publico' },
      { codigo: 'BR_CAIXA', nombre: 'Caixa Econômica Federal', sigla: 'CAIXA', tipo: 'publico' },
      { codigo: 'BR_ITAU', nombre: 'Itaú Unibanco', sigla: 'ITAU', tipo: 'privado' },
      { codigo: 'BR_BRADESCO', nombre: 'Bradesco', sigla: 'BRADESCO', tipo: 'privado' },
      { codigo: 'BR_SANTANDER', nombre: 'Santander Brasil', sigla: 'SANTANDER', tipo: 'privado' },
      { codigo: 'BR_BTG', nombre: 'BTG Pactual', sigla: 'BTG', tipo: 'privado' },
      { codigo: 'BR_SAFRA', nombre: 'Banco Safra', sigla: 'SAFRA', tipo: 'privado' },
      { codigo: 'BR_NUBANK', nombre: 'Nubank', sigla: 'NUBANK', tipo: 'digital' },
      { codigo: 'BR_INTER', nombre: 'Banco Inter', sigla: 'INTER', tipo: 'digital' },
      { codigo: 'BR_C6', nombre: 'C6 Bank', sigla: 'C6', tipo: 'digital' },
    ]
  },
  // Bancos Internacionales (sin país específico)
  INTL: {
    nombre: 'Internacional',
    bandera: '🌐',
    bancos: [
      { codigo: 'INTL_JPMORGAN', nombre: 'JP Morgan Chase', sigla: 'JPMORGAN', tipo: 'internacional' },
      { codigo: 'INTL_BOA', nombre: 'Bank of America', sigla: 'BOA', tipo: 'internacional' },
      { codigo: 'INTL_WELLS', nombre: 'Wells Fargo', sigla: 'WELLS', tipo: 'internacional' },
      { codigo: 'INTL_DEUTSCHE', nombre: 'Deutsche Bank', sigla: 'DB', tipo: 'internacional' },
      { codigo: 'INTL_BNP', nombre: 'BNP Paribas', sigla: 'BNP', tipo: 'internacional' },
      { codigo: 'INTL_CREDIT_SUISSE', nombre: 'Credit Suisse', sigla: 'CS', tipo: 'internacional' },
      { codigo: 'INTL_UBS', nombre: 'UBS', sigla: 'UBS', tipo: 'internacional' },
      { codigo: 'INTL_STANDARD', nombre: 'Standard Chartered', sigla: 'STANCHART', tipo: 'internacional' },
      { codigo: 'INTL_BARCLAYS', nombre: 'Barclays', sigla: 'BARCLAYS', tipo: 'internacional' },
      { codigo: 'INTL_GOLDMAN', nombre: 'Goldman Sachs', sigla: 'GS', tipo: 'internacional' },
    ]
  }
}

// Tipos de relación bancaria
const TIPOS_RELACION = [
  { codigo: 'CUENTA_CORRIENTE', label: 'Cuenta Corriente' },
  { codigo: 'CAJA_AHORRO', label: 'Caja de Ahorro' },
  { codigo: 'LINEA_CREDITO', label: 'Línea de Crédito' },
  { codigo: 'PRESTAMO', label: 'Préstamo' },
  { codigo: 'DESCUENTO_DOCUMENTOS', label: 'Descuento de Documentos' },
  { codigo: 'LEASING', label: 'Leasing' },
  { codigo: 'COMERCIO_EXTERIOR', label: 'Comercio Exterior' },
  { codigo: 'FACTORING', label: 'Factoring' },
  { codigo: 'TARJETA_CORPORATIVA', label: 'Tarjeta Corporativa' },
  { codigo: 'GARANTIA', label: 'Garantía/Aval' },
  { codigo: 'OTRO', label: 'Otro' },
]

// Helper: obtener info de banco por código
const getBancoInfo = (codigo) => {
  for (const pais of Object.values(BANCOS_POR_PAIS)) {
    const banco = pais.bancos.find(b => b.codigo === codigo)
    if (banco) return { ...banco, pais: pais.nombre, bandera: pais.bandera }
  }
  return null
}

// Helper: obtener todos los bancos de un país
const getBancosPorPais = (paisCodigo) => {
  return BANCOS_POR_PAIS[paisCodigo]?.bancos || []
}

// Helper: buscar bancos por texto
const buscarBancos = (texto, paisFiltro = null) => {
  const term = texto.toLowerCase().trim()
  if (!term) return []
  
  const results = []
  const paises = paisFiltro ? [paisFiltro] : Object.keys(BANCOS_POR_PAIS)
  
  for (const paisCodigo of paises) {
    const paisData = BANCOS_POR_PAIS[paisCodigo]
    if (!paisData) continue
    
    for (const banco of paisData.bancos) {
      const matchNombre = banco.nombre.toLowerCase().includes(term)
      const matchSigla = banco.sigla?.toLowerCase().includes(term)
      if (matchNombre || matchSigla) {
        results.push({
          ...banco,
          paisCodigo,
          paisNombre: paisData.nombre,
          bandera: paisData.bandera
        })
      }
    }
  }
  
  return results.slice(0, 15) // Limitar resultados
}

// Quill modules para el editor de observaciones
const quillModules = {
  toolbar: [['bold', 'italic', 'underline'], [{ list: 'bullet' }], ['clean']]
}
const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet']

const AUTO_BANKS_TITLE = 'Bancos sincronizados (auto):'

const BANK_ALIAS_MAP = {
  'SANTANDER RIO': 'AR_SANTANDER',
  'SANTANDER': 'AR_SANTANDER',
  'GALICIA': 'AR_GALICIA',
  'BANCO DE GALICIA': 'AR_GALICIA',
  'BS.AIRES': 'AR_GALICIA',
  'NACION ARGENTINA': 'AR_NACION',
  'BANCO NACION': 'AR_NACION',
  'PROVINCIA DE BUENOS AIRES': 'AR_PROVINCIA',
  'CIUDAD DE BUENOS AIRES': 'AR_CIUDAD',
  'INDUSTRIAL AND COMMERCIAL BANK': 'AR_ICBC',
  'ICBC': 'AR_ICBC',
  'CITIBANK': 'AR_CITI',
  'CITI': 'AR_CITI',
  'BANCO MACRO': 'AR_MACRO',
  'HIPOTECARIO': 'AR_HIPOTECARIO',
  'PATAGONIA': 'AR_PATAGONIA',
  'SUPERVIELLE': 'AR_SUPERVIELLE',
  'CREDICOOP': 'AR_CREDICOOP',
  'COMAFI': 'AR_COMAFI',
  'HSBC': 'AR_HSBC',
  'BBVA': 'AR_BBVA',
  'BANCO FRANCES': 'AR_BBVA',
  'ITAU': 'AR_ITAU',
  'BANCO DE VALORES': 'AR_VALORES',
}

// ══════════════════════════════════════════════════════════════════════
// ══ FUNCIONES DE PARSEO HTML ══════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════

const stripHtmlToText = (html = '') => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim()
}

const textToSimpleHtml = (text = '') => {
  if (!text.trim()) return ''
  return text
    .split('\n')
    .map(line => `<p>${line || '<br>'}</p>`)
    .join('')
}

const stripAutoBanksBlock = (html = '') => {
  if (!html) return ''
  const escaped = AUTO_BANKS_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html
    .replace(
      new RegExp(`<p><strong>${escaped}<\\/strong><\\/p>\\s*<p>[\\s\\S]*?<\\/p>`, 'gi'),
      ''
    )
    .replace(/(<p><br><\/p>\s*){3,}/gi, '<p><br></p><p><br></p>')
    .trim()
}

const buildAutoBanksBlock = (rows = []) => {
  const cleanRows = rows
    .map(r => ({
      bancoCode: r.bancoCode || '',
      bancoCustom: (r.bancoCustom || '').trim(),
      tipoRelacion: r.tipoRelacion || '',
      detalle: (r.detalle || '').trim(),
    }))
    .filter(r => r.bancoCode || r.bancoCustom)

  if (!cleanRows.length) return ''

  const lines = cleanRows.map(r => {
    const bancoInfo = r.bancoCode ? getBancoInfo(r.bancoCode) : null
    const bancoLabel = bancoInfo ? bancoInfo.nombre : r.bancoCustom
    const tipoLabel = TIPOS_RELACION.find(t => t.codigo === r.tipoRelacion)?.label || ''
    const detailLabel = r.detalle || ''

    if (tipoLabel && detailLabel) return `- ${bancoLabel} (${tipoLabel}) - ${detailLabel}`
    if (tipoLabel) return `- ${bancoLabel} (${tipoLabel})`
    if (detailLabel) return `- ${bancoLabel} - ${detailLabel}`
    return `- ${bancoLabel}`
  })

  return `<p><strong>${AUTO_BANKS_TITLE}</strong></p><p>${lines.join('<br/>')}</p>`
}

const mergeNotesWithAutoBanks = (notesHtml = '', rows = []) => {
  const manualNotes = stripAutoBanksBlock(String(notesHtml || '').trim())
  const autoBlock = buildAutoBanksBlock(rows)

  if (!manualNotes && !autoBlock) return ''
  if (!manualNotes) return autoBlock
  if (!autoBlock) return manualNotes
  return `${manualNotes}<p><br></p>${autoBlock}`
}

const detectBancoRowsInText = (plainText = '', existingCodes = new Set(), paisFiltro = null) => {
  const normalized = String(plainText || '').toUpperCase().trim()
  if (!normalized) return []

  const foundCodes = new Set(existingCodes)
  const foundRows = []
  const siglasSeen = new Set() // Evitar duplicados por sigla (BBVA de varios países)

  // Si hay filtro de país, solo buscar en ese país + internacionales
  const paisesABuscar = paisFiltro 
    ? [paisFiltro, 'INTL'].filter(p => BANCOS_POR_PAIS[p])
    : Object.keys(BANCOS_POR_PAIS)

  // Primero buscar por alias (solo Argentina por ahora)
  if (!paisFiltro || paisFiltro === 'AR') {
    for (const [alias, codigo] of Object.entries(BANK_ALIAS_MAP)) {
      if (foundCodes.has(codigo)) continue
      if (normalized.includes(alias)) {
        const info = getBancoInfo(codigo)
        if (info && !siglasSeen.has(info.sigla)) {
          foundRows.push({ bancoCode: codigo, bancoCustom: '', tipoRelacion: '', detalle: '' })
          foundCodes.add(codigo)
          siglasSeen.add(info.sigla)
        }
      }
    }
  }

  // Luego buscar en los países permitidos
  for (const paisCodigo of paisesABuscar) {
    const paisData = BANCOS_POR_PAIS[paisCodigo]
    if (!paisData) continue
    
    for (const banco of paisData.bancos) {
      if (foundCodes.has(banco.codigo)) continue
      // Evitar duplicados por sigla (ej: BBVA aparece en AR, UY, MX, etc.)
      if (siglasSeen.has(banco.sigla)) continue
      
      const nombreUpper = banco.nombre.toUpperCase()
      const siglaUpper = (banco.sigla || '').toUpperCase()
      
      if (normalized.includes(nombreUpper) || (siglaUpper.length >= 3 && normalized.includes(siglaUpper))) {
        foundRows.push({ bancoCode: banco.codigo, bancoCustom: '', tipoRelacion: '', detalle: '' })
        foundCodes.add(banco.codigo)
        if (banco.sigla) siglasSeen.add(banco.sigla)
      }
    }
  }

  return foundRows
}

// Extraer observaciones del HTML guardado
const extractObservacionesHtml = (html = '') => {
  const match = html.match(/<p><strong>Observaciones:<\/strong><\/p>([\s\S]*)$/i)
  return match ? match[1].trim() : ''
}

// ══════════════════════════════════════════════════════════════════════
// ══ PARSEAR VALOR INICIAL ═════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════

const parseInitialValue = (value = '') => {
  const plain = stripHtmlToText(value)
  if (!plain.trim()) {
    return { rows: [{ bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' }], notesHtml: '' }
  }

  // Detectar si viene del formato estructurado (líneas con • o -, o nuevo formato sin viñetas) o del antiguo (<li>)
  const hasOldVinetaFormat = /^[\s\u00A0]*[•-]\s+.+/im.test(plain)
  const hasOldFormat = /<li[^>]*>/i.test(value || '')
  const hasBanksTitle = /<\s*(?:strong|b)\s*>\s*Bancos\s+con\s+los\s+que\s+opera\s*:?\s*<\/\s*(?:strong|b)\s*>/i.test(value || '') || /Bancos\s+con\s+los\s+que\s+opera\s*:/i.test(plain)
  const fromStructuredEditor = hasOldVinetaFormat || hasOldFormat || hasBanksTitle

  // Si NO viene de ningún formato estructurado, todo va a observaciones
  if (!fromStructuredEditor) {
    const manualNotes = stripAutoBanksBlock(textToSimpleHtml(plain.trim()))
    return {
      rows: [{ bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' }],
      notesHtml: manualNotes,
    }
  }

  const rows = []
  
  // Intentar parsear formato con viñetas (• o -)
  if (hasOldVinetaFormat) {
    const lines = plain.split(/[\n\r]+/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^[•-]\s+/.test(trimmed)) {
        const content = trimmed.replace(/^[•-]\s+/, '').trim()
        const parsed = parseBancoRow(content)
        if (parsed) {
          rows.push(parsed)
        }
      }
    }
  }
  
  // Nuevo formato: líneas sin viñetas después del título "Bancos con los que opera:"
  if (rows.length === 0 && hasBanksTitle) {
    // Extraer líneas después del título
    const lines = plain.split(/[\n\r]+/)
    let foundTitle = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (/bancos\s+con\s+los\s+que\s+opera\s*:/i.test(trimmed)) {
        foundTitle = true
        continue
      }
      if (foundTitle && trimmed) {
        // Quitar viñetas si existen
        const content = trimmed.replace(/^[•-]\s*/, '').trim()
        const parsed = parseBancoRow(content)
        if (parsed) {
          rows.push(parsed)
        }
      }
    }
  }
  
  // Fallback: parsear formato antiguo (<li>)
  if (rows.length === 0 && hasOldFormat) {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let match
    while ((match = liRegex.exec(value)) !== null) {
      const liContent = stripHtmlToText(match[1]).trim()
      if (liContent) {
        const parsed = parseBancoRow(liContent)
        if (parsed) {
          rows.push(parsed)
        }
      }
    }
  }

  if (rows.length === 0) {
    rows.push({ bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' })
  }

  // Extraer observaciones (texto que no son bancos)
  let notesHtml = ''
  const observacionesMatch = value.match(/<p><strong>Observaciones:<\/strong><\/p>([\s\S]*)$/i)
  if (observacionesMatch) {
    notesHtml = stripAutoBanksBlock(observacionesMatch[1].trim())
  }
  
  return { rows, notesHtml }
}

// Parsear una línea de banco
const parseBancoRow = (line) => {
  if (!line.trim()) return null

  // Remover prefijo de título si viene inline por algún copy/paste
  const normalizedLine = line.replace(/^bancos\s+con\s+los\s+que\s+opera\s*:\s*/i, '').trim()
  if (!normalizedLine) return null
  
  // IGNORAR líneas que son datos del BCRA (no son bancos)
  const bcraPatterns = [
    /^situaci[oó]n\s+general\s*:/i,
    /^deuda\s+total\s*:/i,
    /^entidades\s+informantes\s*:/i,
    /^per[ií]odo\s*:/i,
    /^detalle\s+por\s+entidad\s*:/i,
    /^central\s+de\s+deudores/i,
    /^bcra\s*\(/i,
    /^\$[\d.,]+$/,  // Solo monto
    /^\d+$/,        // Solo número
    /^sit\.\s*\d/i, // Situación crediticia
    /^normal$/i,
    /^\d{6}$/,      // Período como 202603
  ]
  
  for (const pattern of bcraPatterns) {
    if (pattern.test(normalizedLine)) {
      return null // No es un banco, ignorar
    }
  }
  
  // Separar por " — " (nuevo formato) o " - " (antiguo formato)
  const parts = normalizedLine.split(/\s+[—-]\s+/)
  let bancoText = parts[0]?.trim() || ''
  let tipoText = parts[1]?.trim() || ''
  let detalleText = parts.slice(2).join(' — ').trim() || ''
  
  // Buscar banco por nombre
  let bancoCode = ''
  const bancoLower = bancoText.toLowerCase()
  
  for (const pais of Object.values(BANCOS_POR_PAIS)) {
    for (const banco of pais.bancos) {
      if (
        bancoLower.includes(banco.nombre.toLowerCase()) ||
        bancoLower.includes(banco.sigla?.toLowerCase() || '')
      ) {
        bancoCode = banco.codigo
        break
      }
    }
    if (bancoCode) break
  }
  
  // Buscar tipo de relación
  let tipoRelacion = ''
  const tipoLower = tipoText.toLowerCase()
  for (const tipo of TIPOS_RELACION) {
    if (tipoLower.includes(tipo.label.toLowerCase())) {
      tipoRelacion = tipo.codigo
      break
    }
  }
  
  // Si no encontró código de banco, verificar si parece un nombre de banco válido
  if (!bancoCode) {
    // Palabras clave que indican que es un banco
    const bancoKeywords = /banco|bank|banc|financier|credit|caja|savings|hsbc|bbva|santander|citi|itau|scotiabank|galicia|macro|nacion|provincia|ciudad|patagonia|icbc|brubank|uala|mercadopago/i
    if (!bancoKeywords.test(bancoText)) {
      return null // No parece un banco, ignorar
    }
  }
  
  return {
    bancoCode,
    bancoCustom: bancoCode ? '' : bancoText, // Si no encontró código, guardar texto libre
    tipoRelacion,
    detalle: detalleText || tipoText // Si no hay detalle, usar tipoText como detalle
  }
}

// ══════════════════════════════════════════════════════════════════════
// ══ CONSTRUIR HTML PARA GUARDAR ═══════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════

const buildHtmlValue = (rows, notesHtml) => {
  const cleanRows = rows
    .map(r => ({
      bancoCode: r.bancoCode || '',
      bancoCustom: (r.bancoCustom || '').trim(),
      tipoRelacion: r.tipoRelacion || '',
      detalle: (r.detalle || '').trim(),
    }))
    .filter(r => r.bancoCode || r.bancoCustom) // Filtrar filas vacías

  const normalizedNotesHtml = stripAutoBanksBlock(String(notesHtml || '').trim())
  const hasNotes = !!stripHtmlToText(normalizedNotesHtml).trim()

  if (!cleanRows.length && !hasNotes) return ''

  // Generar lista de bancos - formato simple
  const bankLines = cleanRows.map(r => {
    const bancoInfo = r.bancoCode ? getBancoInfo(r.bancoCode) : null
    const bancoLabel = bancoInfo 
      ? `${bancoInfo.nombre} (${bancoInfo.sigla})`
      : r.bancoCustom
    
    const tipoLabel = TIPOS_RELACION.find(t => t.codigo === r.tipoRelacion)?.label || ''
    const detailText = r.detalle || ''
    
    // Sin viñeta para mejor presentación en PDF
    let line = bancoLabel
    if (tipoLabel) line += ` — ${tipoLabel}`
    if (detailText) line += ` — ${detailText}`
    
    return line
  })

  // Construir HTML: título en un <p> y todos los bancos en <p> separados
  let html = ''
  if (bankLines.length > 0) {
    html = `<p><b>Bancos con los que opera:</b></p>\n` + bankLines.map(b => `<p>${b.trim()}</p>`).join('')
  }
  if (hasNotes) {
    if (html) html += '<p></p>' // Párrafo vacío como separador
    html += normalizedNotesHtml
  }
  return html
}

// ══════════════════════════════════════════════════════════════════════
// ══ COMPONENTE PRINCIPAL ══════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════

export default function BancosEditor({ value, onChange, disabled, paisEmpresa }) {
  const [rows, setRows] = useState([{ bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' }])
  const [notesHtml, setNotesHtml] = useState('')
  const [openBancoPickerIndex, setOpenBancoPickerIndex] = useState(null)
  const [bancoSearch, setBancoSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const internalSyncRef = useRef(false)
  const bancoPickerRef = useRef(null)

  // Detectar país de la empresa para filtrar bancos (soporta nombre completo y código)
  const paisUpper = (paisEmpresa || '').toUpperCase().trim()
  const paisFiltro = 
    ['ARGENTINA', 'AR', 'ARG'].includes(paisUpper) ? 'AR' 
    : ['URUGUAY', 'UY', 'URY'].includes(paisUpper) ? 'UY'
    : ['CHILE', 'CL', 'CHL'].includes(paisUpper) ? 'CL'
    : ['MEXICO', 'MX', 'MEX', 'MÉXICO'].includes(paisUpper) ? 'MX'
    : ['COLOMBIA', 'CO', 'COL'].includes(paisUpper) ? 'CO'
    : ['PERU', 'PE', 'PER', 'PERÚ'].includes(paisUpper) ? 'PE'
    : ['HONDURAS', 'HN', 'HND'].includes(paisUpper) ? 'HN'
    : ['COSTA RICA', 'CR', 'CRI'].includes(paisUpper) ? 'CR'
    : ['BRASIL', 'BR', 'BRA', 'BRAZIL'].includes(paisUpper) ? 'BR'
    : null

  // Parsear valor inicial
  useEffect(() => {
    if (internalSyncRef.current) {
      internalSyncRef.current = false
      return
    }
    const parsed = parseInitialValue(value || '')
    setRows(parsed.rows)
    setNotesHtml(parsed.notesHtml)
  }, [value])

  // Cerrar picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bancoPickerRef.current && !bancoPickerRef.current.contains(e.target)) {
        setOpenBancoPickerIndex(null)
        setBancoSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sincronizar cambios — notesHtml siempre es solo texto manual
  const syncToParent = (newRows, newNotes) => {
    internalSyncRef.current = true
    const html = buildHtmlValue(newRows, newNotes)
    onChange(html)
  }

  // Actualizar fila
  const updateRow = (index, field, val) => {
    const newRows = rows.map((r, i) => (i === index ? { ...r, [field]: val } : r))
    setRows(newRows)
    // Solo sincronizar si la fila tiene banco seleccionado
    if (newRows[index].bancoCode || newRows[index].bancoCustom) {
      syncToParent(newRows, notesHtml)
    }
  }

  // Seleccionar banco - actualizar ambos campos en una sola operación
  const selectBanco = (index, bancoCode) => {
    const newRows = rows.map((r, i) => (i === index ? { ...r, bancoCode, bancoCustom: '' } : r))
    setRows(newRows)
    syncToParent(newRows, notesHtml)
    setOpenBancoPickerIndex(null)
    setBancoSearch('')
  }

  // Agregar fila - NO sincronizar hasta que el usuario seleccione un banco
  const addRow = () => {
    const newRows = [...rows, { bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' }]
    setRows(newRows)
    // No llamar syncToParent aquí - la fila vacía no debe generar texto
  }

  // Eliminar fila
  const removeRow = (index) => {
    if (rows.length <= 1) {
      const emptyRow = { bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' }
      setRows([emptyRow])
      // No sincronizar fila vacía
      return
    }
    const newRows = rows.filter((_, i) => i !== index)
    setRows(newRows)
    syncToParent(newRows, notesHtml)
  }

  // Actualizar notas — html aquí es solo texto manual del usuario (NO detectar bancos automáticamente)
  const handleNotesChange = (html) => {
    setNotesHtml(html)
    syncToParent(rows, html)
  }

  // Extraer bancos del texto de observaciones manuales (filtra por país de la empresa)
  const extractBancosFromText = () => {
    const plainText = stripHtmlToText(notesHtml)
    if (!plainText.trim()) {
      return
    }

    const bancosYaAgregados = new Set(rows.map(r => r.bancoCode).filter(Boolean))
    const bancosEncontrados = detectBancoRowsInText(plainText, bancosYaAgregados, paisFiltro)
    
    if (bancosEncontrados.length === 0) {
      return
    }
    
    // Agregar los bancos encontrados (filtrar fila vacía inicial si existe)
    const rowsLimpias = rows.filter(r => r.bancoCode || r.bancoCustom)
    const newRows = [...rowsLimpias, ...bancosEncontrados]
    if (newRows.length === 0) {
      newRows.push({ bancoCode: '', bancoCustom: '', tipoRelacion: '', detalle: '' })
    }
    
    setRows(newRows)
    syncToParent(newRows, notesHtml)
  }

  // Contar bancos en el texto de observaciones (filtra por país de la empresa)
  const countBancosInText = () => {
    const plainText = stripHtmlToText(notesHtml)
    if (!plainText.trim()) return 0

    const bancosYaAgregados = new Set(rows.map(r => r.bancoCode).filter(Boolean))
    return detectBancoRowsInText(plainText, bancosYaAgregados, paisFiltro).length
  }
  
  const bancosEnTexto = countBancosInText()

  // Obtener bancos filtrados para el picker
  const getFilteredBancos = () => {
    if (bancoSearch.trim()) {
      return buscarBancos(bancoSearch, paisFiltro)
    }
    // Si no hay búsqueda, mostrar bancos del país de la empresa primero
    const results = []
    if (paisFiltro && BANCOS_POR_PAIS[paisFiltro]) {
      results.push(...BANCOS_POR_PAIS[paisFiltro].bancos.map(b => ({
        ...b,
        paisCodigo: paisFiltro,
        paisNombre: BANCOS_POR_PAIS[paisFiltro].nombre,
        bandera: BANCOS_POR_PAIS[paisFiltro].bandera
      })))
    }
    // Agregar internacionales
    if (BANCOS_POR_PAIS.INTL) {
      results.push(...BANCOS_POR_PAIS.INTL.bancos.map(b => ({
        ...b,
        paisCodigo: 'INTL',
        paisNombre: 'Internacional',
        bandera: '🌐'
      })))
    }
    return results.slice(0, 20)
  }

  // Contar bancos agregados
  const bancosAgregados = rows.filter(r => r.bancoCode || r.bancoCustom).length

  return (
    <div className="space-y-3">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Selecciona los bancos con los que opera la empresa
          </p>
          {bancosAgregados > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              ✓ {bancosAgregados} banco{bancosAgregados > 1 ? 's' : ''} agregado{bancosAgregados > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bancosEnTexto > 0 && (
            <button
              type="button"
              onClick={extractBancosFromText}
              disabled={disabled}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50"
              title="Detectar y agregar bancos mencionados en las observaciones"
            >
              <Search className="h-3 w-3" />
              Extraer bancos ({bancosEnTexto})
            </button>
          )}
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Agregar banco
          </button>
        </div>
      </div>

      {/* Filas de bancos */}
      <div className="space-y-2">
        {rows.map((row, index) => {
          const bancoInfo = row.bancoCode ? getBancoInfo(row.bancoCode) : null
          const filteredBancos = openBancoPickerIndex === index ? getFilteredBancos() : []
          const tieneSeleccion = bancoInfo || row.bancoCustom

          return (
            <div key={index} className={`flex gap-2 items-start p-2 rounded-lg border ${tieneSeleccion ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              {/* Selector de Banco */}
              <div className="flex-1 min-w-[200px] relative" ref={openBancoPickerIndex === index ? bancoPickerRef : null}>
                <label className="text-[10px] text-gray-500 block mb-0.5">
                  Banco {tieneSeleccion && <span className="text-green-600 font-medium">✓ Agregado</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={openBancoPickerIndex === index ? bancoSearch : (bancoInfo ? `${bancoInfo.bandera} ${bancoInfo.nombre}` : row.bancoCustom)}
                    onChange={(e) => {
                      setBancoSearch(e.target.value)
                      if (openBancoPickerIndex !== index) setOpenBancoPickerIndex(index)
                    }}
                    onFocus={() => {
                      setOpenBancoPickerIndex(index)
                      setBancoSearch('')
                      setHighlightedIndex(0)
                    }}
                    placeholder="Buscar banco..."
                    disabled={disabled}
                    className={`w-full px-2 py-1.5 text-sm border rounded pr-8 ${tieneSeleccion ? 'border-green-300 bg-white font-medium' : ''}`}
                  />
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>

                {/* Dropdown de bancos */}
                {openBancoPickerIndex === index && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border rounded-lg shadow-lg">
                    {filteredBancos.length > 0 ? (
                      filteredBancos.map((banco, bIdx) => (
                        <button
                          key={banco.codigo}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            selectBanco(index, banco.codigo)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${
                            bIdx === highlightedIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span className="text-base">{banco.bandera}</span>
                          <div className="flex-1">
                            <div className="font-medium">{banco.nombre}</div>
                            <div className="text-xs text-gray-500">{banco.sigla} • {banco.tipo}</div>
                          </div>
                        </button>
                      ))
                    ) : bancoSearch.trim() ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No se encontraron bancos. 
                        <button 
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const newRows = rows.map((r, i) => (i === index ? { ...r, bancoCode: '', bancoCustom: bancoSearch } : r))
                            setRows(newRows)
                            syncToParent(newRows, notesHtml)
                            setOpenBancoPickerIndex(null)
                            setBancoSearch('')
                          }}
                          className="ml-1 text-blue-600 hover:underline"
                        >
                          Usar "{bancoSearch}"
                        </button>
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">Escribe para buscar...</div>
                    )}
                  </div>
                )}
              </div>

              {/* Tipo de Relación */}
              <div className="w-44">
                <label className="text-[10px] text-gray-500 block mb-0.5">Tipo de Relación</label>
                <select
                  value={row.tipoRelacion}
                  onChange={(e) => updateRow(index, 'tipoRelacion', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_RELACION.map(tipo => (
                    <option key={tipo.codigo} value={tipo.codigo}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              {/* Detalle */}
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Detalle/Observación</label>
                <input
                  type="text"
                  value={row.detalle}
                  onChange={(e) => updateRow(index, 'detalle', e.target.value)}
                  placeholder="Ej: Desde 2015, línea USD 500k"
                  disabled={disabled}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                />
              </div>

              {/* Botón eliminar */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={disabled}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Eliminar banco"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen de bancos agregados */}
      {bancosAgregados > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            📋 Resumen - Bancos que se guardarán en el informe:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rows.filter(r => r.bancoCode || r.bancoCustom).map((row, idx) => {
              const info = row.bancoCode ? getBancoInfo(row.bancoCode) : null
              const nombre = info ? info.nombre : row.bancoCustom
              const tipo = row.tipoRelacion ? TIPOS_RELACION.find(t => t.codigo === row.tipoRelacion)?.label : ''
              return (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs"
                >
                  {info?.bandera} <span className="font-medium">{info?.sigla || nombre}</span>
                  {tipo && <span className="text-gray-500">• {tipo}</span>}
                </span>
              )
            })}
          </div>
          <p className="text-[10px] text-blue-600 mt-2">
            💾 Los cambios se guardan automáticamente al modificar los campos
          </p>
        </div>
      )}

      {/* Info de países disponibles */}
      <div className="flex flex-wrap gap-1 text-xs text-gray-400">
        <Info className="h-3 w-3" />
        Bancos disponibles:
        {Object.entries(BANCOS_POR_PAIS).filter(([k]) => k !== 'INTL').map(([code, data]) => (
          <span key={code} className="inline-flex items-center gap-0.5">
            {data.bandera} {data.bancos.length}
          </span>
        ))}
      </div>
    </div>
  )
}

// Exportar constantes para uso en otros componentes
export { BANCOS_POR_PAIS, TIPOS_RELACION, getBancoInfo, getBancosPorPais, buscarBancos }

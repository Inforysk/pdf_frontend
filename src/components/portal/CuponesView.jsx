import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Ticket, Copy, Gift, Clock, CheckCircle, Percent, DollarSign,
  Loader2, Tag, ShoppingBag, AlertCircle, AlertTriangle
} from 'lucide-react'

const TYPE_CONFIG = {
  percentage: { icon: Percent, color: 'text-purple-600' },
  fixed: { icon: DollarSign, color: 'text-green-600' }
}

const APPLIES_LABELS = {
  all: 'Todo',
  report_pack: 'Packs de informes',
  subscription: 'Suscripciones'
}

export default function CuponesView() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/portal/coupons')
      if (res.data.success) {
        setCoupons(res.data.coupons || [])
      }
    } catch (err) {
      toast.error('Error cargando cupones')
    }
    setLoading(false)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Código copiado al portapapeles')
  }

  const availableCoupons = coupons.filter(c => !c.is_used)
  const usedCoupons = coupons.filter(c => c.is_used)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="h-7 w-7 text-purple-600" />
            Mis Cupones
          </h1>
          <p className="text-gray-500 text-sm mt-1">Aplica estos descuentos en tus próximas compras</p>
        </div>
      </div>

      {/* Cupones disponibles */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-purple-500" />
          Cupones disponibles
          {availableCoupons.length > 0 && (
            <span className="ml-2 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {availableCoupons.length}
            </span>
          )}
        </h2>

        {availableCoupons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No tienes cupones disponibles</p>
            <p className="text-gray-400 text-sm mt-1">Los cupones aparecerán aquí cuando te asignen alguno</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} onCopy={copyCode} />
            ))}
          </div>
        )}
      </div>

      {/* Cupones usados */}
      {usedCoupons.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Cupones utilizados
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {usedCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} used />
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-purple-50 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
        <div className="text-sm text-purple-700">
          <p className="font-medium">¿Cómo usar un cupón?</p>
          <p className="mt-1 text-purple-600">
            Copia el código y aplícalo durante el proceso de compra de packs de informes.
            El descuento se aplicará automáticamente al total.
          </p>
        </div>
      </div>
    </div>
  )
}

function CouponCard({ coupon, onCopy, used = false }) {
  const TypeIcon = TYPE_CONFIG[coupon.type]?.icon || Percent
  const typeColor = TYPE_CONFIG[coupon.type]?.color || 'text-purple-600'
  
  // Usar los campos que devuelve la API
  const daysRemaining = coupon.days_remaining
  const expiresSoon = coupon.expires_soon // <= 30 días
  const expiresVerySoon = daysRemaining !== null && daysRemaining <= 7
  const expiresUrgent = daysRemaining !== null && daysRemaining <= 3

  return (
    <div className={`
      bg-white rounded-2xl border-2 transition-all
      ${used 
        ? 'border-gray-200 bg-gray-50' 
        : expiresUrgent 
          ? 'border-red-300 hover:border-red-400 hover:shadow-lg ring-2 ring-red-100'
          : expiresVerySoon
            ? 'border-orange-300 hover:border-orange-400 hover:shadow-lg'
            : 'border-purple-200 hover:border-purple-400 hover:shadow-lg'
      }
    `}>
      {/* Header con tipo */}
      <div className={`
        px-4 py-3 flex items-center justify-between rounded-t-xl
        ${used 
          ? 'bg-gray-100' 
          : expiresUrgent
            ? 'bg-gradient-to-r from-red-500 to-orange-500'
            : expiresVerySoon
              ? 'bg-gradient-to-r from-orange-500 to-amber-500'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500'
        }
      `}>
        <span className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
          ${used ? 'bg-gray-200 text-gray-600' : 'bg-white/20 text-white'}
        `}>
          <Tag className="h-3 w-3" />
          {APPLIES_LABELS[coupon.applies_to] || 'Todo'}
        </span>
        {!used && expiresSoon && daysRemaining !== null && (
          <span className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
            ${expiresUrgent 
              ? 'bg-white text-red-600 animate-pulse' 
              : expiresVerySoon 
                ? 'bg-white/30 text-white' 
                : 'bg-white/20 text-white'
            }
          `}>
            <Clock className="h-3 w-3" />
            {daysRemaining <= 0 ? '¡Último día!' : `${daysRemaining} días`}
          </span>
        )}
        {used && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <CheckCircle className="h-3 w-3" />
            Utilizado
          </span>
        )}
      </div>

      {/* Alerta de vencimiento urgente */}
      {!used && expiresUrgent && (
        <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-semibold bg-red-50 text-red-700 border-b border-red-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>¡Apúrate! Vence en {daysRemaining <= 0 ? 'menos de 24h' : `${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`}</span>
        </div>
      )}
      
      {/* Alerta de vencimiento próximo (7 días) */}
      {!used && expiresVerySoon && !expiresUrgent && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium bg-orange-50 text-orange-700 border-b border-orange-100">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>Vence en {daysRemaining} días</span>
        </div>
      )}

      {/* Contenido */}
      <div className="p-4">
        {/* Valor del descuento */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <TypeIcon className={`h-8 w-8 ${used ? 'text-gray-400' : typeColor}`} />
          <span className={`text-4xl font-bold ${used ? 'text-gray-400' : 'text-gray-900'}`}>
            {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
          </span>
          <span className={`text-lg ${used ? 'text-gray-400' : 'text-gray-500'}`}>OFF</span>
        </div>

        {/* Descripción */}
        {coupon.description && (
          <p className={`text-sm text-center mb-3 ${used ? 'text-gray-400' : 'text-gray-600'}`}>
            {coupon.description}
          </p>
        )}

        {/* Código */}
        <div className={`
          flex items-center justify-between px-3 py-2 rounded-lg
          ${used ? 'bg-gray-100' : 'bg-purple-50'}
        `}>
          <code className={`font-mono font-bold ${used ? 'text-gray-500' : 'text-purple-700'}`}>
            {coupon.code}
          </code>
          {!used && onCopy && (
            <button
              onClick={() => onCopy(coupon.code)}
              className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
              title="Copiar código"
            >
              <Copy className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>

        {/* Condiciones */}
        <div className="mt-3 space-y-1">
          {coupon.min_purchase > 0 && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              Compra mínima: ${coupon.min_purchase}
            </p>
          )}
          {coupon.valid_to && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Válido hasta: {new Date(coupon.valid_to).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          )}
        </div>

        {/* Botón usar */}
        {!used && (
          <button
            onClick={() => onCopy && onCopy(coupon.code)}
            className="
              mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 
              text-white font-medium rounded-xl
              hover:from-purple-700 hover:to-indigo-700 transition-all
              flex items-center justify-center gap-2
            "
          >
            <Copy className="h-4 w-4" />
            Copiar código
          </button>
        )}
      </div>
    </div>
  )
}

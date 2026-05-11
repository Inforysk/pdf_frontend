import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileText, Shield, Bell, TrendingUp, Wallet, Sparkles, ArrowRight, Check } from 'lucide-react'
import axios from 'axios'

export default function WelcomeModal({ user, onClose }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleDismiss = async () => {
    setLoading(true)
    
    // Solo persistir la preferencia si el usuario marcó "No volver a recordar"
    if (dontShowAgain) {
      try {
        await axios.post('/api/auth/dismiss-welcome')
      } catch (err) {
        console.error('Error dismissing welcome:', err)
      }
    }
    
    setLoading(false)
    onClose()
  }

  const handleClose = () => {
    // Cerrar sin persistir (se mostrará de nuevo)
    onClose()
  }

  const firstName = user?.nombre_completo?.split(' ')[0] || user?.username || 'Usuario'

  const features = [
    {
      icon: FileText,
      title: t('welcome.features.reports.title', 'Informes Comerciales'),
      description: t('welcome.features.reports.desc', 'Accede a informes detallados de empresas en múltiples países de Latinoamérica.')
    },
    {
      icon: Shield,
      title: t('welcome.features.scoring.title', 'Scoring Crediticio'),
      description: t('welcome.features.scoring.desc', 'Evalúa el riesgo crediticio con nuestro sistema de scoring inteligente y automatizado.')
    },
    {
      icon: Bell,
      title: t('welcome.features.monitoring.title', 'Monitoreo Continuo'),
      description: t('welcome.features.monitoring.desc', 'Recibe alertas cuando haya cambios importantes en las empresas que monitoreas.')
    },
    {
      icon: Wallet,
      title: t('welcome.features.coverage.title', 'Gestión de Cobranzas'),
      description: t('welcome.features.coverage.desc', 'Pide tus cobranzas para disminuir la morosidad e incobrables.')
    }
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-inforysk-navy-900/90 via-inforysk-navy-800/85 to-inforysk-red-600/80 backdrop-blur-sm"
      />
      
      {/* Modal - scrolleable en móvil */}
      <div className="relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-inforysk-navy-900 via-inforysk-navy-800 to-inforysk-red-600 px-4 sm:px-8 py-6 sm:py-8 text-white flex-shrink-0">
          {/* Decorative elements - ocultos en móvil */}
          <div className="hidden sm:block absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="hidden sm:block absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-2 sm:top-4 right-2 sm:right-4 p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          {/* Content */}
          <div className="relative pr-8">
            <div className="flex items-center gap-2 text-inforysk-red-200 mb-1 sm:mb-2">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">{t('welcome.subtitle', '¡Tu plataforma de inteligencia comercial!')}</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
              {t('welcome.greeting', '¡Bienvenido a Inforysk, {{name}}!', { name: firstName })}
            </h1>
            <p className="text-gray-200 text-sm sm:text-lg">
              {t('welcome.intro', 'Estamos emocionados de tenerte aquí. Descubre todo lo que puedes lograr con nuestra plataforma.')}
            </p>
          </div>
        </div>

        {/* Features grid - scrolleable */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
            {t('welcome.whatCanYouDo', '¿Qué puedes hacer en Inforysk?')}
          </h2>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-inforysk-navy-900 to-inforysk-red-600 flex items-center justify-center">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-xs sm:text-base leading-tight break-words">{feature.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5 break-words">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Checkbox "No volver a recordar" */}
            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
              <div 
                onClick={() => setDontShowAgain(!dontShowAgain)}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  dontShowAgain 
                    ? 'bg-inforysk-red-600 border-inforysk-red-600' 
                    : 'border-gray-300 group-hover:border-inforysk-red-400'
                }`}
              >
                {dontShowAgain && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />}
              </div>
              <span className="text-xs sm:text-sm text-gray-600 select-none">
                {t('welcome.dontShowAgain', 'No volver a mostrar este mensaje')}
              </span>
            </label>
            
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sm:gap-4">
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left hidden sm:block">
                {t('welcome.helpText', '¿Necesitas ayuda? Contáctanos en soporte@inforysk.com')}
              </p>
              <button
                onClick={handleDismiss}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-inforysk-navy-900 to-inforysk-red-600 text-white font-semibold rounded-lg sm:rounded-xl hover:from-inforysk-navy-800 hover:to-inforysk-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? (
                  <span>{t('common.loading', 'Cargando...')}</span>
                ) : (
                  <>
                    <span>{t('welcome.startExploring', 'Comenzar a explorar')}</span>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

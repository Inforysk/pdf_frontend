import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '¿Estás seguro?',
  message = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  icon: Icon = AlertTriangle,
  loading = false
}) {
  if (!isOpen) return null

  const variants = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      buttonText: 'text-white'
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      buttonText: 'text-white'
    },
    primary: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      buttonText: 'text-white'
    }
  }

  const style = variants[confirmVariant] || variants.danger

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header con icono */}
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center`}>
                <Icon className={`h-6 w-6 ${style.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
                {message && (
                  <p className="mt-2 text-sm text-gray-600">
                    {message}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Footer con botones */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2.5 text-sm font-medium ${style.buttonText} ${style.buttonBg} rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

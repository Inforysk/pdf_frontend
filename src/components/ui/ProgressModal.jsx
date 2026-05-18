const ACCENT_STYLES = {
  blue: {
    stroke: '#2563eb',
    timeClass: 'text-blue-600',
    barClass: 'bg-blue-600',
  },
  indigo: {
    stroke: '#6366f1',
    timeClass: 'text-indigo-600',
    barClass: 'bg-indigo-600',
  },
  violet: {
    stroke: '#8b5cf6',
    timeClass: 'text-violet-600',
    barClass: 'bg-violet-600',
  },
  emerald: {
    stroke: '#10b981',
    timeClass: 'text-emerald-600',
    barClass: 'bg-emerald-600',
  },
}

export default function ProgressModal({
  isOpen,
  title,
  message,
  elapsed = 0,
  progressMaxSeconds = 60,
  accent = 'blue',
  subtitle,
  footer,
}) {
  if (!isOpen) return null

  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.blue
  const progress = Math.min(100, (Math.max(0, elapsed) / Math.max(1, progressMaxSeconds)) * 100)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <div className="relative w-24 h-24 mx-auto">
            <svg className="w-24 h-24 animate-spin" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={styles.stroke}
                strokeWidth="8"
                strokeDasharray="251"
                strokeDashoffset="188"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${styles.timeClass}`}>{elapsed}s</span>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 min-h-[24px] transition-all duration-300">{message}</p>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className={`${styles.barClass} h-2 rounded-full transition-all duration-1000`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        {footer && <p className="text-xs text-gray-400 mt-2">{footer}</p>}
      </div>
    </div>
  )
}
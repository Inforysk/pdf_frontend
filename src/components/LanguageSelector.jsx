import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
]

export default function LanguageSelector({ compact = false, className = '', variant = 'light' }) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  const isDark = variant === 'dark'

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('i18nextLng', langCode)
    setIsOpen(false)
  }

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={currentLang.name}
        >
          <Globe className="h-4 w-4 text-gray-500" />
          <span className="text-base">{currentLang.code.toUpperCase()}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                  lang.code === currentLang.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
          isDark 
            ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' 
            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Globe className={`h-4 w-4 ${isDark ? 'text-white/70' : 'text-gray-500'}`} />
        <span className="text-lg">{currentLang.flag}</span>
        <span>{currentLang.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute right-0 mt-1 w-44 rounded-xl shadow-xl z-50 py-1 overflow-hidden ${
          isDark 
            ? 'bg-gray-900/90 backdrop-blur-xl border border-white/20' 
            : 'bg-white border border-gray-200'
        }`}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                isDark 
                  ? `text-white hover:bg-white/10 ${lang.code === currentLang.code ? 'bg-white/20 font-medium' : ''}`
                  : `hover:bg-gray-50 ${lang.code === currentLang.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code === currentLang.code && (
                <span className="ml-auto">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

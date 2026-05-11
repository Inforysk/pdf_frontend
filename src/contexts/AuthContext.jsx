import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

// Función auxiliar para limpiar sesión (usable fuera del contexto de React)
const clearSession = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  sessionStorage.clear()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('access_token'))
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'))
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const isLoggingOut = useRef(false)

  // Función de logout que se puede llamar desde interceptor
  const performLogout = useCallback(() => {
    if (isLoggingOut.current) return
    isLoggingOut.current = true
    
    // Intentar registrar logout en servidor
    const t = localStorage.getItem('access_token')
    const rt = localStorage.getItem('refresh_token')
    if (t) {
      axios.post('/api/auth/logout', { refresh_token: rt }, { headers: { Authorization: `Bearer ${t}` } }).catch(() => {})
    }
    
    // Limpiar todo el storage
    clearSession()
    
    // Limpiar estado
    setToken(null)
    setRefreshToken(null)
    setUser(null)
    setMustChangePassword(false)
    
    isLoggingOut.current = false
  }, [])

  // Configurar axios interceptor para incluir token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem('access_token')
      if (t) {
        config.headers.Authorization = `Bearer ${t}`
      }
      return config
    })

    return () => axios.interceptors.request.eject(interceptor)
  }, [])

  // Interceptor para renovar token expirado
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        const requestUrl = originalRequest?.url || ''
        const isAuthEndpoint = requestUrl.includes('/api/auth/login') ||
          requestUrl.includes('/api/auth/refresh') ||
          requestUrl.includes('/api/auth/logout')

        const currentRefreshToken = localStorage.getItem('refresh_token')
        
        if (error.response?.status === 401 && !originalRequest?._retry && currentRefreshToken && !isAuthEndpoint) {
          originalRequest._retry = true
          try {
            const res = await axios.post('/api/auth/refresh', { refresh_token: currentRefreshToken })
            if (res.data.success) {
              const newToken = res.data.access_token
              localStorage.setItem('access_token', newToken)
              setToken(newToken)
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              return axios(originalRequest)
            }
          } catch {
            // Refresh falló, forzar logout
            performLogout()
          }
        }
        return Promise.reject(error)
      }
    )

    return () => axios.interceptors.response.eject(interceptor)
  }, [performLogout])

  // Verificar sesión al cargar
  useEffect(() => {
    if (token) {
      verifySession()
    } else {
      setLoading(false)
    }
  }, [])

  const verifySession = async () => {
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setUser(res.data.user)
        setMustChangePassword(res.data.must_change_password || res.data.password_expired)
      } else {
        performLogout()
      }
    } catch {
      performLogout()
    } finally {
      setLoading(false)
    }
  }

  const login = useCallback((data) => {
    const { access_token, refresh_token, user: userData } = data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setToken(access_token)
    setRefreshToken(refresh_token)
    setUser(userData)
    setMustChangePassword(data.must_change_password || data.password_expired)
  }, [])

  // Logout público
  const logout = performLogout

  const onPasswordChanged = useCallback(() => {
    setMustChangePassword(false)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me')
      if (res.data.success) {
        setUser(res.data.user)
      }
    } catch (err) {
      console.error('Error refrescando usuario:', err)
    }
  }, [])

  const hasPermission = useCallback((permission) => {
    if (!user) return false
    if (user.rol === 'admin') return true
    return user.permisos?.includes(permission) || false
  }, [user])

  const value = {
    user,
    token,
    loading,
    mustChangePassword,
    login,
    logout,
    onPasswordChanged,
    refreshUser,
    hasPermission,
    isAuthenticated: !!user,
    isAdmin: user?.rol === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

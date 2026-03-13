import React, { createContext, useContext, useState, useEffect } from 'react'
import api from './api'

interface AuthContextType {
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('platform_token')
    if (savedToken) {
      setToken(savedToken)
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const response = await api.post('/api/v1/merchant/auth/login', { username, password })
    // API response shape: { data: { data: { accessToken, refreshToken, ... } } }
    const result = response.data?.data?.data || response.data?.data || response.data
    const newToken = result.accessToken || result.token
    if (!newToken) {
      throw new Error('No token received from server')
    }
    setToken(newToken)
    localStorage.setItem('platform_token', newToken)
    if (result.refreshToken) {
      localStorage.setItem('platform_refresh_token', result.refreshToken)
    }
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('platform_token')
    localStorage.removeItem('platform_refresh_token')
  }

  return (
    <AuthContext.Provider value={{ token, isLoading, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

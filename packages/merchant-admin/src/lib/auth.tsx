import React, { createContext, useContext, useState, useCallback } from 'react'
import api from './api'

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token')
  })

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.post('/api/v1/merchant/auth/login', {
      username,
      password,
    })
    // API response shape: { data: { data: { accessToken, refreshToken, ... } } }
    const result = response.data?.data?.data || response.data?.data || response.data
    const newToken = result.accessToken || result.token
    if (!newToken) {
      throw new Error('No token received from server')
    }
    localStorage.setItem('auth_token', newToken)
    if (result.refreshToken) {
      localStorage.setItem('refresh_token', result.refreshToken)
    }
    setToken(newToken)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

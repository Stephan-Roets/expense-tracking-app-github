import { api } from '@/lib/api/client'
import {
  normalizeAuthResponse,
  type NormalizedAuthResponse,
} from '@/lib/auth/normalize-auth-response'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
  organizationMode: 'SOLO' | 'FLEET'
  role?: 'ADMIN' | 'MANAGER' | 'DRIVER'
}

export interface AuthResponse extends NormalizedAuthResponse {
  verificationToken?: string
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const { data } = await api.post('/auth/login', credentials, true)
      return normalizeAuthResponse(data)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const { data } = await api.post('/auth/register', userData, true)
      return normalizeAuthResponse(data)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  },


  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const { data } = await api.post('/auth/refresh', { refreshToken })
    return normalizeAuthResponse(data)
  },

}

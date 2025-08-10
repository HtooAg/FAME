'use client'

import { createContext, useContext } from 'react'
import { useMockAuth } from '@/hooks/use-mock-auth'

interface User {
  id: string
  email: string
  role: 'super_admin' | 'stage_manager' | 'artist' | 'dj' | 'mc' | 'graphics'
  name: string
  eventId?: string
  accountStatus?: string
  subscriptionStatus?: string
  subscriptionEndDate?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: any) => Promise<boolean>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMockAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a MockAuthProvider')
  }
  return context
}

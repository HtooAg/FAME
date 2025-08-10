'use client'

import { useState, useEffect } from 'react'
import { mockUsers } from '@/lib/mock-data'

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

export function useMockAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate checking for existing session
    const savedUser = localStorage.getItem('mock-user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock login logic
    const foundUser = mockUsers.find(u => u.email === email)
    
    if (foundUser && (
      (email === 'admin@fame.com' && password === 'admin123') ||
      (email === 'sarah@fame.com' && password === 'stage123') ||
      (email === 'mike@fame.com' && password === 'mike123') ||
      (email === 'lisa@fame.com' && password === 'lisa123')
    )) {
      // Check if account is active
      if (foundUser.accountStatus === 'suspended' || foundUser.accountStatus === 'deactivated') {
        return false
      }

      const userSession = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role as any,
        eventId: foundUser.eventId,
        accountStatus: foundUser.accountStatus,
        subscriptionStatus: foundUser.subscriptionStatus,
        subscriptionEndDate: foundUser.subscriptionEndDate
      }
      
      setUser(userSession)
      localStorage.setItem('mock-user', JSON.stringify(userSession))
      
      // Update last login
      const userIndex = mockUsers.findIndex(u => u.id === foundUser.id)
      if (userIndex !== -1) {
        mockUsers[userIndex].lastLogin = new Date().toISOString()
      }
      
      return true
    }
    
    return false
  }

  const register = async (userData: any): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Mock registration - always succeeds for demo
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('mock-user')
  }

  return {
    user,
    login,
    logout,
    register,
    loading
  }
}

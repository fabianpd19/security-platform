"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { SecurityDashboard } from "@/components/dashboard/security-dashboard"
import { AuthService, type AuthResult } from "@/lib/auth/auth-service"

interface User {
  id: string
  email: string
  name: string
  roles: string[]
  attributes: Record<string, string>
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, mfaCode?: string) => Promise<boolean>
  logout: () => void
  enableMFA: (secret: string) => Promise<boolean>
  disableMFA: () => Promise<boolean>
  isLoading: boolean
  requiresMFA: boolean
  loginAttempts: number
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requiresMFA, setRequiresMFA] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateSession = async () => {
      try {
        const validatedUser = await AuthService.validateSession()
        if (validatedUser) {
          setUser(validatedUser)
        }
      } catch (error) {
        console.error("Session validation failed:", error)
      }

      setIsLoading(false)
    }

    validateSession()
  }, [])

  const login = async (email: string, password: string, mfaCode?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const result: AuthResult = await AuthService.login(email, password, mfaCode)

      if (result.success && result.user) {
        setUser(result.user)
        setPendingUser(null)
        setRequiresMFA(false)
        setLoginAttempts(0)
        setIsLoading(false)
        return true
      }

      if (result.requiresMFA) {
        setRequiresMFA(true)
        setIsLoading(false)
        return false
      }

      setError(result.error || "Login failed")
      setLoginAttempts((prev) => prev + 1)
      setIsLoading(false)
      return false
    } catch (error) {
      console.error("Login error:", error)
      setError("Authentication failed")
      setLoginAttempts((prev) => prev + 1)
      setIsLoading(false)
      return false
    }
  }

  const enableMFA = async (secret: string): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await AuthService.enableMFA(user.id, secret)
      if (success) {
        setUser((prev) => (prev ? { ...prev, mfaEnabled: true } : null))
      }
      return success
    } catch (error) {
      console.error("Enable MFA error:", error)
      return false
    }
  }

  const disableMFA = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await AuthService.disableMFA(user.id)
      if (success) {
        setUser((prev) => (prev ? { ...prev, mfaEnabled: false } : null))
      }
      return success
    } catch (error) {
      console.error("Disable MFA error:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      await AuthService.logout()
    } catch (error) {
      console.error("Logout error:", error)
    }

    setUser(null)
    setPendingUser(null)
    setRequiresMFA(false)
    setError(null)
  }

  if (user) {
    return <SecurityDashboard user={user} onLogout={logout} enableMFA={enableMFA} disableMFA={disableMFA} />
  }

  return (
    <AuthContext.Provider
      value={{
        user: pendingUser,
        login,
        logout,
        enableMFA,
        disableMFA,
        isLoading,
        requiresMFA,
        loginAttempts,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

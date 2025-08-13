export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user" | "moderator"
  permissions: Permission[]
  mfaEnabled: boolean
  lastLogin: Date
  failedAttempts: number
  isLocked: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  resource: string
  action: "read" | "write" | "delete" | "manage"
  scope: "own" | "all" | "department"
  conditions?: Record<string, any>
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress: string
  userAgent: string
  isActive: boolean
  createdAt: Date
}

export interface SecurityEvent {
  id: string
  type: "login_success" | "login_failed" | "logout" | "mfa_enabled" | "password_changed"
  userId?: string
  ipAddress: string
  userAgent: string
  details: Record<string, any>
  timestamp: Date
}

export interface ABACPolicy {
  id: string
  name: string
  description: string
  subject: Record<string, any> // User attributes
  resource: Record<string, any> // Resource attributes
  action: string
  environment: Record<string, any> // Context attributes
  effect: "allow" | "deny"
  priority: number
}

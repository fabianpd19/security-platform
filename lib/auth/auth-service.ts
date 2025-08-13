export interface AuthResult {
  success: boolean
  user?: any
  requiresMFA?: boolean
  error?: string
  sessionToken?: string
}

export class AuthService {
  static async login(
    email: string,
    password: string,
    mfaCode?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          mfaCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresMFA) {
          return { success: false, requiresMFA: true }
        }
        return {
          success: true,
          user: data.user,
          sessionToken: data.sessionToken,
        }
      }

      return { success: false, error: data.error || "Login failed" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Authentication failed" }
    }
  }

  static async validateSession(sessionToken?: string): Promise<any | null> {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        return data.user
      }

      return null
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  static async logout(sessionToken?: string, userId?: string): Promise<void> {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  static async enableMFA(userId: string, secret: string): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "enable",
          secret,
        }),
      })

      return response.ok
    } catch (error) {
      console.error("Enable MFA error:", error)
      return false
    }
  }

  static async disableMFA(userId: string): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "disable",
        }),
      })

      return response.ok
    } catch (error) {
      console.error("Disable MFA error:", error)
      return false
    }
  }
}

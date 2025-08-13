import type { ABACPolicy, User } from "@/lib/types/security"

export type { ABACPolicy }

export interface PolicyContext {
  user: User
  resource: {
    type: string
    id?: string
    owner?: string
    department?: string
    classification?: "public" | "internal" | "confidential" | "secret"
  }
  action: string
  environment: {
    time: Date
    ipAddress?: string
    userAgent?: string
    location?: string
    mfaVerified?: boolean
  }
}

export interface PolicyEvaluationResult {
  decision: "allow" | "deny"
  matchedPolicies: ABACPolicy[]
  reason: string
}

// Default ABAC policies for the security platform
export const defaultPolicies: ABACPolicy[] = [
  {
    id: "admin-full-access",
    name: "Admin Full Access",
    description: "Administrators have full access to all resources",
    subject: { role: "admin" },
    resource: { type: "*" },
    action: "*",
    environment: {},
    effect: "allow",
    priority: 100,
  },
  {
    id: "user-own-data",
    name: "User Own Data Access",
    description: "Users can read and write their own data",
    subject: { role: "user" },
    resource: { type: "user-data" },
    action: "read|write",
    environment: {},
    effect: "allow",
    priority: 50,
  },
  {
    id: "mfa-required-sensitive",
    name: "MFA Required for Sensitive Operations",
    description: "MFA verification required for sensitive operations",
    subject: {},
    resource: { classification: "confidential|secret" },
    action: "write|delete",
    environment: { mfaVerified: false },
    effect: "deny",
    priority: 90,
  },
  {
    id: "business-hours-only",
    name: "Business Hours Access Only",
    description: "Sensitive operations only during business hours",
    subject: { role: "user" },
    resource: { classification: "confidential" },
    action: "write|delete",
    environment: {},
    effect: "deny",
    priority: 70,
  },
  {
    id: "block-suspicious-ip",
    name: "Block Suspicious IP Addresses",
    description: "Block access from known suspicious IP ranges",
    subject: {},
    resource: { type: "*" },
    action: "*",
    environment: {},
    effect: "deny",
    priority: 95,
  },
]

export class ABACPolicyEngine {
  private policies: ABACPolicy[] = []

  constructor(policies: ABACPolicy[] = defaultPolicies) {
    this.policies = [...policies].sort((a, b) => b.priority - a.priority)
  }

  addPolicy(policy: ABACPolicy): void {
    this.policies.push(policy)
    this.policies.sort((a, b) => b.priority - a.priority)
  }

  removePolicy(policyId: string): void {
    this.policies = this.policies.filter((p) => p.id !== policyId)
  }

  updatePolicy(policyId: string, updates: Partial<ABACPolicy>): void {
    const index = this.policies.findIndex((p) => p.id === policyId)
    if (index !== -1) {
      this.policies[index] = { ...this.policies[index], ...updates }
      this.policies.sort((a, b) => b.priority - a.priority)
    }
  }

  getPolicies(): ABACPolicy[] {
    return [...this.policies]
  }

  evaluate(context: PolicyContext): PolicyEvaluationResult {
    const matchedPolicies: ABACPolicy[] = []
    let finalDecision: "allow" | "deny" = "deny" // Default deny
    let reason = "No matching policies found"

    // Evaluate policies in priority order
    for (const policy of this.policies) {
      if (this.matchesPolicy(policy, context)) {
        matchedPolicies.push(policy)

        if (policy.effect === "deny") {
          // Deny takes precedence
          finalDecision = "deny"
          reason = `Denied by policy: ${policy.name}`
          break
        } else if (policy.effect === "allow" && finalDecision !== "deny") {
          finalDecision = "allow"
          reason = `Allowed by policy: ${policy.name}`
        }
      }
    }

    return {
      decision: finalDecision,
      matchedPolicies,
      reason,
    }
  }

  private matchesPolicy(policy: ABACPolicy, context: PolicyContext): boolean {
    return (
      this.matchesAttributes(policy.subject, this.getUserAttributes(context.user)) &&
      this.matchesAttributes(policy.resource, context.resource) &&
      this.matchesAction(policy.action, context.action) &&
      this.matchesEnvironment(policy.environment, context.environment)
    )
  }

  private getUserAttributes(user: User): Record<string, any> {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      mfaEnabled: user.mfaEnabled,
      department: this.extractDepartmentFromEmail(user.email),
    }
  }

  private extractDepartmentFromEmail(email: string): string {
    // Simple department extraction from email domain
    const domain = email.split("@")[1]
    if (domain === "security.com") return "security"
    if (domain === "admin.com") return "admin"
    return "general"
  }

  private matchesAttributes(policyAttrs: Record<string, any>, contextAttrs: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(policyAttrs)) {
      if (value === "*") continue // Wildcard matches anything

      const contextValue = contextAttrs[key]

      if (typeof value === "string" && value.includes("|")) {
        // Handle OR conditions (e.g., "read|write")
        const allowedValues = value.split("|")
        if (!allowedValues.includes(contextValue)) {
          return false
        }
      } else if (Array.isArray(value)) {
        // Handle array values
        if (!value.includes(contextValue)) {
          return false
        }
      } else if (value !== contextValue) {
        return false
      }
    }
    return true
  }

  private matchesAction(policyAction: string, contextAction: string): boolean {
    if (policyAction === "*") return true
    if (policyAction.includes("|")) {
      return policyAction.split("|").includes(contextAction)
    }
    return policyAction === contextAction
  }

  private matchesEnvironment(policyEnv: Record<string, any>, contextEnv: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(policyEnv)) {
      const contextValue = contextEnv[key]

      if (key === "time" && typeof value === "object") {
        // Handle time-based conditions
        if (!this.matchesTimeCondition(value, contextEnv.time)) {
          return false
        }
      } else if (key === "ipAddress" && typeof value === "string") {
        // Handle IP address patterns
        if (!this.matchesIPPattern(value, contextValue)) {
          return false
        }
      } else if (value !== contextValue) {
        return false
      }
    }
    return true
  }

  private matchesTimeCondition(timeCondition: any, currentTime: Date): boolean {
    const hour = currentTime.getHours()
    const day = currentTime.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Business hours: Monday-Friday, 9 AM - 5 PM
    if (timeCondition.businessHours) {
      return day >= 1 && day <= 5 && hour >= 9 && hour < 17
    }

    return true
  }

  private matchesIPPattern(pattern: string, ip?: string): boolean {
    if (!ip) return false

    // Simple IP pattern matching (in production, use proper CIDR matching)
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"))
      return regex.test(ip)
    }

    return pattern === ip
  }
}

// Global policy engine instance
export const policyEngine = new ABACPolicyEngine()

// Permission checking utility
export function checkPermission(
  user: User,
  resource: { type: string; id?: string; owner?: string; classification?: string },
  action: string,
  environment: { ipAddress?: string; userAgent?: string; mfaVerified?: boolean } = {},
): PolicyEvaluationResult {
  const context: PolicyContext = {
    user,
    resource,
    action,
    environment: {
      time: new Date(),
      mfaVerified: user.mfaEnabled,
      ...environment,
    },
  }

  return policyEngine.evaluate(context)
}

// Middleware for protecting routes/actions
export function requirePermission(
  resource: { type: string; id?: string; owner?: string; classification?: string },
  action: string,
) {
  return (user: User, environment: Record<string, any> = {}) => {
    const result = checkPermission(user, resource, action, environment)

    if (result.decision === "deny") {
      throw new Error(`Access denied: ${result.reason}`)
    }

    return result
  }
}

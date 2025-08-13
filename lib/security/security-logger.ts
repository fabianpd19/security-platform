export interface SecurityEvent {
  id: string
  event_type: string
  severity: "low" | "medium" | "high" | "critical"
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  resource: string | null
  action: string | null
  details: Record<string, any>
  timestamp: Date
}

export interface SecurityAlert {
  id: string
  type: "brute_force" | "suspicious_pattern" | "privilege_escalation" | "data_breach" | "system_compromise"
  severity: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  affectedUser?: string
  sourceIP?: string
  timestamp: Date
  isActive: boolean
  resolvedAt?: Date
  resolvedBy?: string
  actions: string[]
}

export interface SecurityPattern {
  pattern: string
  description: string
  threshold: number
  timeWindow: number // minutes
  severity: "critical" | "high" | "medium" | "low"
  actions: string[]
}

export class SecurityLogger {
  private static instance: SecurityLogger
  private alertCallbacks: Array<(alert: SecurityAlert) => void> = []

  // Security patterns to detect
  private readonly patterns: SecurityPattern[] = [
    {
      pattern: "failed_login_burst",
      description: "Multiple failed login attempts from same IP",
      threshold: 5,
      timeWindow: 10,
      severity: "high",
      actions: ["block_ip", "notify_admin", "increase_monitoring"],
    },
    {
      pattern: "privilege_escalation",
      description: "Attempts to access restricted resources",
      threshold: 3,
      timeWindow: 5,
      severity: "critical",
      actions: ["block_user", "notify_admin", "audit_permissions"],
    },
    {
      pattern: "suspicious_user_agent",
      description: "Automated tools or suspicious user agents detected",
      threshold: 10,
      timeWindow: 30,
      severity: "medium",
      actions: ["increase_monitoring", "require_captcha"],
    },
    {
      pattern: "rapid_requests",
      description: "Unusually high request rate from single source",
      threshold: 100,
      timeWindow: 5,
      severity: "high",
      actions: ["rate_limit", "block_ip", "notify_admin"],
    },
    {
      pattern: "off_hours_access",
      description: "Access attempts outside business hours",
      threshold: 1,
      timeWindow: 60,
      severity: "medium",
      actions: ["require_mfa", "notify_admin"],
    },
  ]

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger()
    }
    return SecurityLogger.instance
  }

  async logEvent(eventData: {
    event_type: string
    severity: "critical" | "high" | "medium" | "low"
    user_id?: string
    ip_address?: string
    user_agent?: string
    resource?: string
    action?: string
    details?: Record<string, any>
  }): Promise<void> {
    try {
      // Store event in database via API
      const response = await fetch("/api/security/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error(`Failed to log security event: ${response.statusText}`)
      }

      const event = await response.json()

      // Analyze patterns and generate alerts
      await this.analyzePatterns(event)

      // Log to console for immediate visibility
      console.log(`[SECURITY] ${eventData.severity.toUpperCase()}: ${eventData.event_type}`, {
        user: eventData.user_id,
        ip: eventData.ip_address,
        resource: eventData.resource,
        action: eventData.action,
        details: eventData.details,
      })

      // Send to external monitoring systems if configured
      await this.sendToExternalSystems(event)
    } catch (error) {
      console.error("Failed to log security event:", error)
    }
  }

  // Analyze security patterns and generate alerts
  private async analyzePatterns(event: any): Promise<void> {
    for (const pattern of this.patterns) {
      const shouldAlert = await this.checkPattern(pattern, event)
      if (shouldAlert) {
        await this.generateAlert(pattern, event)
      }
    }
  }

  private async checkPattern(pattern: SecurityPattern, event: any): Promise<boolean> {
    const timeWindow = new Date(Date.now() - pattern.timeWindow * 60 * 1000)

    try {
      switch (pattern.pattern) {
        case "failed_login_burst":
          if (event.event_type === "failed_login" && event.ip_address) {
            const response = await fetch(`/api/security/events?type=failed_login&limit=100`)
            if (!response.ok) return false

            const recentFailures = await response.json()
            const ipFailures = recentFailures.filter(
              (e: any) => e.ip_address === event.ip_address && new Date(e.timestamp) > timeWindow,
            )
            return ipFailures.length >= pattern.threshold
          }
          break

        case "privilege_escalation":
          if (event.event_type === "access_denied" && event.details?.reason === "insufficient_permissions") {
            const response = await fetch(`/api/security/events?limit=50`)
            if (!response.ok) return false

            const recentAttempts = await response.json()
            const escalationAttempts = recentAttempts.filter(
              (e: any) =>
                e.user_id === event.user_id && e.event_type === "access_denied" && new Date(e.timestamp) > timeWindow,
            )
            return escalationAttempts.length >= pattern.threshold
          }
          break

        case "suspicious_user_agent":
          if (event.user_agent) {
            const suspiciousAgents = ["curl", "wget", "python", "bot", "crawler", "scanner"]
            const isSuspicious = suspiciousAgents.some((agent) => event.user_agent?.toLowerCase().includes(agent))
            if (isSuspicious) {
              const response = await fetch(`/api/security/events?limit=100`)
              if (!response.ok) return false

              const recentEvents = await response.json()
              const suspiciousEvents = recentEvents.filter(
                (e: any) => e.ip_address === event.ip_address && new Date(e.timestamp) > timeWindow,
              )
              return suspiciousEvents.length >= pattern.threshold
            }
          }
          break

        case "rapid_requests":
          if (event.ip_address) {
            const response = await fetch(`/api/security/events?limit=200`)
            if (!response.ok) return false

            const recentEvents = await response.json()
            const ipEvents = recentEvents.filter(
              (e: any) => e.ip_address === event.ip_address && new Date(e.timestamp) > timeWindow,
            )
            return ipEvents.length >= pattern.threshold
          }
          break

        case "off_hours_access":
          const hour = new Date(event.timestamp).getHours()
          const isOffHours = hour < 8 || hour > 18 // Outside 8 AM - 6 PM
          if (isOffHours && event.event_type === "successful_login") {
            return true
          }
          break
      }
    } catch (error) {
      console.error(`Error checking pattern ${pattern.pattern}:`, error)
    }

    return false
  }

  private async generateAlert(pattern: SecurityPattern, event: any): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapPatternToAlertType(pattern.pattern),
      severity: pattern.severity,
      title: `Security Alert: ${pattern.description}`,
      description: `Pattern "${pattern.pattern}" detected. ${pattern.description}`,
      affectedUser: event.user_id || undefined,
      sourceIP: event.ip_address || undefined,
      timestamp: new Date(),
      isActive: true,
      actions: pattern.actions,
    }

    // Store alert (you could create an alerts table)
    console.warn(`[SECURITY ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`, alert)

    // Notify registered callbacks
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert)
      } catch (error) {
        console.error("Alert callback failed:", error)
      }
    })

    // Execute automatic actions
    await this.executeAlertActions(alert, event)
  }

  private mapPatternToAlertType(pattern: string): SecurityAlert["type"] {
    switch (pattern) {
      case "failed_login_burst":
        return "brute_force"
      case "privilege_escalation":
        return "privilege_escalation"
      case "suspicious_user_agent":
        return "suspicious_pattern"
      case "rapid_requests":
        return "suspicious_pattern"
      case "off_hours_access":
        return "suspicious_pattern"
      default:
        return "suspicious_pattern"
    }
  }

  private async executeAlertActions(alert: SecurityAlert, event: any): Promise<void> {
    for (const action of alert.actions) {
      try {
        switch (action) {
          case "block_ip":
            await this.blockIP(alert.sourceIP!)
            break
          case "block_user":
            if (alert.affectedUser) {
              await this.blockUser(alert.affectedUser)
            }
            break
          case "notify_admin":
            await this.notifyAdmins(alert)
            break
          case "require_mfa":
            await this.requireMFAForUser(alert.affectedUser!)
            break
          case "increase_monitoring":
            await this.increaseMonitoring(alert.sourceIP!)
            break
          case "rate_limit":
            await this.applyRateLimit(alert.sourceIP!)
            break
          case "require_captcha":
            await this.requireCaptcha(alert.sourceIP!)
            break
        }
      } catch (error) {
        console.error(`Failed to execute action ${action}:`, error)
      }
    }
  }

  // Action implementations
  private async blockIP(ip: string): Promise<void> {
    console.log(`[ACTION] Blocking IP: ${ip}`)
    // Implementation would add IP to blocklist
    await this.logEvent({
      event_type: "ip_blocked",
      severity: "medium",
      ip_address: ip,
      resource: "security",
      action: "block_ip",
      details: { reason: "security_alert", blocked_ip: ip },
    })
  }

  private async blockUser(userId: string): Promise<void> {
    console.log(`[ACTION] Blocking user: ${userId}`)
    // Implementation would disable user account
    await this.logEvent({
      event_type: "user_blocked",
      severity: "high",
      user_id: userId,
      resource: "security",
      action: "block_user",
      details: { reason: "security_alert" },
    })
  }

  private async notifyAdmins(alert: SecurityAlert): Promise<void> {
    console.log(`[ACTION] Notifying admins about: ${alert.title}`)
    // Implementation would send notifications to admin users
    await this.logEvent({
      event_type: "admin_notification_sent",
      severity: "low",
      resource: "security",
      action: "notify_admin",
      details: { alert_id: alert.id, alert_type: alert.type },
    })
  }

  private async requireMFAForUser(userId: string): Promise<void> {
    console.log(`[ACTION] Requiring MFA for user: ${userId}`)
    // Implementation would force MFA requirement
  }

  private async increaseMonitoring(ip: string): Promise<void> {
    console.log(`[ACTION] Increasing monitoring for IP: ${ip}`)
    // Implementation would add IP to enhanced monitoring list
  }

  private async applyRateLimit(ip: string): Promise<void> {
    console.log(`[ACTION] Applying rate limit to IP: ${ip}`)
    // Implementation would add IP to rate limiting
  }

  private async requireCaptcha(ip: string): Promise<void> {
    console.log(`[ACTION] Requiring CAPTCHA for IP: ${ip}`)
    // Implementation would add IP to CAPTCHA requirement list
  }

  // Send events to external monitoring systems
  private async sendToExternalSystems(event: any): Promise<void> {
    // Integration with external systems like Splunk, ELK Stack, etc.
    if (process.env.EXTERNAL_LOGGING_ENDPOINT) {
      try {
        await fetch(process.env.EXTERNAL_LOGGING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: event.timestamp,
            level: event.severity,
            message: event.event_type,
            metadata: {
              user_id: event.user_id,
              ip_address: event.ip_address,
              user_agent: event.user_agent,
              resource: event.resource,
              action: event.action,
              details: event.details,
            },
          }),
        })
      } catch (error) {
        console.error("Failed to send to external logging system:", error)
      }
    }
  }

  // Register alert callback
  onAlert(callback: (alert: SecurityAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  async getSecurityMetrics(timeRange = 24): Promise<{
    totalEvents: number
    eventsBySeverity: Record<string, number>
    eventsByType: Record<string, number>
    topSourceIPs: Array<{ ip: string; count: number }>
    alertsGenerated: number
  }> {
    try {
      const response = await fetch(`/api/security/events?limit=1000`)
      if (!response.ok) {
        throw new Error("Failed to fetch security events")
      }

      const events = await response.json()
      const since = new Date(Date.now() - timeRange * 60 * 60 * 1000)
      const recentEvents = events.filter((e: any) => new Date(e.timestamp) > since)

      const eventsBySeverity: Record<string, number> = {}
      const eventsByType: Record<string, number> = {}
      const ipCounts: Record<string, number> = {}

      recentEvents.forEach((event: any) => {
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
        eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1

        if (event.ip_address) {
          ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1
        }
      })

      const topSourceIPs = Object.entries(ipCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }))

      return {
        totalEvents: recentEvents.length,
        eventsBySeverity,
        eventsByType,
        topSourceIPs,
        alertsGenerated: recentEvents.filter((e: any) => e.event_type.includes("alert")).length,
      }
    } catch (error) {
      console.error("Failed to get security metrics:", error)
      return {
        totalEvents: 0,
        eventsBySeverity: {},
        eventsByType: {},
        topSourceIPs: [],
        alertsGenerated: 0,
      }
    }
  }

  // Clean up old events (log rotation)
  async rotateEvents(retentionDays = 90): Promise<void> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    try {
      // Archive old events before deletion (implementation would export to file/external storage)
      console.log(`[LOG ROTATION] Archiving events older than ${cutoffDate.toISOString()}`)

      // Delete old events from database
      // Implementation would delete events older than cutoffDate

      await this.logEvent({
        event_type: "log_rotation_completed",
        severity: "low",
        resource: "system",
        action: "rotate_logs",
        details: { retention_days: retentionDays, cutoff_date: cutoffDate },
      })
    } catch (error) {
      console.error("Log rotation failed:", error)
    }
  }
}

// Global security logger instance
export const securityLogger = SecurityLogger.getInstance()

// Convenience functions
export async function logSecurityEvent(eventData: {
  event_type: string
  severity: "critical" | "high" | "medium" | "low"
  user_id?: string
  ip_address?: string
  user_agent?: string
  resource?: string
  action?: string
  details?: Record<string, any>
}): Promise<void> {
  await securityLogger.logEvent(eventData)
}

export function onSecurityAlert(callback: (alert: SecurityAlert) => void): void {
  securityLogger.onAlert(callback)
}

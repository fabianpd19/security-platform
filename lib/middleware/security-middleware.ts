import { type NextRequest, NextResponse } from "next/server"
import { securityLogger } from "@/lib/security/security-logger"

export interface SecurityMiddlewareConfig {
  enableLogging: boolean
  enableRateLimit: boolean
  enableIPBlocking: boolean
  rateLimitRequests: number
  rateLimitWindow: number // minutes
  blockedIPs: string[]
  trustedIPs: string[]
}

const defaultConfig: SecurityMiddlewareConfig = {
  enableLogging: true,
  enableRateLimit: true,
  enableIPBlocking: true,
  rateLimitRequests: 100,
  rateLimitWindow: 15,
  blockedIPs: [],
  trustedIPs: ["127.0.0.1", "::1"],
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const blockedIPs = new Set<string>()

export function createSecurityMiddleware(config: Partial<SecurityMiddlewareConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }

  return async function securityMiddleware(request: NextRequest) {
    const ip = getClientIP(request)
    const userAgent = request.headers.get("user-agent") || "unknown"
    const path = request.nextUrl.pathname
    const method = request.method

    try {
      // Check if IP is blocked
      if (finalConfig.enableIPBlocking && (blockedIPs.has(ip) || finalConfig.blockedIPs.includes(ip))) {
        await securityLogger.logEvent({
          event_type: "blocked_ip_access_attempt",
          severity: "high",
          ip_address: ip,
          user_agent: userAgent,
          resource: path,
          action: method.toLowerCase(),
          details: { reason: "ip_blocked" },
        })

        return new NextResponse("Access Denied", { status: 403 })
      }

      // Rate limiting
      if (finalConfig.enableRateLimit && !finalConfig.trustedIPs.includes(ip)) {
        const rateLimitKey = `${ip}:${Math.floor(Date.now() / (finalConfig.rateLimitWindow * 60 * 1000))}`
        const current = rateLimitStore.get(rateLimitKey) || {
          count: 0,
          resetTime: Date.now() + finalConfig.rateLimitWindow * 60 * 1000,
        }

        current.count++
        rateLimitStore.set(rateLimitKey, current)

        if (current.count > finalConfig.rateLimitRequests) {
          await securityLogger.logEvent({
            event_type: "rate_limit_exceeded",
            severity: "medium",
            ip_address: ip,
            user_agent: userAgent,
            resource: path,
            action: method.toLowerCase(),
            details: {
              requests: current.count,
              limit: finalConfig.rateLimitRequests,
              window_minutes: finalConfig.rateLimitWindow,
            },
          })

          return new NextResponse("Rate Limit Exceeded", {
            status: 429,
            headers: {
              "Retry-After": Math.ceil((current.resetTime - Date.now()) / 1000).toString(),
            },
          })
        }
      }

      // Log request if enabled
      if (finalConfig.enableLogging) {
        // Only log sensitive endpoints
        const sensitiveEndpoints = ["/api/auth", "/api/admin", "/api/security"]
        const isSensitive = sensitiveEndpoints.some((endpoint) => path.startsWith(endpoint))

        if (isSensitive) {
          await securityLogger.logEvent({
            event_type: "api_request",
            severity: "low",
            ip_address: ip,
            user_agent: userAgent,
            resource: path,
            action: method.toLowerCase(),
            details: {
              endpoint: path,
              method,
              timestamp: new Date().toISOString(),
            },
          })
        }
      }

      // Detect suspicious patterns
      await detectSuspiciousActivity(request, ip, userAgent)

      return NextResponse.next()
    } catch (error) {
      console.error("Security middleware error:", error)

      await securityLogger.logEvent({
        event_type: "middleware_error",
        severity: "medium",
        ip_address: ip,
        user_agent: userAgent,
        resource: path,
        action: method.toLowerCase(),
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      })

      return NextResponse.next()
    }
  }
}

async function detectSuspiciousActivity(request: NextRequest, ip: string, userAgent: string): Promise<void> {
  const path = request.nextUrl.pathname
  const method = request.method

  // Detect SQL injection attempts
  const sqlInjectionPatterns = [
    /(%27)|(')|(--)|(%23)|(#)/i,
    /((%3D)|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))/i,
    /\w*((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/i,
    /((%27)|('))union/i,
  ]

  const queryString = request.nextUrl.search
  const isSQLInjection = sqlInjectionPatterns.some((pattern) => pattern.test(queryString) || pattern.test(path))

  if (isSQLInjection) {
    await securityLogger.logEvent({
      event_type: "sql_injection_attempt",
      severity: "critical",
      ip_address: ip,
      user_agent: userAgent,
      resource: path,
      action: method.toLowerCase(),
      details: {
        query_string: queryString,
        detected_pattern: "sql_injection",
      },
    })
  }

  // Detect XSS attempts
  const xssPatterns = [/<script[^>]*>.*?<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi, /<iframe[^>]*>.*?<\/iframe>/gi]

  const isXSS = xssPatterns.some((pattern) => pattern.test(queryString) || pattern.test(path))

  if (isXSS) {
    await securityLogger.logEvent({
      event_type: "xss_attempt",
      severity: "high",
      ip_address: ip,
      user_agent: userAgent,
      resource: path,
      action: method.toLowerCase(),
      details: {
        query_string: queryString,
        detected_pattern: "xss",
      },
    })
  }

  // Detect directory traversal attempts
  const directoryTraversalPatterns = [/\.\.\//g, /\.\.\\/g, /%2e%2e%2f/gi, /%2e%2e%5c/gi]

  const isDirectoryTraversal = directoryTraversalPatterns.some(
    (pattern) => pattern.test(path) || pattern.test(queryString),
  )

  if (isDirectoryTraversal) {
    await securityLogger.logEvent({
      event_type: "directory_traversal_attempt",
      severity: "high",
      ip_address: ip,
      user_agent: userAgent,
      resource: path,
      action: method.toLowerCase(),
      details: {
        detected_pattern: "directory_traversal",
      },
    })
  }

  // Detect bot/crawler activity
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /scanner/i,
    /test/i,
    /monitor/i,
  ]

  const isBot = botPatterns.some((pattern) => pattern.test(userAgent))

  if (isBot && !path.includes("/robots.txt") && !path.includes("/sitemap")) {
    await securityLogger.logEvent({
      event_type: "bot_activity_detected",
      severity: "low",
      ip_address: ip,
      user_agent: userAgent,
      resource: path,
      action: method.toLowerCase(),
      details: {
        detected_pattern: "bot_user_agent",
        user_agent: userAgent,
      },
    })
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const remoteAddr = request.headers.get("remote-addr")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (remoteAddr) {
    return remoteAddr
  }

  return "unknown"
}

// Export functions to manage blocked IPs
export function blockIP(ip: string): void {
  blockedIPs.add(ip)
}

export function unblockIP(ip: string): void {
  blockedIPs.delete(ip)
}

export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs)
}

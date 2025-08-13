import { createSecurityMiddleware } from "@/lib/middleware/security-middleware"

// Create security middleware with custom configuration
const securityMiddleware = createSecurityMiddleware({
  enableLogging: true,
  enableRateLimit: true,
  enableIPBlocking: true,
  rateLimitRequests: 100,
  rateLimitWindow: 15, // 15 minutes
  trustedIPs: ["127.0.0.1", "::1"], // localhost
})

export async function middleware(request: any) {
  return await securityMiddleware(request)
}

export const config = {
  matcher: [
    // Match all request paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}

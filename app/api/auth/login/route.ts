import { type NextRequest, NextResponse } from "next/server"
import { UserModel } from "@/lib/database/models/user"
import { SessionModel } from "@/lib/database/models/session"
import { SecurityEventModel } from "@/lib/database/models/security-event"
import { MFAModel } from "@/lib/database/models/mfa"
import { verifyTOTP } from "@/lib/crypto/totp"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email, password, mfaCode } = await request.json()
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Find user
    const user = await UserModel.findByEmail(email)
    if (!user) {
      await SecurityEventModel.create({
        event_type: "login_failed",
        severity: "medium",
        ip_address: ip,
        user_agent: userAgent,
        details: { reason: "user_not_found", email },
      })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if account is locked
    if (await UserModel.isAccountLocked(user)) {
      await SecurityEventModel.create({
        event_type: "login_blocked",
        severity: "high",
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        details: { reason: "account_locked" },
      })
      return NextResponse.json({ error: "Account is locked" }, { status: 423 })
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password)
    if (!isValidPassword) {
      await UserModel.incrementFailedAttempts(user.id)
      await SecurityEventModel.create({
        event_type: "login_failed",
        severity: "medium",
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        details: { reason: "invalid_password" },
      })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check MFA if enabled
    const mfa = await MFAModel.findByUserId(user.id)
    if (mfa?.is_enabled) {
      if (!mfaCode) {
        return NextResponse.json({ requiresMFA: true }, { status: 200 })
      }

      const isValidMFA = verifyTOTP(mfa.secret, mfaCode)
      if (!isValidMFA) {
        await SecurityEventModel.create({
          event_type: "mfa_failed",
          severity: "high",
          user_id: user.id,
          ip_address: ip,
          user_agent: userAgent,
          details: { reason: "invalid_mfa_code" },
        })
        return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 })
      }

      await MFAModel.updateLastUsed(user.id)
    }

    // Create session
    const sessionToken = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await SessionModel.create({
      user_id: user.id,
      session_token: sessionToken,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    })

    await UserModel.updateLastLogin(user.id)
    await SecurityEventModel.create({
      event_type: "login_success",
      severity: "low",
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      details: { mfa_used: !!mfa?.is_enabled },
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      sessionToken,
    })

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { SessionModel } from "@/lib/database/models/session"
import { UserModel } from "@/lib/database/models/user"
import { MFAModel } from "@/lib/database/models/mfa"
import { SecurityEventModel } from "@/lib/database/models/security-event"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { action, secret } = await request.json()
    const sessionToken = request.cookies.get("session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await SessionModel.findByToken(sessionToken)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const user = await UserModel.findById(session.user_id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (action === "enable") {
      const existingMFA = await MFAModel.findByUserId(user.id)

      if (existingMFA) {
        await MFAModel.enable(user.id)
      } else {
        const backupCodes = Array.from({ length: 10 }, () => randomBytes(4).toString("hex").toUpperCase())

        await MFAModel.create({
          user_id: user.id,
          secret,
          backup_codes: backupCodes,
        })
        await MFAModel.enable(user.id)
      }

      await SecurityEventModel.create({
        event_type: "mfa_enabled",
        severity: "low",
        user_id: user.id,
        resource: "security",
        action: "enable_mfa",
      })

      return NextResponse.json({ success: true })
    }

    if (action === "disable") {
      await MFAModel.disable(user.id)

      await SecurityEventModel.create({
        event_type: "mfa_disabled",
        severity: "medium",
        user_id: user.id,
        resource: "security",
        action: "disable_mfa",
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("MFA operation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

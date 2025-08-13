import { type NextRequest, NextResponse } from "next/server"
import { SessionModel } from "@/lib/database/models/session"
import { UserModel } from "@/lib/database/models/user"

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const session = await SessionModel.findByToken(sessionToken)
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const user = await UserModel.findByIdWithRoles(session.user_id)
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value

    if (sessionToken) {
      await SessionModel.deleteByToken(sessionToken)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("session_token")
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { SecurityEventModel } from "@/lib/database/models/security-event"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const type = searchParams.get("type")
    const severity = searchParams.get("severity")

    let events
    if (type) {
      events = await SecurityEventModel.getEventsByType(type, limit)
    } else if (severity) {
      events = await SecurityEventModel.getEventsBySeverity(severity, limit)
    } else {
      events = await SecurityEventModel.getRecentEvents(limit)
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Get security events error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json()
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const event = await SecurityEventModel.create({
      ...eventData,
      ip_address: eventData.ip_address || ip,
      user_agent: eventData.user_agent || userAgent,
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error("Create security event error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { sql } from "../connection"

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

export class SecurityEventModel {
  static async create(eventData: {
    event_type: string
    severity: "low" | "medium" | "high" | "critical"
    user_id?: string
    ip_address?: string
    user_agent?: string
    resource?: string
    action?: string
    details?: Record<string, any>
  }): Promise<SecurityEvent> {
    const result = await sql`
      INSERT INTO security_events (event_type, severity, user_id, ip_address, user_agent, resource, action, details)
      VALUES (
        ${eventData.event_type}, 
        ${eventData.severity}, 
        ${eventData.user_id || null}, 
        ${eventData.ip_address || null}, 
        ${eventData.user_agent || null}, 
        ${eventData.resource || null}, 
        ${eventData.action || null}, 
        ${JSON.stringify(eventData.details || {})}
      )
      RETURNING *
    `
    return result[0] as SecurityEvent
  }

  static async getRecentEvents(limit = 50): Promise<SecurityEvent[]> {
    const result = await sql`
      SELECT * FROM security_events 
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result as SecurityEvent[]
  }

  static async getEventsByType(eventType: string, limit = 50): Promise<SecurityEvent[]> {
    const result = await sql`
      SELECT * FROM security_events 
      WHERE event_type = ${eventType}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result as SecurityEvent[]
  }

  static async getEventsBySeverity(severity: string, limit = 50): Promise<SecurityEvent[]> {
    const result = await sql`
      SELECT * FROM security_events 
      WHERE severity = ${severity}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result as SecurityEvent[]
  }
}

import { sql } from "../connection"

export interface Session {
  id: string
  user_id: string
  session_token: string
  ip_address: string | null
  user_agent: string | null
  expires_at: Date
  created_at: Date
}

export class SessionModel {
  static async create(sessionData: {
    user_id: string
    session_token: string
    ip_address?: string
    user_agent?: string
    expires_at: Date
  }): Promise<Session> {
    const result = await sql`
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (${sessionData.user_id}, ${sessionData.session_token}, ${sessionData.ip_address || null}, ${sessionData.user_agent || null}, ${sessionData.expires_at})
      RETURNING *
    `
    return result[0] as Session
  }

  static async findByToken(token: string): Promise<Session | null> {
    const result = await sql`
      SELECT * FROM user_sessions 
      WHERE session_token = ${token} AND expires_at > CURRENT_TIMESTAMP
    `
    return (result[0] as Session) || null
  }

  static async deleteByToken(token: string): Promise<void> {
    await sql`
      DELETE FROM user_sessions WHERE session_token = ${token}
    `
  }

  static async deleteExpiredSessions(): Promise<void> {
    await sql`
      DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP
    `
  }

  static async deleteAllUserSessions(userId: string): Promise<void> {
    await sql`
      DELETE FROM user_sessions WHERE user_id = ${userId}
    `
  }
}

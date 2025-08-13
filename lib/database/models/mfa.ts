import { sql } from "../connection"

export interface UserMFA {
  id: string
  user_id: string
  secret: string
  is_enabled: boolean
  backup_codes: string[]
  last_used: Date | null
  created_at: Date
}

export class MFAModel {
  static async findByUserId(userId: string): Promise<UserMFA | null> {
    const result = await sql`
      SELECT * FROM user_mfa WHERE user_id = ${userId}
    `
    return (result[0] as UserMFA) || null
  }

  static async create(mfaData: {
    user_id: string
    secret: string
    backup_codes: string[]
  }): Promise<UserMFA> {
    const result = await sql`
      INSERT INTO user_mfa (user_id, secret, backup_codes, is_enabled)
      VALUES (${mfaData.user_id}, ${mfaData.secret}, ${mfaData.backup_codes}, false)
      RETURNING *
    `
    return result[0] as UserMFA
  }

  static async enable(userId: string): Promise<void> {
    await sql`
      UPDATE user_mfa SET is_enabled = true WHERE user_id = ${userId}
    `
  }

  static async disable(userId: string): Promise<void> {
    await sql`
      UPDATE user_mfa SET is_enabled = false WHERE user_id = ${userId}
    `
  }

  static async updateLastUsed(userId: string): Promise<void> {
    await sql`
      UPDATE user_mfa SET last_used = CURRENT_TIMESTAMP WHERE user_id = ${userId}
    `
  }

  static async delete(userId: string): Promise<void> {
    await sql`
      DELETE FROM user_mfa WHERE user_id = ${userId}
    `
  }
}

import { sql } from "../connection"
import bcrypt from "bcryptjs"

export interface User {
  id: string
  email: string
  name: string
  password_hash: string
  is_active: boolean
  failed_login_attempts: number
  locked_until: Date | null
  last_login: Date | null
  created_at: Date
  updated_at: Date
}

export interface UserWithRoles extends User {
  roles: string[]
  attributes: Record<string, string>
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} AND is_active = true
    `
    return (result[0] as User) || null
  }

  static async findById(id: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id} AND is_active = true
    `
    return (result[0] as User) || null
  }

  static async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    const userResult = await sql`
      SELECT u.*, 
             COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ${id} AND u.is_active = true
      GROUP BY u.id
    `

    if (!userResult[0]) return null

    const attributesResult = await sql`
      SELECT attribute_name, attribute_value
      FROM user_attributes
      WHERE user_id = ${id}
    `

    const attributes: Record<string, string> = {}
    attributesResult.forEach((attr: any) => {
      attributes[attr.attribute_name] = attr.attribute_value
    })

    return {
      ...userResult[0],
      attributes,
    } as UserWithRoles
  }

  static async create(userData: {
    email: string
    name: string
    password: string
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 12)

    const result = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${userData.email}, ${userData.name}, ${passwordHash})
      RETURNING *
    `

    return result[0] as User
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash)
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await sql`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0
      WHERE id = ${userId}
    `
  }

  static async incrementFailedAttempts(userId: string): Promise<void> {
    await sql`
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
            ELSE locked_until
          END
      WHERE id = ${userId}
    `
  }

  static async isAccountLocked(user: User): Promise<boolean> {
    if (!user.locked_until) return false
    return new Date() < new Date(user.locked_until)
  }

  static async unlockAccount(userId: string): Promise<void> {
    await sql`
      UPDATE users 
      SET locked_until = NULL, failed_login_attempts = 0
      WHERE id = ${userId}
    `
  }

  static async getAllUsers(): Promise<UserWithRoles[]> {
    const result = await sql`
      SELECT u.*, 
             COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.is_active = true
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `

    return result.map((user) => ({
      ...user,
      attributes: {},
    })) as UserWithRoles[]
  }
}

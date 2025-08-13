import { sql } from "../connection"

export interface Certificate {
  id: string
  domain: string
  port: number
  certificate_info: {
    subject: string
    issuer: string
    validFrom: string
    validTo: string
    fingerprint: string
    serialNumber: string
    algorithm: string
    keySize: number
    isWildcard: boolean
    subjectAltNames: string[]
  }
  expires_at: Date
  is_valid: boolean
  security_score: number
  last_checked: Date
  created_at: Date
}

export class CertificateModel {
  static async create(certData: {
    domain: string
    port: number
    certificate_info: any
    expires_at: Date
    is_valid: boolean
    security_score: number
  }): Promise<Certificate> {
    const result = await sql`
      INSERT INTO certificate_monitors (domain, port, certificate_info, expires_at, is_valid, security_score)
      VALUES (${certData.domain}, ${certData.port}, ${JSON.stringify(certData.certificate_info)}, ${certData.expires_at}, ${certData.is_valid}, ${certData.security_score})
      RETURNING *
    `
    return result[0] as Certificate
  }

  static async findByDomain(domain: string, port = 443): Promise<Certificate | null> {
    const result = await sql`
      SELECT * FROM certificate_monitors 
      WHERE domain = ${domain} AND port = ${port}
      ORDER BY last_checked DESC
      LIMIT 1
    `
    return (result[0] as Certificate) || null
  }

  static async update(
    id: string,
    updateData: {
      certificate_info?: any
      expires_at?: Date
      is_valid?: boolean
      security_score?: number
    },
  ): Promise<void> {
    const updates: string[] = []
    const values: any[] = []

    if (updateData.certificate_info) {
      updates.push(`certificate_info = $${values.length + 1}`)
      values.push(JSON.stringify(updateData.certificate_info))
    }
    if (updateData.expires_at) {
      updates.push(`expires_at = $${values.length + 1}`)
      values.push(updateData.expires_at)
    }
    if (updateData.is_valid !== undefined) {
      updates.push(`is_valid = $${values.length + 1}`)
      values.push(updateData.is_valid)
    }
    if (updateData.security_score !== undefined) {
      updates.push(`security_score = $${values.length + 1}`)
      values.push(updateData.security_score)
    }

    updates.push(`last_checked = CURRENT_TIMESTAMP`)
    values.push(id)

    if (updates.length > 0) {
      const query = `UPDATE certificate_monitors SET ${updates.join(", ")} WHERE id = $${values.length}`
      await sql(query, values)
    }
  }

  static async getExpiringCertificates(days = 30): Promise<Certificate[]> {
    const result = await sql`
      SELECT * FROM certificate_monitors 
      WHERE expires_at <= CURRENT_TIMESTAMP + INTERVAL '${days} days'
      AND is_valid = true
      ORDER BY expires_at ASC
    `
    return result as Certificate[]
  }

  static async getAllCertificates(): Promise<Certificate[]> {
    const result = await sql`
      SELECT * FROM certificate_monitors 
      ORDER BY last_checked DESC
    `
    return result as Certificate[]
  }

  static async delete(id: string): Promise<void> {
    await sql`
      DELETE FROM certificate_monitors WHERE id = ${id}
    `
  }
}
